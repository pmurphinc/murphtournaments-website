import { and, eq, inArray, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDiscordUserId, assertDiscordTournamentStaff } from "./discordTournamentRoles";
import { managedTeamMembers, managedTeams, teams, tournamentControlTemplateConnections, tournamentControlTemplateGames, tournamentControlTemplates, tournamentGameAssignments, tournamentGames, tournaments, tournamentTeamClaimLinks, tournamentTeamSubmissions, tournamentViewerLinks, users } from "../drizzle/schema";
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
  resolveAssignmentSlot,
  type ControlAssignment,
  type ControlGame,
  type ControlTeam,
  type TournamentGameType,
} from "./tournamentControlRules";
import { THE_FINALS_MAPS, DEFAULT_COMPETITIVE_MAP_IDS, drawUniqueMaps } from "../shared/finalsMaps";
import { shouldCreateTournamentTeamForApproval } from "./tournamentTeamSubmissions";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type QueryExecutor = Pick<Database, "select" | "insert" | "update" | "delete" | "execute">;
const CLAIM_LINK_TTL_DAYS = 14;
function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
function createTokenPath(prefix: string, token: string) { return `${prefix}/${encodeURIComponent(token)}`; }
const DISCORD_API_BASE = "https://discord.com/api/v10";
export type ConnectionFlowType = "winner" | "loser";
const connectionFlowTypeSchema = z.enum(["winner", "loser"]);

type ControlGameConnection = {
  id: number;
  tournamentId: number;
  sourceGameId: number;
  targetGameId: number;
  flowType: ConnectionFlowType;
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
const seriesBestOfSchema = z.union([z.literal(1), z.literal(3), z.literal(5)]);
const templateVisibilitySchema = z.enum(["private", "public"]);
const tokenSchema = z.string().trim().min(16).max(256);
const adminNoteSchema = z.string().trim().max(1000).nullable().optional();
const resultPlacementSchema = z.number().int().min(1).max(4).nullable();
const validMapIds = new Set<string>(THE_FINALS_MAPS.map(map => map.id));
const mapIdSchema = z.string().trim().max(64).nullable().refine(value => value === null || validMapIds.has(value), "Unknown THE FINALS map id");

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function extractInsertId(result: unknown): number | null {
  if (Array.isArray(result)) {
    for (const item of result) {
      const insertId = extractInsertId(item);
      if (insertId !== null) return insertId;
    }
    return null;
  }

  if (!isRecord(result) || !("insertId" in result)) return null;
  const rawInsertId = result.insertId;
  const insertId = typeof rawInsertId === "bigint" ? Number(rawInsertId) : Number(rawInsertId);
  return Number.isSafeInteger(insertId) && insertId > 0 ? insertId : null;
}

function requireInsertId(result: unknown, message: string): number {
  const insertId = extractInsertId(result);
  if (insertId === null) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
  return insertId;
}

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
    db.select({
      id: teams.id,
      tournamentId: teams.tournamentId,
      managedTeamId: teams.managedTeamId,
      name: teams.name,
      frp: teams.frp,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
      captainUserId: managedTeams.captainUserId,
      captainDiscordOpenId: users.openId,
      captainDisplayName: sql<string | null>`COALESCE(${users.discordDisplayName}, ${users.discordUsername}, ${users.name})`,
    })
      .from(teams)
      .leftJoin(managedTeams, eq(teams.managedTeamId, managedTeams.id))
      .leftJoin(users, eq(managedTeams.captainUserId, users.id))
      .where(eq(teams.tournamentId, tournamentId)),
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
    db.execute(sql`SELECT id, tournamentId, sourceGameId, targetGameId, flowType FROM tournament_game_connections WHERE tournamentId = ${tournamentId}`),
  ]);
  return {
    tournament,
    discordConfigured: Boolean(process.env.DISCORD_BOT_TOKEN),
    teams: teamRows.map(team => ({
      ...team,
      captainDiscordId: getDiscordUserId({ openId: team.captainDiscordOpenId ?? undefined, loginMethod: team.captainDiscordOpenId ? "discord" : null }),
    })),
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
  return db.select({
    id: tournaments.id,
    name: tournaments.name,
    eventStatus: tournaments.eventStatus,
    currentCycle: tournaments.currentCycle,
    currentStage: tournaments.currentStage,
    currentMatch: tournaments.currentMatch,
    eventNote: tournaments.eventNote,
    registrationOpen: tournaments.registrationOpen,
    ownerUserId: tournaments.ownerUserId,
    createdAt: tournaments.createdAt,
    updatedAt: tournaments.updatedAt,
    owner: { id: users.id, name: users.name, discordDisplayName: users.discordDisplayName, discordUsername: users.discordUsername },
  }).from(tournaments).leftJoin(users, eq(tournaments.ownerUserId, users.id));
}

async function listOwnerCandidates(db: QueryExecutor) {
  return db.select({ id: users.id, name: users.name, discordDisplayName: users.discordDisplayName, discordUsername: users.discordUsername }).from(users).where(eq(users.loginMethod, "discord"));
}

async function updateTournamentName(tournamentId: number, name: string) {
  const db = await requireDb();
  await fetchTournamentRows(db, tournamentId);
  await db.update(tournaments).set({ name }).where(eq(tournaments.id, tournamentId));
  return listTournamentRows(db);
}

async function setTournamentOwner(tournamentId: number, ownerUserId: number | null) {
  const db = await requireDb();
  await fetchTournamentRows(db, tournamentId);
  if (ownerUserId !== null) {
    const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.id, ownerUserId)).limit(1);
    if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Owner user not found" });
  }
  await db.update(tournaments).set({ ownerUserId }).where(eq(tournaments.id, tournamentId));
  return listTournamentRows(db);
}

async function deleteTournament(tournamentId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await fetchTournamentRows(tx, tournamentId);
    await tx.execute(sql`UPDATE tournament_control_templates SET sourceTournamentId = NULL WHERE sourceTournamentId = ${tournamentId}`);
    await tx.execute(sql`DELETE FROM tournament_game_connections WHERE tournamentId = ${tournamentId}`);
    await tx.delete(tournamentViewerLinks).where(eq(tournamentViewerLinks.tournamentId, tournamentId));
    await tx.delete(tournamentTeamSubmissions).where(eq(tournamentTeamSubmissions.tournamentId, tournamentId));
    await tx.execute(sql`DELETE FROM tournament_team_claim_links WHERE tournamentTeamId IN (SELECT id FROM teams WHERE tournamentId = ${tournamentId})`);
    await tx.delete(tournamentGames).where(eq(tournamentGames.tournamentId, tournamentId));
    await tx.delete(teams).where(eq(teams.tournamentId, tournamentId));
    await tx.delete(tournaments).where(eq(tournaments.id, tournamentId));
    return listTournamentRows(tx);
  });
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

async function connectGames(tournamentId: number, sourceGameId: number, targetGameId: number, flowType: ConnectionFlowType = "winner") {
  const db = await requireDb();
  await assertConnectionGames(db, tournamentId, sourceGameId, targetGameId);
  await db.execute(sql`
    INSERT INTO tournament_game_connections (tournamentId, sourceGameId, targetGameId, flowType)
    VALUES (${tournamentId}, ${sourceGameId}, ${targetGameId}, ${flowType})
    ON DUPLICATE KEY UPDATE updatedAt = CURRENT_TIMESTAMP
  `);
  return fetchTournamentControlData(tournamentId);
}

async function deleteGameConnection(connectionId: number) {
  const db = await requireDb();
  const connectionRows = readRows<ControlGameConnection>(
    await db.execute(sql`SELECT id, tournamentId, sourceGameId, targetGameId, flowType FROM tournament_game_connections WHERE id = ${connectionId} LIMIT 1`)
  );
  const [connection] = connectionRows;
  if (!connection) throw new TRPCError({ code: "NOT_FOUND", message: "Lobby connection not found" });
  await db.execute(sql`DELETE FROM tournament_game_connections WHERE id = ${connectionId}`);
  return fetchTournamentControlData(connection.tournamentId);
}



function assertSeriesBestOf(gameType: TournamentGameType, seriesBestOf: 1 | 3 | 5) {
  if (gameType === "cashout" && seriesBestOf !== 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Cashout lobbies cannot use BO3 or BO5." });
  }
}

function createManagedTeamSlug(name: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  return base || "team";
}

async function listTemplates(db: QueryExecutor, userId: number) {
  const rows = await db.select().from(tournamentControlTemplates);
  return rows.filter(template => template.visibility === "public" || template.createdByUserId === userId);
}

async function getActiveViewerLink(db: QueryExecutor, tournamentId: number) {
  const rows = await db.select().from(tournamentViewerLinks).where(and(eq(tournamentViewerLinks.tournamentId, tournamentId), eq(tournamentViewerLinks.status, "active")));
  return rows[0] ?? null;
}

async function createViewerLink(tournamentId: number, userId: number) {
  const db = await requireDb();
  await fetchTournamentRows(db, tournamentId);
  const existing = await getActiveViewerLink(db, tournamentId);
  if (existing) await db.update(tournamentViewerLinks).set({ status: "revoked", updatedAt: sql`now()` }).where(eq(tournamentViewerLinks.id, existing.id));
  const token = randomBytes(32).toString("base64url");
  await db.insert(tournamentViewerLinks).values({ tournamentId, createdByUserId: userId, tokenHash: hashToken(token) });
  return { path: createTokenPath("/bracket", token), url: createTokenPath("/bracket", token), enabled: true } as const;
}

async function getViewerDataByToken(token: string) {
  const db = await requireDb();
  const tokenHash = hashToken(token);
  const [link] = await db.select().from(tournamentViewerLinks).where(and(eq(tournamentViewerLinks.tokenHash, tokenHash), eq(tournamentViewerLinks.status, "active"))).limit(1);
  if (!link) throw new TRPCError({ code: "NOT_FOUND", message: "Viewer link not found." });
  const data = await fetchTournamentRows(db, link.tournamentId);
  return {
    tournament: {
      id: data.tournament.id,
      name: data.tournament.name,
      eventStatus: data.tournament.eventStatus,
      currentStage: data.tournament.currentStage,
      currentCycle: data.tournament.currentCycle,
      currentMatch: data.tournament.currentMatch,
    },
    teams: data.teams.map(team => ({ id: team.id, name: team.name, frp: team.frp })),
    games: data.games.map(game => ({ id: game.id, tournamentId: game.tournamentId, gameType: game.gameType, status: game.status, displayLabel: game.displayLabel, canvasX: game.canvasX, canvasY: game.canvasY, seriesBestOf: game.seriesBestOf, mapId: game.mapId })),
    assignments: data.assignments,
    connections: data.connections,
  };
}

async function saveTemplateFromTournament(input: { tournamentId: number; name: string; visibility: "private" | "public" }, userId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const data = await fetchTournamentRows(tx, input.tournamentId);
    const insertResult = await tx.insert(tournamentControlTemplates).values({ name: input.name, visibility: input.visibility, createdByUserId: userId, sourceTournamentId: input.tournamentId });
    const templateId = requireInsertId(insertResult, "Template creation failed: database did not return the created template id.");
    const [template] = await tx.select().from(tournamentControlTemplates).where(eq(tournamentControlTemplates.id, templateId)).limit(1);
    if (!template) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Template creation failed." });
    const gameIdMap = new Map<number, number>();
    for (const game of data.games) {
      assertSeriesBestOf(game.gameType, game.seriesBestOf as 1 | 3 | 5);
      const gameInsertResult = await tx.insert(tournamentControlTemplateGames).values({ templateId: template.id, gameType: game.gameType, displayLabel: game.displayLabel, canvasX: game.canvasX, canvasY: game.canvasY, seriesBestOf: game.gameType === "final_round" ? game.seriesBestOf : 1, mapId: game.mapId });
      const templateGameId = requireInsertId(gameInsertResult, "Template creation failed: database did not return the created template game id.");
      gameIdMap.set(game.id, templateGameId);
    }
    for (const connection of data.connections) {
      const sourceTemplateGameId = gameIdMap.get(connection.sourceGameId);
      const targetTemplateGameId = gameIdMap.get(connection.targetGameId);
      if (sourceTemplateGameId && targetTemplateGameId) await tx.insert(tournamentControlTemplateConnections).values({ templateId: template.id, sourceTemplateGameId, targetTemplateGameId, flowType: connection.flowType });
    }
    return { templateId: template.id };
  });
}

async function createTournamentFromTemplate(input: { templateId: number; name: string }, userId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const [template] = await tx.select().from(tournamentControlTemplates).where(eq(tournamentControlTemplates.id, input.templateId)).limit(1);
    if (!template || (template.visibility !== "public" && template.createdByUserId !== userId)) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });
    const templateGames = await tx.select().from(tournamentControlTemplateGames).where(eq(tournamentControlTemplateGames.templateId, template.id));
    const templateConnections = await tx.select().from(tournamentControlTemplateConnections).where(eq(tournamentControlTemplateConnections.templateId, template.id));
    const insertResult = await tx.insert(tournaments).values({ name: input.name, ownerUserId: userId });
    const tournamentId = requireInsertId(insertResult, "Tournament creation failed: database did not return the created tournament id.");
    const gameIdMap = new Map<number, number>();
    for (const game of templateGames) {
      assertSeriesBestOf(game.gameType, game.seriesBestOf as 1 | 3 | 5);
      const gameInsertResult = await tx.insert(tournamentGames).values({ tournamentId, gameType: game.gameType, displayLabel: game.displayLabel, canvasX: game.canvasX, canvasY: game.canvasY, seriesBestOf: game.gameType === "final_round" ? game.seriesBestOf : 1, mapId: game.mapId });
      const tournamentGameId = requireInsertId(gameInsertResult, "Tournament creation failed: database did not return the created tournament game id.");
      gameIdMap.set(game.id, tournamentGameId);
    }
    for (const connection of templateConnections) {
      const sourceGameId = gameIdMap.get(connection.sourceTemplateGameId);
      const targetGameId = gameIdMap.get(connection.targetTemplateGameId);
      if (sourceGameId && targetGameId) await tx.execute(sql`INSERT INTO tournament_game_connections (tournamentId, sourceGameId, targetGameId, flowType) VALUES (${tournamentId}, ${sourceGameId}, ${targetGameId}, ${connection.flowType})`);
    }
    const [createdTournament] = await tx.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
    return { createdTournament };
  });
}

function getClaimLinkState(link: { status: "active" | "claimed" | "revoked"; expiresAt: Date }) {
  const expired = link.expiresAt.getTime() <= Date.now();
  return { active: link.status === "active" && !expired, expired, claimed: link.status === "claimed", revoked: link.status === "revoked" };
}

export function getAdvancingPlacements(gameType: TournamentGameType, flowType: ConnectionFlowType = "winner") {
  if (gameType === "cashout") return flowType === "winner" ? [1, 2] : [3, 4];
  return flowType === "winner" ? [1] : [2];
}

function getFlowLabel(flowType: ConnectionFlowType) {
  return flowType === "winner" ? "winner" : "loser";
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
    await db.execute(sql`SELECT id, tournamentId, sourceGameId, targetGameId, flowType FROM tournament_game_connections WHERE sourceGameId = ${game.id}`)
  );

  if (outgoingConnections.length === 0) return;

  const sourceAssignments = await getAssignmentsForGame(db, game.id);

  for (const connection of outgoingConnections) {
    const placementsToAdvance = getAdvancingPlacements(game.gameType, connection.flowType);
    const qualifiers = placementsToAdvance.map(placement => {
      const assignment = sourceAssignments.find(row => row.resultPlacement === placement);
      if (!assignment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${game.displayLabel} must have ${getFlowLabel(connection.flowType)} placements (${getPlacementLabel(placementsToAdvance)}) set before it can feed linked lobbies.`,
        });
      }
      return assignment;
    });
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

function buildLobbyCodeMessage(tournamentName: string, lobbyName: string, teamName: string, code: string) {
  return `Murph Tournaments lobby code
Tournament: ${tournamentName}
Lobby: ${lobbyName}
Team: ${teamName}
Code: ${code}`;
}

type LobbyCodeRecipient = {
  teamId: number;
  teamName: string;
  managedTeamId: number | null;
  recipientUserId: number | null;
  recipientDiscordId: string | null;
  recipientDisplayName: string | null;
  message: string;
  canSend: boolean;
  reason: string | null;
};

async function getLobbyCodeRecipients(db: QueryExecutor, gameId: number, teamId?: number) {
  const [game] = await db.select({ game: tournamentGames, tournament: tournaments })
    .from(tournamentGames)
    .innerJoin(tournaments, eq(tournamentGames.tournamentId, tournaments.id))
    .where(eq(tournamentGames.id, gameId))
    .limit(1);
  if (!game) throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });

  const rows = await db.select({
    assignment: tournamentGameAssignments,
    team: teams,
    managedTeam: managedTeams,
    captain: users,
  })
    .from(tournamentGameAssignments)
    .innerJoin(teams, eq(tournamentGameAssignments.teamId, teams.id))
    .leftJoin(managedTeams, eq(teams.managedTeamId, managedTeams.id))
    .leftJoin(users, eq(managedTeams.captainUserId, users.id))
    .where(eq(tournamentGameAssignments.gameId, gameId));

  const filtered = teamId ? rows.filter(row => row.team.id === teamId) : rows;
  if (teamId && filtered.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Team is not assigned to this lobby" });

  const recipients: LobbyCodeRecipient[] = filtered.map(row => {
    const discordId = getDiscordUserId(row.captain);
    const reason = !row.team.managedTeamId
      ? "Manual team has no captain recipient. Use Copy Message to send manually."
      : !row.managedTeam?.captainUserId
        ? "Managed team has no captain recipient."
        : !discordId
          ? "Captain has no Discord ID available."
          : null;
    return {
      teamId: row.team.id,
      teamName: row.team.name,
      managedTeamId: row.team.managedTeamId,
      recipientUserId: row.managedTeam?.captainUserId ?? null,
      recipientDiscordId: discordId,
      recipientDisplayName: row.captain?.discordDisplayName ?? row.captain?.discordUsername ?? row.captain?.name ?? null,
      message: game.game.privateLobbyCode ? buildLobbyCodeMessage(game.tournament.name, game.game.displayLabel, row.team.name, game.game.privateLobbyCode) : "",
      canSend: Boolean(game.game.privateLobbyCode && discordId),
      reason: game.game.privateLobbyCode ? reason : "Lobby has no private code set.",
    };
  });

  return { tournament: game.tournament, game: game.game, discordConfigured: Boolean(process.env.DISCORD_BOT_TOKEN), recipients };
}

async function sendDiscordDm(discordUserId: string, content: string) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Discord sending not configured: DISCORD_BOT_TOKEN is missing." });

  const channelResponse = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
    method: "POST",
    headers: { authorization: `Bot ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ recipient_id: discordUserId }),
  });
  if (!channelResponse.ok) throw new Error(`Discord DM channel failed (${channelResponse.status})`);
  const channel = await channelResponse.json() as { id?: string };
  if (!channel.id) throw new Error("Discord DM channel response was missing an id");

  const messageResponse = await fetch(`${DISCORD_API_BASE}/channels/${channel.id}/messages`, {
    method: "POST",
    headers: { authorization: `Bot ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ content }),
  });
  if (!messageResponse.ok) throw new Error(`Discord DM failed (${messageResponse.status})`);
}

async function sendLobbyCode(gameId: number, teamId?: number) {
  const db = await requireDb();
  const preview = await getLobbyCodeRecipients(db, gameId, teamId);
  const results = [];
  for (const recipient of preview.recipients) {
    if (!preview.discordConfigured) {
      results.push({ ...recipient, status: "failed" as const, message: "Discord sending not configured: DISCORD_BOT_TOKEN is missing." });
      continue;
    }
    if (!recipient.canSend || !recipient.recipientDiscordId) {
      results.push({ ...recipient, status: "failed" as const, message: recipient.reason ?? "Recipient cannot receive lobby code." });
      continue;
    }
    try {
      await sendDiscordDm(recipient.recipientDiscordId, recipient.message);
      results.push({ ...recipient, status: "sent" as const, message: "Lobby code sent." });
    } catch (error) {
      results.push({ ...recipient, status: "failed" as const, message: error instanceof Error ? error.message : "Discord DM failed. The captain may block bot DMs." });
    }
  }
  return { gameId, results };
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

export async function assignTeamToGameSlot(gameId: number, teamId: number, preferredSlotIndex?: number) {
  const db = await requireDb();
  const game = await getGameOrThrow(db, gameId);
  const context = await fetchGameContext(db, game.tournamentId);
  const slotIndex = resolveAssignmentSlot({ game, assignments: context.assignments, preferredSlotIndex, teamId });
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

  listTemplates: discordTournamentStaffProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return listTemplates(db, ctx.user.id);
  }),
  saveTemplateFromTournament: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ name: z.string().trim().min(2).max(120), visibility: templateVisibilitySchema })).mutation(({ input, ctx }) => saveTemplateFromTournament(input, ctx.user.id)),
  createTournamentFromTemplate: discordTournamentStaffProcedure.input(z.object({ templateId: idSchema, name: z.string().trim().min(2).max(255) })).mutation(({ input, ctx }) => createTournamentFromTemplate(input, ctx.user.id)),
  enableViewerLink: discordTournamentStaffProcedure.input(tournamentIdSchema).mutation(({ input, ctx }) => createViewerLink(input.tournamentId, ctx.user.id)),
  getViewer: publicProcedure.input(z.object({ token: tokenSchema })).query(({ input }) => getViewerDataByToken(input.token)),
  getTeamClaimLinkPreview: publicProcedure.input(z.object({ token: tokenSchema })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select({ link: tournamentTeamClaimLinks, team: teams, tournament: tournaments }).from(tournamentTeamClaimLinks).innerJoin(teams, eq(tournamentTeamClaimLinks.tournamentTeamId, teams.id)).innerJoin(tournaments, eq(teams.tournamentId, tournaments.id)).where(eq(tournamentTeamClaimLinks.tokenHash, hashToken(input.token))).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Claim link not found." });
    const state = getClaimLinkState(row.link);
    return { teamName: row.team.name, tournamentName: row.tournament.name, expiresAt: row.link.expiresAt, ...state };
  }),
  acceptTeamClaimLink: protectedProcedure.input(z.object({ token: tokenSchema })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    return db.transaction(async tx => {
      const [row] = await tx.select({ link: tournamentTeamClaimLinks, team: teams }).from(tournamentTeamClaimLinks).innerJoin(teams, eq(tournamentTeamClaimLinks.tournamentTeamId, teams.id)).where(eq(tournamentTeamClaimLinks.tokenHash, hashToken(input.token))).limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Claim link not found." });
      const state = getClaimLinkState(row.link);
      if (state.revoked) throw new TRPCError({ code: "FORBIDDEN", message: "This claim link has been revoked." });
      if (state.claimed) throw new TRPCError({ code: "FORBIDDEN", message: "This claim link has already been used." });
      if (state.expired) throw new TRPCError({ code: "FORBIDDEN", message: "This claim link has expired." });
      if (row.team.managedTeamId) throw new TRPCError({ code: "CONFLICT", message: "This team is already managed." });
      const baseSlug = createManagedTeamSlug(row.team.name);
      let slug = baseSlug;
      for (let i = 2; ; i++) {
        const existing = await tx.select({ id: managedTeams.id }).from(managedTeams).where(eq(managedTeams.slug, slug)).limit(1);
        if (!existing.length) break;
        slug = `${baseSlug}-${i}`.slice(0, 80);
      }
      await tx.insert(managedTeams).values({ name: row.team.name, slug, captainUserId: ctx.user.id });
      const [managedTeam] = await tx.select().from(managedTeams).where(eq(managedTeams.slug, slug)).limit(1);
      await tx.insert(managedTeamMembers).values({ teamId: managedTeam.id, userId: ctx.user.id, role: "captain" });
      await tx.update(teams).set({ managedTeamId: managedTeam.id }).where(eq(teams.id, row.team.id));
      await tx.update(tournamentTeamClaimLinks).set({ status: "claimed", claimedByUserId: ctx.user.id, updatedAt: sql`now()` }).where(eq(tournamentTeamClaimLinks.id, row.link.id));
      return { success: true, managedTeamId: managedTeam.id, tournamentId: row.team.tournamentId };
    });
  }),
  listTournaments: discordTournamentStaffProcedure.query(async () => {
    const db = await requireDb();
    return listTournamentRows(db);
  }),
  listOwnerCandidates: discordTournamentStaffProcedure.query(async () => {
    const db = await requireDb();
    return listOwnerCandidates(db);
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
  createTournament: discordTournamentStaffProcedure.input(createTournamentSchema).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const insertResult = await db.insert(tournaments).values({
      name: input.name,
      eventStatus: input.eventStatus,
      currentCycle: input.currentCycle,
      currentStage: input.currentStage,
      currentMatch: input.currentMatch,
      eventNote: input.eventNote ?? null,
      ownerUserId: ctx.user.id,
    });
    const rows = await listTournamentRows(db);
    const insertId = Number((insertResult as { insertId?: unknown } | undefined)?.insertId ?? 0);
    const createdTournament = rows.find(tournament => tournament.id === insertId) ?? rows.filter(tournament => tournament.name === input.name).sort((a, b) => b.id - a.id)[0] ?? rows.sort((a, b) => b.id - a.id)[0];
    if (!createdTournament) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Tournament creation failed" });
    return { createdTournament, tournaments: rows };
  }),
  get: discordTournamentStaffProcedure.input(tournamentIdSchema).query(({ input }) => fetchTournamentControlData(input.tournamentId)),
  renameTournament: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ name: z.string().trim().min(2).max(255) })).mutation(({ input }) => updateTournamentName(input.tournamentId, input.name)),
  setTournamentOwner: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ ownerUserId: idSchema.nullable() })).mutation(({ input }) => setTournamentOwner(input.tournamentId, input.ownerUserId)),
  deleteTournament: discordTournamentStaffProcedure.input(tournamentIdSchema).mutation(({ input }) => deleteTournament(input.tournamentId)),
  previewLobbyCodeRecipients: discordTournamentStaffProcedure.input(gameIdSchema).query(async ({ input }) => {
    const db = await requireDb();
    return getLobbyCodeRecipients(db, input.gameId);
  }),
  sendLobbyCodeToTeamLeader: discordTournamentStaffProcedure.input(gameIdSchema.extend({ teamId: idSchema })).mutation(({ input }) => sendLobbyCode(input.gameId, input.teamId)),
  sendLobbyCodeToLobbyLeaders: discordTournamentStaffProcedure.input(gameIdSchema).mutation(({ input }) => sendLobbyCode(input.gameId)),
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
  setFinalRoundSeriesBestOf: discordTournamentStaffProcedure.input(gameIdSchema.extend({ seriesBestOf: seriesBestOfSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    if (game.gameType !== "final_round") throw new TRPCError({ code: "BAD_REQUEST", message: "Only Final Round matches can use BO3 or BO5." });
    assertGameIsMutable(game);
    await db.update(tournamentGames).set({ seriesBestOf: input.seriesBestOf }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  moveGame: discordTournamentStaffProcedure.input(gameIdSchema.extend({ position: positionSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    const safePosition = clampCanvasPosition(input.position);
    await db.update(tournamentGames).set({ canvasX: safePosition.x, canvasY: safePosition.y }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  connectGames: discordTournamentStaffProcedure.input(tournamentIdSchema.extend({ sourceGameId: idSchema, targetGameId: idSchema, flowType: connectionFlowTypeSchema.default("winner") })).mutation(({ input }) => connectGames(input.tournamentId, input.sourceGameId, input.targetGameId, input.flowType)),
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
  setGameMap: discordTournamentStaffProcedure.input(gameIdSchema.extend({ mapId: mapIdSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    await db.update(tournamentGames).set({ mapId: input.mapId }).where(eq(tournamentGames.id, input.gameId));
    return fetchTournamentControlData(game.tournamentId);
  }),
  randomizeGameMap: discordTournamentStaffProcedure.input(gameIdSchema).mutation(async ({ input }) => {
    const [mapId] = drawUniqueMaps(DEFAULT_COMPETITIVE_MAP_IDS, 1);
    if (!mapId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No maps available to randomize" });
    const db = await requireDb();
    const game = await getGameOrThrow(db, input.gameId);
    await db.update(tournamentGames).set({ mapId }).where(eq(tournamentGames.id, input.gameId));
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
  assignTeam: discordTournamentStaffProcedure.input(gameIdSchema.extend({ teamId: idSchema, slotIndex: z.number().int().positive().optional(), preferredSlotIndex: z.number().int().positive().optional() })).mutation(({ input }) => assignTeamToGameSlot(input.gameId, input.teamId, input.preferredSlotIndex ?? input.slotIndex)),
  moveTeam: discordTournamentStaffProcedure.input(gameIdSchema.extend({ teamId: idSchema, toGameId: idSchema, slotIndex: z.number().int().positive().optional(), preferredSlotIndex: z.number().int().positive().optional() })).mutation(async ({ input }) => {
    const db = await requireDb();
    const targetGame = await getGameOrThrow(db, input.toGameId);
    await db.transaction(async tx => {
      const context = await fetchGameContext(tx, targetGame.tournamentId);
      const assignmentsForSlotResolution = context.assignments.filter(
        assignment => !(assignment.gameId === input.gameId && assignment.teamId === input.teamId)
      );
      const slotIndex = resolveAssignmentSlot({
        game: targetGame,
        assignments: assignmentsForSlotResolution,
        preferredSlotIndex: input.preferredSlotIndex ?? input.slotIndex,
        teamId: input.teamId,
      });
      validateMovePlan({ ...context, sourceGameId: input.gameId, targetGameId: input.toGameId, teamId: input.teamId, slotIndex });
      await tx.delete(tournamentGameAssignments).where(and(eq(tournamentGameAssignments.gameId, input.gameId), eq(tournamentGameAssignments.teamId, input.teamId)));
      await tx.insert(tournamentGameAssignments).values({ gameId: input.toGameId, teamId: input.teamId, slotIndex });
    });
    return fetchTournamentControlData(targetGame.tournamentId);
  }),
  createTeamClaimLink: discordTournamentStaffProcedure.input(z.object({ teamId: idSchema })).mutation(async ({ input, ctx }) => {
    const db = await requireDb();
    const [team] = await db.select().from(teams).where(eq(teams.id, input.teamId)).limit(1);
    if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
    if (team.managedTeamId) throw new TRPCError({ code: "CONFLICT", message: "This team is already managed." });
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + CLAIM_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);
    await db.insert(tournamentTeamClaimLinks).values({ tournamentTeamId: team.id, createdByUserId: ctx.user.id, tokenHash: hashToken(token), expiresAt });
    return { path: createTokenPath("/teams/claim", token), url: createTokenPath("/teams/claim", token), expiresAt };
  }),
  listTeamClaimLinks: discordTournamentStaffProcedure.input(z.object({ teamId: idSchema })).query(async ({ input }) => {
    const db = await requireDb();
    const rows = await db.select().from(tournamentTeamClaimLinks).where(eq(tournamentTeamClaimLinks.tournamentTeamId, input.teamId));
    return rows.map(link => ({ ...link, state: getClaimLinkState(link) }));
  }),
  revokeTeamClaimLink: discordTournamentStaffProcedure.input(z.object({ linkId: idSchema })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(tournamentTeamClaimLinks).set({ status: "revoked", updatedAt: sql`now()` }).where(eq(tournamentTeamClaimLinks.id, input.linkId));
    return { success: true } as const;
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
