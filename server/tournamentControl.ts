import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { adminProcedure, router } from "./_core/trpc";
import { teams, tournamentGameAssignments, tournamentGames, tournaments } from "../drizzle/schema";
import {
  activeTournamentGameStatuses,
  clampCanvasPosition,
  gameCapacity,
  getActiveAssignedTeamIds,
  tournamentGameStatuses,
  validateAssignmentPlan,
  validateMovePlan,
  type ControlAssignment,
  type ControlGame,
  type ControlTeam,
  type TournamentGameType,
} from "./tournamentControlRules";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type QueryExecutor = Pick<Database, "select" | "insert" | "update" | "delete">;

const idSchema = z.number().int().positive();
const gameIdSchema = z.object({ gameId: idSchema });
const tournamentIdSchema = z.object({ tournamentId: idSchema });
const positionSchema = z.object({ x: z.number().int().min(-10000).max(10000), y: z.number().int().min(-10000).max(10000) });
const labelSchema = z.string().trim().min(1).max(80);
const teamNameSchema = z.string().trim().min(2).max(80);
const frpSchema = z.number().int().min(0).max(9999).default(0);
const lobbyCodeSchema = z.string().trim().min(1).max(64).nullable();

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

async function getGameOrThrow(db: QueryExecutor, gameId: number) {
  const [game] = await db.select().from(tournamentGames).where(eq(tournamentGames.id, gameId)).limit(1);
  if (!game) throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  return game;
}

async function fetchTournamentRows(db: QueryExecutor, tournamentId: number) {
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
  const [teamRows, gameRows, assignmentRows] = await Promise.all([
    db.select().from(teams).where(eq(teams.tournamentId, tournamentId)),
    db.select().from(tournamentGames).where(eq(tournamentGames.tournamentId, tournamentId)),
    db.select({ id: tournamentGameAssignments.id, gameId: tournamentGameAssignments.gameId, teamId: tournamentGameAssignments.teamId, slotIndex: tournamentGameAssignments.slotIndex })
      .from(tournamentGameAssignments)
      .innerJoin(tournamentGames, eq(tournamentGameAssignments.gameId, tournamentGames.id))
      .where(eq(tournamentGames.tournamentId, tournamentId)),
  ]);
  return { tournament, teams: teamRows, games: gameRows, assignments: assignmentRows };
}

export async function fetchTournamentControlData(tournamentId: number) {
  const db = await requireDb();
  return fetchTournamentRows(db, tournamentId);
}

async function fetchGameContext(db: QueryExecutor, tournamentId: number) {
  const data = await fetchTournamentRows(db, tournamentId);
  return {
    ...data,
    teams: data.teams as ControlTeam[],
    games: data.games as ControlGame[],
    assignments: data.assignments as ControlAssignment[],
  };
}

async function createGame(tournamentId: number, gameType: TournamentGameType, position: { x: number; y: number }) {
  const db = await requireDb();
  const data = await fetchTournamentControlData(tournamentId);
  const count = data.games.filter(g => g.gameType === gameType).length + 1;
  const safePosition = clampCanvasPosition(position);
  await db.insert(tournamentGames).values({ tournamentId, gameType, displayLabel: gameType === "cashout" ? `Cashout Lobby ${count}` : `Final Round ${count}`, canvasX: safePosition.x, canvasY: safePosition.y });
  return fetchTournamentControlData(tournamentId);
}

async function assertUniqueTeamName(db: QueryExecutor, tournamentId: number, name: string) {
  const tournamentTeams = await db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
  if (tournamentTeams.some(team => team.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw new TRPCError({ code: "CONFLICT", message: "A team with that name already exists in this tournament" });
  }
}

export async function assignTeamToGameSlot(gameId: number, teamId: number, slotIndex: number) {
  const db = await requireDb();
  const game = await getGameOrThrow(db, gameId);
  const context = await fetchGameContext(db, game.tournamentId);
  validateAssignmentPlan({ ...context, targetGameId: gameId, teamId, slotIndex });
  await db.insert(tournamentGameAssignments).values({ gameId, teamId, slotIndex });
  return fetchTournamentControlData(game.tournamentId);
}

export const tournamentControlRouter = router({
  listTournaments: adminProcedure.query(async () => {
    const db = await requireDb();
    return db.select().from(tournaments);
  }),
  get: adminProcedure.input(tournamentIdSchema).query(({ input }) => fetchTournamentControlData(input.tournamentId)),
  createTeam: adminProcedure.input(tournamentIdSchema.extend({ name: teamNameSchema, frp: frpSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    await fetchTournamentRows(db, input.tournamentId);
    await assertUniqueTeamName(db, input.tournamentId, input.name);
    await db.insert(teams).values({ tournamentId: input.tournamentId, name: input.name, frp: input.frp });
    return fetchTournamentControlData(input.tournamentId);
  }),
  createCashoutLobby: adminProcedure.input(tournamentIdSchema.extend({ position: positionSchema })).mutation(({ input }) => createGame(input.tournamentId, "cashout", input.position)),
  createFinalRoundMatch: adminProcedure.input(tournamentIdSchema.extend({ position: positionSchema })).mutation(({ input }) => createGame(input.tournamentId, "final_round", input.position)),
  renameGame: adminProcedure.input(gameIdSchema.extend({ displayLabel: labelSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    await db.update(tournamentGames).set({ displayLabel: input.displayLabel }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  moveGame: adminProcedure.input(gameIdSchema.extend({ position: positionSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    const safePosition = clampCanvasPosition(input.position);
    await db.update(tournamentGames).set({ canvasX: safePosition.x, canvasY: safePosition.y }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  updateStatus: adminProcedure.input(gameIdSchema.extend({ status: z.enum(tournamentGameStatuses) })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    if (activeTournamentGameStatuses.includes(input.status as (typeof activeTournamentGameStatuses)[number])) {
      const context = await fetchGameContext(db, game.tournamentId);
      const assignedRows = context.assignments.filter(assignment => assignment.gameId === input.gameId);
      for (const assignment of assignedRows) validateAssignmentPlan({ ...context, targetGameId: input.gameId, teamId: assignment.teamId, slotIndex: assignment.slotIndex });
    }
    await db.update(tournamentGames).set({ status: input.status }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  setLobbyCode: adminProcedure.input(gameIdSchema.extend({ lobbyCode: lobbyCodeSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    await db.update(tournamentGames).set({ privateLobbyCode: input.lobbyCode }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  assignTeam: adminProcedure.input(gameIdSchema.extend({ teamId: idSchema, slotIndex: z.number().int().positive() })).mutation(({ input }) => assignTeamToGameSlot(input.gameId, input.teamId, input.slotIndex)),
  moveTeam: adminProcedure.input(gameIdSchema.extend({ teamId: idSchema, toGameId: idSchema, slotIndex: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const targetGame = await getGameOrThrow(db, input.toGameId);
    await db.transaction(async tx => {
      const context = await fetchGameContext(tx, targetGame.tournamentId);
      validateMovePlan({ ...context, sourceGameId: input.gameId, targetGameId: input.toGameId, teamId: input.teamId, slotIndex: input.slotIndex });
      await tx.delete(tournamentGameAssignments).where(and(eq(tournamentGameAssignments.gameId, input.gameId), eq(tournamentGameAssignments.teamId, input.teamId)));
      await tx.insert(tournamentGameAssignments).values({ gameId: input.toGameId, teamId: input.teamId, slotIndex: input.slotIndex });
    });
    return fetchTournamentControlData(targetGame.tournamentId);
  }),
  removeTeam: adminProcedure.input(gameIdSchema.extend({ teamId: idSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    if (game.status === "complete") throw new TRPCError({ code: "CONFLICT", message: "Completed games are historical. Mark the game active before changing assignments." });
    await db.delete(tournamentGameAssignments).where(and(eq(tournamentGameAssignments.gameId, input.gameId), eq(tournamentGameAssignments.teamId, input.teamId)));
    return fetchTournamentControlData(game.tournamentId);
  }),
  removeAssignedTeams: adminProcedure.input(gameIdSchema).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    if (game.status === "complete") throw new TRPCError({ code: "CONFLICT", message: "Completed games are historical. Mark the game active before changing assignments." });
    await db.delete(tournamentGameAssignments).where(eq(tournamentGameAssignments.gameId, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  deleteGame: adminProcedure.input(gameIdSchema).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    await db.delete(tournamentGames).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
});

export { getActiveAssignedTeamIds, gameCapacity };
