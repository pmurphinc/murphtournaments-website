import { and, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { publicProcedure, router } from "./_core/trpc";
import { assertDiscordTournamentStaff } from "./discordTournamentRoles";
import { managedTeamMembers, managedTeams, teams, tournamentGameAssignments, tournamentGames, tournaments, tournamentTeamSubmissions, users } from "../drizzle/schema";
import {
  activeTournamentGameStatuses,
  clampCanvasPosition,
  gameCapacity,
  getActiveAssignedTeamIds,
  tournamentGameStatuses,
  assertGameIsMutable,
  validateAssignmentPlan,
  validateMovePlan,
  validateReopenPlan,
  type ControlAssignment,
  type ControlGame,
  type ControlTeam,
  type TournamentGameType,
} from "./tournamentControlRules";
import { shouldCreateTournamentTeamForApproval } from "./tournamentTeamSubmissions";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type QueryExecutor = Pick<Database, "select" | "insert" | "update" | "delete" | "execute">;
type ControlGameConnection = {
  id: number;
  tournamentId: number;
  sourceGameId: number;
  targetGameId: number;
};
type AssignmentResultRow = {
  id: number;
  gameId: number;
  teamId: number;
  slotIndex: number;
  resultPlacement: number | null;
};

type AdvancementGame = {
  id: number;
  tournamentId: number;
  gameType: TournamentGameType;
  displayLabel: string;
};

const idSchema = z.number().int().positive();
const gameIdSchema = z.object({ gameId: idSchema });
const tournamentIdSchema = z.object({ tournamentId: idSchema });
const positionSchema = z.object({ x: z.number().int().min(-10000).max(10000), y: z.number().int().min(-10000).max(10000) });
const labelSchema = z.string().trim().min(1).max(80);
const teamNameSchema = z.string().trim().min(2).max(80);
const frpSchema = z.number().int().min(0).max(9999).default(0);
const lobbyCodeSchema = z.string().trim().min(1).max(64).nullable();
const adminNoteSchema = z.string().trim().max(1000).nullable().optional();
const resultPlacementSchema = z.number().int().min(1).max(4).nullable();
const createTournamentSchema = z.object({
  name: z.string().trim().min(2).max(255),
  eventStatus: z.enum(["not-live", "live", "complete"]).default("not-live"),
  currentCycle: z.enum(["1", "2", "3"]).default("1"),
  currentStage: z.enum(["check-in", "cashout", "final-round", "finished"]).default("check-in"),
  currentMatch: z.string().trim().max(255).optional(),
  eventNote: z.string().trim().max(2000).nullable().optional(),
});

function readRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    const [first] = result;
    if (Array.isArray(first)) return first as T[];
    return result as T[];
  }

  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as T[];
  }

  return [];
}

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
  const [teamRows, gameRows, assignmentRows, connectionResult] = await Promise.all([
    db.select().from(teams).where(eq(teams.tournamentId, tournamentId)),
    db.select().from(tournamentGames).where(eq(tournamentGames.tournamentId, tournamentId)),
    db.select({
      id: tournamentGameAssignments.id,
      gameId: tournamentGameAssignments.gameId,
      teamId: tournamentGameAssignments.teamId,
      slotIndex: tournamentGameAssignments.slotIndex,
      resultPlacement: sql<number | null>`resultPlacement`,
    })
      .from(tournamentGameAssignments)
      .innerJoin(tournamentGames, eq(tournamentGameAssignments.gameId, tournamentGames.id))
      .where(eq(tournamentGames.tournamentId, tournamentId)),
    db.execute(sql`SELECT id, tournamentId, sourceGameId, targetGameId FROM tournament_game_connections WHERE tournamentId = ${tournamentId}`),
  ]);
  return {
    tournament,
    teams: teamRows,
    games: gameRows,
    assignments: assignmentRows,
    connections: readRows<ControlGameConnection>(connectionResult),
  };
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

async function listTournamentRows(db: QueryExecutor) {
  return db.select().from(tournaments);
}

async function assertUniqueTeamName(db: QueryExecutor, tournamentId: number, name: string) {
  const tournamentTeams = await db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
  if (tournamentTeams.some(team => team.name.trim().toLowerCase() === name.trim().toLowerCase())) {
    throw new TRPCError({ code: "CONFLICT", message: "A team with that name already exists in this tournament" });
  }
}

async function assertConnectionGames(db: QueryExecutor, tournamentId: number, sourceGameId: number, targetGameId: number) {
  if (sourceGameId === targetGameId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A lobby cannot connect to itself" });
  }

  const [sourceGame, targetGame] = await Promise.all([
    getGameOrThrow(db, sourceGameId),
    getGameOrThrow(db, targetGameId),
  ]);

  if (sourceGame.tournamentId !== tournamentId || targetGame.tournamentId !== tournamentId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Both lobbies must belong to this tournament" });
  }
}

async function connectGames(tournamentId: number, sourceGameId: number, targetGameId: number) {
  const db = await requireDb();
  await assertConnectionGames(db, tournamentId, sourceGameId, targetGameId);
  await db.execute(sql`
    INSERT INTO tournament_game_connections (tournamentId, sourceGameId, targetGameId)
    VALUES (${tournamentId}, ${sourceGameId}, ${targetGameId})
    ON DUPLICATE KEY UPDATE updatedAt = CURRENT_TIMESTAMP
  `);
  return fetchTournamentControlData(tournamentId);
}

async function deleteGameConnection(connectionId: number) {
  const db = await requireDb();
  const connectionRows = readRows<ControlGameConnection>(
    await db.execute(sql`SELECT id, tournamentId, sourceGameId, targetGameId FROM tournament_game_connections WHERE id = ${connectionId} LIMIT 1`)
  );
  const [connection] = connectionRows;
  if (!connection) throw new TRPCError({ code: "NOT_FOUND", message: "Lobby connection not found" });
  await db.execute(sql`DELETE FROM tournament_game_connections WHERE id = ${connectionId}`);
  return fetchTournamentControlData(connection.tournamentId);
}

function getAdvancingPlacements(gameType: TournamentGameType) {
  return gameType === "cashout" ? [1, 2] : [1];
}

function getPlacementLabel(placements: number[]) {
  return placements.map(formatPlacementForMessage).join(" and ");
}

function formatPlacementForMessage(value: number) {
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
}

async function getAssignmentsForGame(db: QueryExecutor, gameId: number) {
  return db.select({
    id: tournamentGameAssignments.id,
    gameId: tournamentGameAssignments.gameId,
    teamId: tournamentGameAssignments.teamId,
    slotIndex: tournamentGameAssignments.slotIndex,
    resultPlacement: sql<number | null>`resultPlacement`,
  }).from(tournamentGameAssignments).where(eq(tournamentGameAssignments.gameId, gameId)) as Promise<AssignmentResultRow[]>;
}

async function advanceCompletedGameQualifiers(db: QueryExecutor, game: AdvancementGame) {
  const outgoingConnections = readRows<ControlGameConnection>(
    await db.execute(sql`SELECT id, tournamentId, sourceGameId, targetGameId FROM tournament_game_connections WHERE sourceGameId = ${game.id}`)
  );

  if (outgoingConnections.length === 0) return;

  const placementsToAdvance = getAdvancingPlacements(game.gameType);
  const sourceAssignments = await getAssignmentsForGame(db, game.id);
  const qualifiers = placementsToAdvance.map(placement => {
    const assignment = sourceAssignments.find(row => row.resultPlacement === placement);
    if (!assignment) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${game.displayLabel} must have ${getPlacementLabel(placementsToAdvance)} set before it can feed linked lobbies.`,
      });
    }
    return assignment;
  });

  for (const connection of outgoingConnections) {
    const targetGame = await getGameOrThrow(db, connection.targetGameId);
    if (targetGame.tournamentId !== game.tournamentId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Linked lobby belongs to a different tournament" });
    }
    if (targetGame.status === "complete") {
      throw new TRPCError({ code: "CONFLICT", message: `${targetGame.displayLabel} is already complete and cannot receive advancing teams.` });
    }

    for (const qualifier of qualifiers) {
      const targetAssignments = await getAssignmentsForGame(db, targetGame.id);
      if (targetAssignments.some(assignment => assignment.teamId === qualifier.teamId)) continue;

      const capacity = gameCapacity[targetGame.gameType];
      const usedSlots = new Set(targetAssignments.map(assignment => assignment.slotIndex));
      const nextSlot = Array.from({ length: capacity }, (_, index) => index + 1).find(slot => !usedSlots.has(slot));

      if (!nextSlot) {
        throw new TRPCError({ code: "CONFLICT", message: `${targetGame.displayLabel} has no open slots for advancing teams.` });
      }

      const context = await fetchGameContext(db, targetGame.tournamentId);
      validateAssignmentPlan({
        ...context,
        targetGameId: targetGame.id,
        teamId: qualifier.teamId,
        slotIndex: nextSlot,
      });
      await db.insert(tournamentGameAssignments).values({ gameId: targetGame.id, teamId: qualifier.teamId, slotIndex: nextSlot });
    }
  }
}

async function listSubmissionRows(db: QueryExecutor, tournamentId?: number) {
  const base = db.select({
    submission: tournamentTeamSubmissions,
    tournament: tournaments,
    managedTeam: managedTeams,
    captain: users,
  })
    .from(tournamentTeamSubmissions)
    .innerJoin(tournaments, eq(tournamentTeamSubmissions.tournamentId, tournaments.id))
    .innerJoin(managedTeams, eq(tournamentTeamSubmissions.managedTeamId, managedTeams.id))
    .innerJoin(users, eq(managedTeams.captainUserId, users.id));
  const rows = tournamentId ? await base.where(eq(tournamentTeamSubmissions.tournamentId, tournamentId)) : await base;
  const teamIds = rows.map(row => row.managedTeam.id);
  const roster = teamIds.length ? await db.select({ member: managedTeamMembers, user: users })
    .from(managedTeamMembers)
    .innerJoin(users, eq(managedTeamMembers.userId, users.id))
    .where(inArray(managedTeamMembers.teamId, teamIds)) : [];
  return rows.map(row => ({
    ...row.submission,
    tournament: row.tournament,
    managedTeam: row.managedTeam,
    captain: row.captain,
    roster: roster.filter(member => member.member.teamId === row.managedTeam.id).map(member => ({ ...member.member, user: member.user })),
  }));
}

async function approveSubmission(submissionId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [row] = await tx.select({ submission: tournamentTeamSubmissions, managedTeam: managedTeams })
      .from(tournamentTeamSubmissions)
      .innerJoin(managedTeams, eq(tournamentTeamSubmissions.managedTeamId, managedTeams.id))
      .where(eq(tournamentTeamSubmissions.id, submissionId))
      .limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Team submission not found" });
    const existing = await tx.select().from(teams).where(and(eq(teams.tournamentId, row.submission.tournamentId), eq(teams.managedTeamId, row.submission.managedTeamId))).limit(1);
    if (shouldCreateTournamentTeamForApproval({ status: row.submission.status, existingTournamentTeamCount: existing.length })) {
      await assertUniqueTeamName(tx, row.submission.tournamentId, row.managedTeam.name);
      await tx.insert(teams).values({ tournamentId: row.submission.tournamentId, managedTeamId: row.submission.managedTeamId, name: row.managedTeam.name, frp: 0 });
    }
    await tx.update(tournamentTeamSubmissions).set({ status: "approved", adminNote: null }).where(eq(tournamentTeamSubmissions.id, submissionId));
    return fetchTournamentRows(tx, row.submission.tournamentId);
  });
}

async function rejectSubmission(submissionId: number, adminNote: string | null | undefined) {
  const db = await requireDb();
  const [submission] = await db.select().from(tournamentTeamSubmissions).where(eq(tournamentTeamSubmissions.id, submissionId)).limit(1);
  if (!submission) throw new TRPCError({ code: "NOT_FOUND", message: "Team submission not found" });
  await db.update(tournamentTeamSubmissions).set({ status: "rejected", adminNote: adminNote ?? null }).where(eq(tournamentTeamSubmissions.id, submissionId));
  return listSubmissionRows(db, submission.tournamentId);
}

export async function assignTeamToGameSlot(gameId: number, teamId: number, slotIndex: number) {
  const db = await requireDb();
  const game = await getGameOrThrow(db, gameId);
  const context = await fetchGameContext(db, game.tournamentId);
  validateAssignmentPlan({ ...context, targetGameId: gameId, teamId, slotIndex });
  await db.insert(tournamentGameAssignments).values({ gameId, teamId, slotIndex });
  return fetchTournamentControlData(game.tournamentId);
}

async function setAssignmentResultPlacement(assignmentId: number, resultPlacement: number | null) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [row] = await tx.select({ assignment: tournamentGameAssignments, game: tournamentGames })
      .from(tournamentGameAssignments)
      .innerJoin(tournamentGames, eq(tournamentGameAssignments.gameId, tournamentGames.id))
      .where(eq(tournamentGameAssignments.id, assignmentId))
      .limit(1);

    if (!row) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Team assignment not found" });
    }

    const capacity = gameCapacity[row.game.gameType];
    if (resultPlacement !== null && resultPlacement > capacity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${row.game.gameType === "cashout" ? "Cashout lobbies" : "Final Round matches"} only support placements 1-${capacity}`,
      });
    }

    if (resultPlacement !== null) {
      await tx.execute(sql`UPDATE tournament_game_assignments SET resultPlacement = NULL WHERE gameId = ${row.assignment.gameId} AND resultPlacement = ${resultPlacement} AND id <> ${assignmentId}`);
    }

    await tx.execute(sql`UPDATE tournament_game_assignments SET resultPlacement = ${resultPlacement} WHERE id = ${assignmentId}`);
    return fetchTournamentRows(tx, row.game.tournamentId);
  });
}

export const discordTournamentStaffProcedure = publicProcedure.use(async ({ ctx, next }) => {
  await assertDiscordTournamentStaff(ctx);
  return next({ ctx: { ...ctx, user: ctx.user! } });
});

export const tournamentControlRouter = router({
  listTournaments: discordTournamentStaffProcedure.query(async () => {
    const db = await requireDb();
    return listTournamentRows(db);
  }),
  setTournamentRegistrationOpen: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ registrationOpen: z.boolean() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await fetchTournamentRows(db, input.tournamentId);
    await db.update(tournaments).set({ registrationOpen: input.registrationOpen ? 1 : 0 }).where(eq(tournaments.id, input.tournamentId));
    return listTournamentRows(db);
  }),
  listTeamSubmissions: discordTournamentStaffProcedure.input(z.object({ tournamentId: idSchema.optional() }).optional()).query(async ({ input }) => {
    const db = await requireDb();
    return listSubmissionRows(db, input?.tournamentId);
  }),
  approveTeamSubmission: discordTournamentStaffProcedure.input(z.object({ submissionId: idSchema })).mutation(({ input }) => approveSubmission(input.submissionId)),
  rejectTeamSubmission: discordTournamentStaffProcedure.input(z.object({ submissionId: idSchema, adminNote: adminNoteSchema })).mutation(({ input }) => rejectSubmission(input.submissionId, input.adminNote)),
  createTournament: discordTournamentStaffProcedure.input(createTournamentSchema).mutation(async ({ input }) => {
    const db = await requireDb();
    const insertResult = await db.insert(tournaments).values({
      name: input.name,
      eventStatus: input.eventStatus,
      currentCycle: input.currentCycle,
      currentStage: input.currentStage,
      currentMatch: input.currentMatch,
      eventNote: input.eventNote ?? null,
    });
    const rows = await listTournamentRows(db);
    const insertId = Number((insertResult as { insertId?: unknown } | undefined)?.insertId ?? 0);
    const createdTournament = rows.find(tournament => tournament.id === insertId) ?? rows.filter(tournament => tournament.name === input.name).sort((a, b) => b.id - a.id)[0] ?? rows.sort((a, b) => b.id - a.id)[0];
    if (!createdTournament) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Tournament creation failed" });
    return { createdTournament, tournaments: rows };
  }),
  get: discordTournamentStaffProcedure.input(tournamentIdSchema).query(({ input }) => fetchTournamentControlData(input.tournamentId)),
  createTeam: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ name: teamNameSchema, frp: frpSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    await fetchTournamentRows(db, input.tournamentId);
    await assertUniqueTeamName(db, input.tournamentId, input.name);
    await db.insert(teams).values({ tournamentId: input.tournamentId, name: input.name, frp: input.frp });
    return fetchTournamentControlData(input.tournamentId);
  }),
  createCashoutLobby: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ position: positionSchema })).mutation(({ input }) => createGame(input.tournamentId, "cashout", input.position)),
  createFinalRoundMatch: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ position: positionSchema })).mutation(({ input }) => createGame(input.tournamentId, "final_round", input.position)),
  renameGame: discordTournamentStaffProcedure.input(gameIdSchema.extend({ displayLabel: labelSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    assertGameIsMutable(game);
    await db.update(tournamentGames).set({ displayLabel: input.displayLabel }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  moveGame: discordTournamentStaffProcedure.input(gameIdSchema.extend({ position: positionSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    const safePosition = clampCanvasPosition(input.position);
    await db.update(tournamentGames).set({ canvasX: safePosition.x, canvasY: safePosition.y }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  connectGames: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ sourceGameId: idSchema, targetGameId: idSchema })).mutation(({ input }) => connectGames(input.tournamentId, input.sourceGameId, input.targetGameId)),
  deleteGameConnection: discordTournamentStaffProcedure.input(z.object({ connectionId: idSchema })).mutation(({ input }) => deleteGameConnection(input.connectionId)),
  updateStatus: discordTournamentStaffProcedure.input(gameIdSchema.extend({ status: z.enum(tournamentGameStatuses) })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);

    if (input.status === "complete") {
      return db.transaction(async tx => {
        const gameInTx = await getGameOrThrow(tx, input.gameId);
        await tx.update(tournamentGames).set({ status: input.status }).where(eq(tournamentGames.id, input.gameId));
        await advanceCompletedGameQualifiers(tx, gameInTx);
        return fetchTournamentRows(tx, gameInTx.tournamentId);
      });
    }

    if (activeTournamentGameStatuses.includes(input.status as (typeof activeTournamentGameStatuses)[number])) {
      const context = await fetchGameContext(db, game.tournamentId);
      if (game.status === "complete") {
        validateReopenPlan({ ...context, gameId: input.gameId });
      } else {
        const assignedRows = context.assignments.filter(assignment => assignment.gameId === input.gameId);
        for (const assignment of assignedRows) validateAssignmentPlan({ ...context, targetGameId: input.gameId, teamId: assignment.teamId, slotIndex: assignment.slotIndex });
      }
    }
    await db.update(tournamentGames).set({ status: input.status }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  setLobbyCode: discordTournamentStaffProcedure.input(gameIdSchema.extend({ lobbyCode: lobbyCodeSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    assertGameIsMutable(game);
    await db.update(tournamentGames).set({ privateLobbyCode: input.lobbyCode }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  setAssignmentResultPlacement: discordTournamentStaffProcedure.input(z.object({ assignmentId: idSchema, resultPlacement: resultPlacementSchema })).mutation(({ input }) => setAssignmentResultPlacement(input.assignmentId, input.resultPlacement)),
  assignTeam: discordTournamentStaffProcedure.input(gameIdSchema.extend({ teamId: idSchema, slotIndex: z.number().int().positive() })).mutation(({ input }) => assignTeamToGameSlot(input.gameId, input.teamId, input.slotIndex)),
  moveTeam: discordTournamentStaffProcedure.input(gameIdSchema.extend({ teamId: idSchema, toGameId: idSchema, slotIndex: z.number().int().positive() })).mutation(async ({ input }) => {
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
  removeTeam: discordTournamentStaffProcedure.input(gameIdSchema.extend({ teamId: idSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    if (game.status === "complete") throw new TRPCError({ code: "CONFLICT", message: "Completed games are historical. Mark the game active before changing assignments." });
    await db.delete(tournamentGameAssignments).where(and(eq(tournamentGameAssignments.gameId, input.gameId), eq(tournamentGameAssignments.teamId, input.teamId)));
    return fetchTournamentControlData(game.tournamentId);
  }),
  removeAssignedTeams: discordTournamentStaffProcedure.input(gameIdSchema).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    if (game.status === "complete") throw new TRPCError({ code: "CONFLICT", message: "Completed games are historical. Mark the game active before changing assignments." });
    await db.delete(tournamentGameAssignments).where(eq(tournamentGameAssignments.gameId, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  deleteGame: discordTournamentStaffProcedure.input(gameIdSchema).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    assertGameIsMutable(game);
    await db.delete(tournamentGames).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
});

export { getActiveAssignedTeamIds, gameCapacity };
