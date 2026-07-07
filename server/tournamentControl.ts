import { and, eq, inArray, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { adminProcedure, router } from "./_core/trpc";
import {
  teams,
  tournamentGameAssignments,
  tournamentGames,
  tournaments,
} from "../drizzle/schema";

export const gameTypes = ["cashout", "final_round"] as const;
export const gameStatuses = ["draft", "ready", "live", "complete"] as const;
export type TournamentGameType = (typeof gameTypes)[number];
export type TournamentGameStatus = (typeof gameStatuses)[number];

const activeStatuses: TournamentGameStatus[] = ["draft", "ready", "live"];
const gameCapacity: Record<TournamentGameType, number> = {
  cashout: 4,
  final_round: 2,
};
const idSchema = z.number().int().positive();
const gameIdSchema = z.object({ gameId: idSchema });
const tournamentIdSchema = z.object({ tournamentId: idSchema });
const positionSchema = z.object({
  x: z.number().int().min(-10000).max(10000),
  y: z.number().int().min(-10000).max(10000),
});
const labelSchema = z.string().trim().min(1).max(80);
const lobbyCodeSchema = z.string().trim().min(1).max(64).nullable();

async function requireDb() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

async function getGameOrThrow(gameId: number) {
  const db = await requireDb();
  const [game] = await db
    .select()
    .from(tournamentGames)
    .where(eq(tournamentGames.id, gameId))
    .limit(1);
  if (!game)
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  return game;
}

function assertSlot(type: TournamentGameType, slot: number) {
  if (slot < 1 || slot > gameCapacity[type])
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `${type === "cashout" ? "Cashout lobbies" : "Final Round matches"} support slots 1-${gameCapacity[type]}`,
    });
}

async function assertTeamInTournament(teamId: number, tournamentId: number) {
  const db = await requireDb();
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.id, teamId), eq(teams.tournamentId, tournamentId)))
    .limit(1);
  if (!team)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Team does not belong to this tournament",
    });
}

async function assertNoDuplicateActiveAssignment(
  teamId: number,
  tournamentId: number,
  excludeGameId?: number
) {
  const db = await requireDb();
  const rows = await db
    .select({ gameId: tournamentGameAssignments.gameId })
    .from(tournamentGameAssignments)
    .innerJoin(
      tournamentGames,
      eq(tournamentGameAssignments.gameId, tournamentGames.id)
    )
    .where(
      and(
        eq(tournamentGameAssignments.teamId, teamId),
        eq(tournamentGames.tournamentId, tournamentId),
        inArray(tournamentGames.status, activeStatuses),
        excludeGameId ? ne(tournamentGames.id, excludeGameId) : undefined
      )
    );
  if (rows.length > 0)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Team is already assigned to another active game in this tournament",
    });
}

export async function fetchTournamentControlData(tournamentId: number) {
  const db = await requireDb();
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament)
    throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
  const [teamRows, gameRows, assignmentRows] = await Promise.all([
    db.select().from(teams).where(eq(teams.tournamentId, tournamentId)),
    db
      .select()
      .from(tournamentGames)
      .where(eq(tournamentGames.tournamentId, tournamentId)),
    db
      .select({
        id: tournamentGameAssignments.id,
        gameId: tournamentGameAssignments.gameId,
        teamId: tournamentGameAssignments.teamId,
        slotIndex: tournamentGameAssignments.slotIndex,
      })
      .from(tournamentGameAssignments)
      .innerJoin(
        tournamentGames,
        eq(tournamentGameAssignments.gameId, tournamentGames.id)
      )
      .where(eq(tournamentGames.tournamentId, tournamentId)),
  ]);
  return {
    tournament,
    teams: teamRows,
    games: gameRows,
    assignments: assignmentRows,
  };
}

async function createGame(
  tournamentId: number,
  gameType: TournamentGameType,
  position: { x: number; y: number }
) {
  const db = await requireDb();
  const data = await fetchTournamentControlData(tournamentId);
  const count = data.games.filter(g => g.gameType === gameType).length + 1;
  await db
    .insert(tournamentGames)
    .values({
      tournamentId,
      gameType,
      displayLabel:
        gameType === "cashout"
          ? `Cashout Lobby ${count}`
          : `Final Round ${count}`,
      canvasX: position.x,
      canvasY: position.y,
    });
  return fetchTournamentControlData(tournamentId);
}

export async function assignTeamToGameSlot(
  gameId: number,
  teamId: number,
  slotIndex: number
) {
  const db = await requireDb();
  const game = await getGameOrThrow(gameId);
  assertSlot(game.gameType, slotIndex);
  await assertTeamInTournament(teamId, game.tournamentId);
  if (activeStatuses.includes(game.status))
    await assertNoDuplicateActiveAssignment(teamId, game.tournamentId, gameId);
  await db
    .delete(tournamentGameAssignments)
    .where(
      and(
        eq(tournamentGameAssignments.gameId, gameId),
        eq(tournamentGameAssignments.slotIndex, slotIndex)
      )
    );
  await db
    .delete(tournamentGameAssignments)
    .where(
      and(
        eq(tournamentGameAssignments.gameId, gameId),
        eq(tournamentGameAssignments.teamId, teamId)
      )
    );
  await db
    .insert(tournamentGameAssignments)
    .values({ gameId, teamId, slotIndex });
  return fetchTournamentControlData(game.tournamentId);
}

export const tournamentControlRouter = router({
  get: adminProcedure
    .input(tournamentIdSchema)
    .query(({ input }) => fetchTournamentControlData(input.tournamentId)),
  createCashoutLobby: adminProcedure
    .input(tournamentIdSchema.extend({ position: positionSchema }))
    .mutation(({ input }) =>
      createGame(input.tournamentId, "cashout", input.position)
    ),
  createFinalRoundMatch: adminProcedure
    .input(tournamentIdSchema.extend({ position: positionSchema }))
    .mutation(({ input }) =>
      createGame(input.tournamentId, "final_round", input.position)
    ),
  renameGame: adminProcedure
    .input(gameIdSchema.extend({ displayLabel: labelSchema }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const game = await getGameOrThrow(input.gameId);
      await db
        .update(tournamentGames)
        .set({ displayLabel: input.displayLabel })
        .where(eq(tournamentGames.id, input.gameId));
      return fetchTournamentControlData(game.tournamentId);
    }),
  moveGame: adminProcedure
    .input(gameIdSchema.extend({ position: positionSchema }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const game = await getGameOrThrow(input.gameId);
      await db
        .update(tournamentGames)
        .set({ canvasX: input.position.x, canvasY: input.position.y })
        .where(eq(tournamentGames.id, input.gameId));
      return fetchTournamentControlData(game.tournamentId);
    }),
  updateStatus: adminProcedure
    .input(gameIdSchema.extend({ status: z.enum(gameStatuses) }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const game = await getGameOrThrow(input.gameId);
      if (activeStatuses.includes(input.status)) {
        const assignments = await db
          .select()
          .from(tournamentGameAssignments)
          .where(eq(tournamentGameAssignments.gameId, input.gameId));
        for (const row of assignments)
          await assertNoDuplicateActiveAssignment(
            row.teamId,
            game.tournamentId,
            input.gameId
          );
      }
      await db
        .update(tournamentGames)
        .set({ status: input.status })
        .where(eq(tournamentGames.id, input.gameId));
      return fetchTournamentControlData(game.tournamentId);
    }),
  setLobbyCode: adminProcedure
    .input(gameIdSchema.extend({ lobbyCode: lobbyCodeSchema }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const game = await getGameOrThrow(input.gameId);
      await db
        .update(tournamentGames)
        .set({ privateLobbyCode: input.lobbyCode })
        .where(eq(tournamentGames.id, input.gameId));
      return fetchTournamentControlData(game.tournamentId);
    }),
  assignTeam: adminProcedure
    .input(
      gameIdSchema.extend({
        teamId: idSchema,
        slotIndex: z.number().int().positive(),
      })
    )
    .mutation(({ input }) =>
      assignTeamToGameSlot(input.gameId, input.teamId, input.slotIndex)
    ),
  moveTeam: adminProcedure
    .input(
      gameIdSchema.extend({
        teamId: idSchema,
        toGameId: idSchema,
        slotIndex: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const fromGame = await getGameOrThrow(input.gameId);
      await db
        .delete(tournamentGameAssignments)
        .where(
          and(
            eq(tournamentGameAssignments.gameId, input.gameId),
            eq(tournamentGameAssignments.teamId, input.teamId)
          )
        );
      const data = await assignTeamToGameSlot(
        input.toGameId,
        input.teamId,
        input.slotIndex
      );
      return data ?? fetchTournamentControlData(fromGame.tournamentId);
    }),
  removeTeam: adminProcedure
    .input(gameIdSchema.extend({ teamId: idSchema }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const game = await getGameOrThrow(input.gameId);
      await db
        .delete(tournamentGameAssignments)
        .where(
          and(
            eq(tournamentGameAssignments.gameId, input.gameId),
            eq(tournamentGameAssignments.teamId, input.teamId)
          )
        );
      return fetchTournamentControlData(game.tournamentId);
    }),
  removeAssignedTeams: adminProcedure
    .input(gameIdSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const game = await getGameOrThrow(input.gameId);
      await db
        .delete(tournamentGameAssignments)
        .where(eq(tournamentGameAssignments.gameId, input.gameId));
      return fetchTournamentControlData(game.tournamentId);
    }),
  deleteGame: adminProcedure.input(gameIdSchema).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(input.gameId);
    await db
      .delete(tournamentGames)
      .where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
});
