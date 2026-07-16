import { and, eq, inArray, not, sql } from "drizzle-orm";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getDb } from "./db";
import {
  discordAuthenticatedProcedure,
  personalTcrAlphaProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  getDiscordUserId,
  assertDiscordTournamentStaff,
} from "./discordTournamentRoles";
import {
  managedTeamMembers,
  managedTeams,
  teams,
  tournamentControlTemplateConnections,
  tournamentControlTemplateGames,
  tournamentControlTemplates,
  tournamentGameAssignments,
  tournamentGames,
  tournamentTeamResults,
  tournaments,
  tournamentTeamClaimLinks,
  tournamentTeamSubmissions,
  tournamentPrivateInviteLinks,
  tournamentLobbyCodeDeliveries,
  tournamentViewerLinks,
  tournamentStaffMembers,
  tournamentStaffInviteLinks,
  users,
} from "../drizzle/schema";
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
  selectAutoFillLobbyAssignments,
  type ControlAssignment,
  type ControlGame,
  type ControlTeam,
  type TournamentGameType,
} from "./tournamentControlRules";
import {
  THE_FINALS_MAPS,
  DEFAULT_COMPETITIVE_MAP_IDS,
  drawUniqueMaps,
} from "../shared/finalsMaps";
import {
  calculateTournamentScoreboard,
  getValidPlacementsForGameType,
} from "../shared/tournamentResults";
import { shouldCreateTournamentTeamForApproval } from "./tournamentTeamSubmissions";
import { sendDiscordDm } from "./discordDm";

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type QueryExecutor = Pick<
  Database,
  "select" | "insert" | "update" | "delete" | "execute"
>;
const CLAIM_LINK_TTL_DAYS = 14;
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
function createTokenPath(prefix: string, token: string) {
  return `${prefix}/${encodeURIComponent(token)}`;
}
export type ConnectionFlowType = "winner" | "loser";
const connectionFlowTypeSchema = z.enum(["winner", "loser"]);
export const PERSONAL_TCR_LIMITS = {
  activeTournamentsPerUser: 12,
  teamsPerTournament: 32,
  gameNodesPerTournament: 64,
  activePrivateLinksPerTournament: 1,
  activeStaffLinksPerTournament: 1,
} as const;
const STAFF_INVITE_TTL_DAYS = 7;
const TOURNAMENT_LOCKED_MESSAGE = "Tournament is finalized and locked.";

function assertTournamentUnlocked(tournament: { finalizedAt: Date | null }) {
  if (tournament.finalizedAt)
    throw new TRPCError({
      code: "CONFLICT",
      message: TOURNAMENT_LOCKED_MESSAGE,
    });
}

async function incrementBoardRevision(db: QueryExecutor, tournamentId: number) {
  await db
    .update(tournaments)
    .set({ boardRevision: sql`${tournaments.boardRevision} + 1` })
    .where(eq(tournaments.id, tournamentId));
}

function assertTournamentOwnerOrSiteAdmin(
  tournament: { ownerUserId: number | null },
  user: { id: number; role: "user" | "admin" }
) {
  if (user.role === "admin") return;
  if (tournament.ownerUserId === user.id) return;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You can only manage tournaments you own.",
  });
}

async function hasTournamentStaffMembership(
  db: QueryExecutor,
  tournamentId: number,
  userId: number
) {
  const rows = await db
    .select({ id: tournamentStaffMembers.id })
    .from(tournamentStaffMembers)
    .where(
      and(
        eq(tournamentStaffMembers.tournamentId, tournamentId),
        eq(tournamentStaffMembers.userId, userId)
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function getManageableTournamentOrThrow(
  db: QueryExecutor,
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament)
    throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
  if (
    user.role === "admin" ||
    tournament.ownerUserId === user.id ||
    (await hasTournamentStaffMembership(db, tournamentId, user.id))
  )
    return tournament;
  throw new TRPCError({
    code: "FORBIDDEN",
    message: "You can only manage tournaments you own or staff.",
  });
}

async function getMutableManageableTournamentOrThrow(
  db: QueryExecutor,
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const tournament = await getManageableTournamentOrThrow(
    db,
    tournamentId,
    user
  );
  assertTournamentUnlocked(tournament);
  return tournament;
}

async function assertPersonalTournamentLimit(
  db: QueryExecutor,
  user: { id: number; role: "user" | "admin" }
) {
  if (user.role === "admin") return;
  const activeRows = await db
    .select({ id: tournaments.id })
    .from(tournaments)
    .where(
      and(
        eq(tournaments.ownerUserId, user.id),
        sql`${tournaments.eventStatus} <> 'complete'`
      )
    );
  if (activeRows.length >= PERSONAL_TCR_LIMITS.activeTournamentsPerUser)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Active personal tournament limit reached.",
    });
}

async function assertTeamLimit(
  db: QueryExecutor,
  tournamentId: number,
  user?: { role: "user" | "admin" }
) {
  if (user?.role === "admin") return;
  const rows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));
  if (rows.length >= PERSONAL_TCR_LIMITS.teamsPerTournament)
    throw new TRPCError({ code: "FORBIDDEN", message: "Team limit reached." });
}

async function assertGameNodeLimit(
  db: QueryExecutor,
  tournamentId: number,
  additional = 1,
  user?: { role: "user" | "admin" }
) {
  if (user?.role === "admin") return;
  const rows = await db
    .select({ id: tournamentGames.id })
    .from(tournamentGames)
    .where(eq(tournamentGames.tournamentId, tournamentId));
  if (rows.length + additional > PERSONAL_TCR_LIMITS.gameNodesPerTournament)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Lobby node limit reached.",
    });
}

async function getOwnedTournamentOrThrow(
  db: QueryExecutor,
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament)
    throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
  assertTournamentOwnerOrSiteAdmin(tournament, user);
  return tournament;
}

async function assertGameBelongsToOwnedTournament(
  db: QueryExecutor,
  gameId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const game = await getGameOrThrow(db, gameId);
  await getMutableManageableTournamentOrThrow(db, game.tournamentId, user);
  return game;
}

async function assertAssignmentBelongsToOwnedTournament(
  db: QueryExecutor,
  assignmentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const [row] = await db
    .select({ assignment: tournamentGameAssignments, game: tournamentGames })
    .from(tournamentGameAssignments)
    .innerJoin(
      tournamentGames,
      eq(tournamentGameAssignments.gameId, tournamentGames.id)
    )
    .where(eq(tournamentGameAssignments.id, assignmentId))
    .limit(1);
  if (!row)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team assignment not found",
    });
  await getMutableManageableTournamentOrThrow(db, row.game.tournamentId, user);
  return row;
}

async function assertConnectionBelongsToOwnedTournament(
  db: QueryExecutor,
  connectionId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const rows = readRows<ControlGameConnection>(
    await db.execute(
      sql`SELECT id, tournamentId, sourceGameId, targetGameId, flowType FROM tournament_game_connections WHERE id = ${connectionId} LIMIT 1`
    )
  );
  const [connection] = rows;
  if (!connection)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lobby connection not found",
    });
  await getMutableManageableTournamentOrThrow(
    db,
    connection.tournamentId,
    user
  );
  return connection;
}

function createSlug(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "tournament"
  );
}

async function createUniquePublicSlug(db: QueryExecutor, name: string) {
  const base = createSlug(name);
  for (let suffix = 0; suffix < 1000; suffix++) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`.slice(0, 120);
    const existing = await db
      .select({ id: tournaments.id })
      .from(tournaments)
      .where(eq(tournaments.publicSlug, slug))
      .limit(1);
    if (!existing.length) return slug;
  }
  throw new TRPCError({
    code: "CONFLICT",
    message: "Could not create a unique public slug.",
  });
}

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
type BoardSnapshotInput = {
  tournament?: { name: string };
  expectedRevision: number;
  games: Array<{
    id: number;
    tournamentId: number;
    gameType: TournamentGameType;
    status: (typeof tournamentGameStatuses)[number];
    displayLabel: string;
    canvasX: number;
    canvasY: number;
    privateLobbyCode?: string | null;
    seriesBestOf?: number;
    mapId?: string | null;
    broadcastUrl?: string | null;
    roundGroupId?: string | null;
    roundLabel?: string | null;
    roundColor?: string | null;
    roundLocked?: number | null;
  }>;
  assignments: Array<{
    id: number;
    gameId: number;
    teamId: number;
    slotIndex: number;
    resultPlacement?: number | null;
  }>;
  connections: Array<{
    id: number;
    tournamentId: number;
    sourceGameId: number;
    targetGameId: number;
    flowType: ConnectionFlowType;
  }>;
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
const positionSchema = z.object({
  x: z.number().int().min(-10000).max(10000),
  y: z.number().int().min(-10000).max(10000),
});
const labelSchema = z.string().trim().min(1).max(80);
const teamNameSchema = z.string().trim().min(2).max(80);
const frpSchema = z.number().int().min(0).max(9999).default(0);
const lobbyCodeSchema = z.string().trim().min(1).max(64).nullable();
const seriesBestOfSchema = z.union([z.literal(1), z.literal(3), z.literal(5)]);
const templateVisibilitySchema = z.enum(["private", "public"]);
const tokenSchema = z.string().trim().min(16).max(256);
const adminNoteSchema = z.string().trim().max(1000).nullable().optional();
const resultPlacementSchema = z.number().int().min(1).max(4).nullable();
const competitiveMapIds = new Set<string>(DEFAULT_COMPETITIVE_MAP_IDS);
const legacySafeMapIds = new Set<string>(THE_FINALS_MAPS.map(map => map.id));
export const userSelectedMapIdSchema = z
  .string()
  .trim()
  .max(64)
  .nullable()
  .refine(
    value => value === null || competitiveMapIds.has(value),
    "Map must be in the competitive pool"
  );
export const broadcastUrlSchema = z.preprocess(
  value => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z
    .string()
    .max(1024)
    .url()
    .nullable()
    .refine(value => {
      if (value === null) return true;
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Broadcast URL must be a valid http or https URL")
);
export const storedMapIdSchema = z
  .string()
  .trim()
  .max(64)
  .nullable()
  .refine(
    value => value === null || legacySafeMapIds.has(value),
    "Stored map must be a known Finals map"
  );

const boardSnapshotSchema = z.object({
  tournament: z.object({ name: z.string().trim().min(2).max(255) }).optional(),
  expectedRevision: z.number().int().min(0),
  games: z.array(
    z.object({
      id: idSchema,
      tournamentId: idSchema,
      gameType: z.enum(["cashout", "final_round"]),
      status: z.enum(tournamentGameStatuses),
      displayLabel: labelSchema,
      canvasX: z.number().int().min(-10000).max(10000),
      canvasY: z.number().int().min(-10000).max(10000),
      privateLobbyCode: z.string().trim().max(64).nullable().optional(),
      seriesBestOf: seriesBestOfSchema.optional(),
      mapId: storedMapIdSchema.optional(),
      broadcastUrl: broadcastUrlSchema.optional(),
      roundGroupId: z.string().trim().max(64).nullable().optional(),
      roundLabel: z.string().trim().max(80).nullable().optional(),
      roundColor: z.string().trim().max(24).nullable().optional(),
      roundLocked: z.number().int().min(0).max(1).optional(),
    })
  ),
  assignments: z.array(
    z.object({
      id: idSchema,
      gameId: idSchema,
      teamId: idSchema,
      slotIndex: z.number().int().positive(),
      resultPlacement: resultPlacementSchema.optional(),
    })
  ),
  connections: z.array(
    z.object({
      id: idSchema,
      tournamentId: idSchema,
      sourceGameId: idSchema,
      targetGameId: idSchema,
      flowType: connectionFlowTypeSchema,
    })
  ),
});

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
  const insertId =
    typeof rawInsertId === "bigint" ? Number(rawInsertId) : Number(rawInsertId);
  return Number.isSafeInteger(insertId) && insertId > 0 ? insertId : null;
}

function getAffectedRows(result: unknown): number {
  if (Array.isArray(result)) {
    return result.reduce((total, item) => total + getAffectedRows(item), 0);
  }
  if (isRecord(result) && "affectedRows" in result) {
    const affectedRows = Number(result.affectedRows);
    return Number.isFinite(affectedRows) ? affectedRows : 0;
  }
  return 0;
}

function requireInsertId(result: unknown, message: string): number {
  const insertId = extractInsertId(result);
  if (insertId === null)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
  return insertId;
}

const createTournamentSchema = z.object({
  name: z.string().trim().min(2).max(255),
  eventStatus: z.enum(["not-live", "live", "complete"]).default("not-live"),
  currentCycle: z.enum(["1", "2", "3"]).default("1"),
  currentStage: z
    .enum(["check-in", "cashout", "final-round", "finished"])
    .default("check-in"),
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
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

/**
 * Used only by public, single-resource read procedures (getBySlug,
 * getResultsArchive). Unlike a list endpoint, a specific requested
 * tournament can't be honestly reported as "empty" or "not found" when we
 * can't actually check — that would mislead someone with a real, working
 * link. This still throws (same as requireDb), but with a message distinct
 * from a genuine NOT_FOUND and with server-side logging so a real outage
 * doesn't disappear silently.
 */
async function requireDbForPublicRead(context: string) {
  const db = await getDb();
  if (!db) {
    console.error(`[Database] ${context}: database not available`);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        "Tournament data is temporarily unavailable. Please try again shortly.",
    });
  }
  return db;
}

async function lockTournamentForBoardMutation(
  db: QueryExecutor,
  tournamentId: number
) {
  const rows = readRows<{
    id: number;
    boardRevision: number;
    finalizedAt: Date | null;
  }>(
    await db.execute(
      sql`SELECT id, boardRevision, finalizedAt FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`
    )
  );
  const [tournament] = rows;
  if (!tournament)
    throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
  assertTournamentUnlocked(tournament);
  return tournament;
}

async function lockTournamentRow(db: QueryExecutor, tournamentId: number) {
  const rows = readRows<{
    id: number;
    ownerUserId: number | null;
    boardRevision: number;
    finalizedAt: Date | null;
  }>(
    await db.execute(
      sql`SELECT id, ownerUserId, boardRevision, finalizedAt FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`
    )
  );
  const [tournament] = rows;
  if (!tournament)
    throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
  return tournament;
}

async function runBoardMutation<T>(
  tournamentId: number,
  mutate: (tx: QueryExecutor) => Promise<T>,
  options: { increment?: boolean } = {}
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    const result = await mutate(tx);
    if (options.increment !== false)
      await incrementBoardRevision(tx, tournamentId);
    return result;
  });
}

async function runBoardMutationAndFetch(
  tournamentId: number,
  mutate: (tx: QueryExecutor) => Promise<boolean | void>,
  options: { increment?: boolean } = {}
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    const changed = await mutate(tx);
    if (options.increment !== false && changed !== false)
      await incrementBoardRevision(tx, tournamentId);
    return fetchTournamentRows(tx, tournamentId);
  });
}

async function getGameOrThrow(db: QueryExecutor, gameId: number) {
  const [game] = await db
    .select()
    .from(tournamentGames)
    .where(eq(tournamentGames.id, gameId))
    .limit(1);
  if (!game)
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  return game;
}

async function resolveGameTournamentId(gameId: number) {
  const db = await requireDb();
  const [game] = await db
    .select({ tournamentId: tournamentGames.tournamentId })
    .from(tournamentGames)
    .where(eq(tournamentGames.id, gameId))
    .limit(1);
  if (!game)
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });
  return game.tournamentId;
}

async function resolveAssignmentTournamentId(assignmentId: number) {
  const db = await requireDb();
  const [row] = await db
    .select({ tournamentId: tournamentGames.tournamentId })
    .from(tournamentGameAssignments)
    .innerJoin(
      tournamentGames,
      eq(tournamentGameAssignments.gameId, tournamentGames.id)
    )
    .where(eq(tournamentGameAssignments.id, assignmentId))
    .limit(1);
  if (!row)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team assignment not found",
    });
  return row.tournamentId;
}

async function resolveConnectionTournamentId(connectionId: number) {
  const db = await requireDb();
  const rows = readRows<{ tournamentId: number }>(
    await db.execute(
      sql`SELECT tournamentId FROM tournament_game_connections WHERE id = ${connectionId} LIMIT 1`
    )
  );
  const [connection] = rows;
  if (!connection)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Lobby connection not found",
    });
  return connection.tournamentId;
}

async function updateGameFieldAndFetch(
  gameId: number,
  getPatch: (
    game: Awaited<ReturnType<typeof getGameOrThrow>>
  ) => Partial<typeof tournamentGames.$inferInsert>,
  options: { requireMutable?: boolean; requireFinalRound?: boolean } = {}
) {
  const tournamentId = await resolveGameTournamentId(gameId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const gameInTx = await getGameOrThrow(tx, gameId);
    if (gameInTx.tournamentId !== tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobby belongs to another tournament.",
      });
    if (options.requireFinalRound && gameInTx.gameType !== "final_round")
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only Final Round matches can use BO3 or BO5.",
      });
    if (options.requireMutable) assertGameIsMutable(gameInTx);
    const patch = getPatch(gameInTx);
    const changed = Object.entries(patch).some(
      ([key, value]) => (gameInTx as Record<string, unknown>)[key] !== value
    );
    if (!changed) return false;
    await tx
      .update(tournamentGames)
      .set(patch)
      .where(eq(tournamentGames.id, gameId));
  });
}

async function deleteGameAssignmentAndFetch(gameId: number, teamId?: number) {
  const tournamentId = await resolveGameTournamentId(gameId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const gameInTx = await getGameOrThrow(tx, gameId);
    if (gameInTx.tournamentId !== tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobby belongs to another tournament.",
      });
    if (gameInTx.status === "complete")
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Completed games are historical. Mark the game active before changing assignments.",
      });
    const rows = await tx
      .select({ id: tournamentGameAssignments.id })
      .from(tournamentGameAssignments)
      .where(
        teamId === undefined
          ? eq(tournamentGameAssignments.gameId, gameId)
          : and(
              eq(tournamentGameAssignments.gameId, gameId),
              eq(tournamentGameAssignments.teamId, teamId)
            )
      );
    if (rows.length === 0) return false;
    await tx
      .delete(tournamentGameAssignments)
      .where(
        teamId === undefined
          ? eq(tournamentGameAssignments.gameId, gameId)
          : and(
              eq(tournamentGameAssignments.gameId, gameId),
              eq(tournamentGameAssignments.teamId, teamId)
            )
      );
  });
}

async function deleteGameAndFetch(gameId: number) {
  const tournamentId = await resolveGameTournamentId(gameId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const gameInTx = await getGameOrThrow(tx, gameId);
    if (gameInTx.tournamentId !== tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobby belongs to another tournament.",
      });
    assertGameIsMutable(gameInTx);
    await tx.delete(tournamentGames).where(eq(tournamentGames.id, gameId));
  });
}

async function createTournamentTeamAndFetch(input: {
  tournamentId: number;
  name: string;
  frp: number;
  user?: { role: "user" | "admin" };
}) {
  return runBoardMutationAndFetch(input.tournamentId, async tx => {
    await assertTeamLimit(tx, input.tournamentId, input.user);
    await assertUniqueTeamName(tx, input.tournamentId, input.name);
    await tx.insert(teams).values({
      tournamentId: input.tournamentId,
      name: input.name,
      frp: input.frp,
    });
  });
}

async function setTournamentRegistrationOpenAndFetch(
  tournamentId: number,
  registrationOpen: boolean
) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const [tournament] = await tx
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tournament not found",
      });
    const nextValue = registrationOpen ? 1 : 0;
    if (tournament.registrationOpen === nextValue) return false;
    await tx
      .update(tournaments)
      .set({ registrationOpen: nextValue })
      .where(eq(tournaments.id, tournamentId));
  });
}

async function updateGameStatusAndFetch(
  gameId: number,
  status: (typeof tournamentGameStatuses)[number]
) {
  const tournamentId = await resolveGameTournamentId(gameId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const gameInTx = await getGameOrThrow(tx, gameId);
    if (gameInTx.tournamentId !== tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobby belongs to another tournament.",
      });
    if (gameInTx.status === status) return false;
    const context = await fetchGameContext(tx, gameInTx.tournamentId);
    const isReopen = gameInTx.status === "complete";
    if (status === "complete") {
      // Qualifier advancement validation happens in the same transaction and rolls back with the status change.
    } else if (
      activeTournamentGameStatuses.includes(
        status as (typeof activeTournamentGameStatuses)[number]
      )
    ) {
      if (isReopen) validateReopenPlan({ ...context, gameId });
      else {
        const assignedRows = context.assignments.filter(
          assignment => assignment.gameId === gameId
        );
        for (const assignment of assignedRows)
          validateAssignmentPlan({
            ...context,
            targetGameId: gameId,
            teamId: assignment.teamId,
            slotIndex: assignment.slotIndex,
          });
      }
    }
    // Stopwatch lifecycle: entering "live" always starts a fresh, server-timed
    // run (covers draft/ready -> live and reopening straight to live).
    // Completing a run that actually went live freezes its duration.
    // Reopening to a non-live status clears the prior run so the next
    // transition to live starts a new stopwatch, per the required lifecycle.
    const timerPatch =
      status === "live"
        ? { liveStartedAt: sql`now()`, liveEndedAt: null }
        : status === "complete"
          ? gameInTx.liveStartedAt && !gameInTx.liveEndedAt
            ? { liveEndedAt: sql`now()` }
            : {}
          : isReopen
            ? { liveStartedAt: null, liveEndedAt: null }
            : {};
    await tx
      .update(tournamentGames)
      .set({ status, ...timerPatch })
      .where(eq(tournamentGames.id, gameId));
    if (status === "complete")
      await advanceCompletedGameQualifiers(tx, gameInTx);
  });
}

async function moveTeamBetweenGamesAndFetch(input: {
  gameId: number;
  teamId: number;
  toGameId: number;
  preferredSlotIndex?: number;
}) {
  const tournamentId = await resolveGameTournamentId(input.gameId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const sourceGameInTx = await getGameOrThrow(tx, input.gameId);
    const targetGameInTx = await getGameOrThrow(tx, input.toGameId);
    if (sourceGameInTx.tournamentId !== targetGameInTx.tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobbies must belong to the same tournament.",
      });
    if (sourceGameInTx.tournamentId !== tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobby belongs to another tournament.",
      });
    const context = await fetchGameContext(tx, sourceGameInTx.tournamentId);
    const existing = context.assignments.find(
      assignment =>
        assignment.gameId === input.gameId && assignment.teamId === input.teamId
    );
    if (!existing)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team assignment not found.",
      });
    const assignmentsForSlotResolution = context.assignments.filter(
      assignment =>
        !(
          assignment.gameId === input.gameId &&
          assignment.teamId === input.teamId
        )
    );
    const slotIndex = resolveAssignmentSlot({
      game: targetGameInTx,
      assignments: assignmentsForSlotResolution,
      preferredSlotIndex: input.preferredSlotIndex,
      teamId: input.teamId,
    });
    if (input.gameId === input.toGameId && existing.slotIndex === slotIndex)
      return false;
    validateMovePlan({
      ...context,
      sourceGameId: input.gameId,
      targetGameId: input.toGameId,
      teamId: input.teamId,
      slotIndex,
    });
    await tx
      .delete(tournamentGameAssignments)
      .where(
        and(
          eq(tournamentGameAssignments.gameId, input.gameId),
          eq(tournamentGameAssignments.teamId, input.teamId)
        )
      );
    await tx
      .insert(tournamentGameAssignments)
      .values({ gameId: input.toGameId, teamId: input.teamId, slotIndex });
  });
}

async function fetchTournamentRows(db: QueryExecutor, tournamentId: number) {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament)
    throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found" });
  const [teamRows, gameRows, assignmentRows, resultRows, connectionResult] =
    await Promise.all([
      db
        .select({
          id: teams.id,
          tournamentId: teams.tournamentId,
          managedTeamId: teams.managedTeamId,
          name: teams.name,
          frp: teams.frp,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
          captainUserId: managedTeams.captainUserId,
          captainDiscordOpenId: users.openId,
          captainDisplayName: sql<
            string | null
          >`COALESCE(${users.discordDisplayName}, ${users.discordUsername}, ${users.name})`,
        })
        .from(teams)
        .leftJoin(managedTeams, eq(teams.managedTeamId, managedTeams.id))
        .leftJoin(users, eq(managedTeams.captainUserId, users.id))
        .where(eq(teams.tournamentId, tournamentId)),
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
          resultPlacement: sql<number | null>`resultPlacement`,
        })
        .from(tournamentGameAssignments)
        .innerJoin(
          tournamentGames,
          eq(tournamentGameAssignments.gameId, tournamentGames.id)
        )
        .where(eq(tournamentGames.tournamentId, tournamentId)),
      db
        .select()
        .from(tournamentTeamResults)
        .where(eq(tournamentTeamResults.tournamentId, tournamentId)),
      db.execute(
        sql`SELECT id, tournamentId, sourceGameId, targetGameId, flowType FROM tournament_game_connections WHERE tournamentId = ${tournamentId}`
      ),
    ]);
  return {
    tournament,
    discordConfigured: Boolean(process.env.DISCORD_BOT_TOKEN),
    teams: teamRows.map(team => ({
      ...team,
      captainDiscordId: getDiscordUserId({
        openId: team.captainDiscordOpenId ?? undefined,
        loginMethod: team.captainDiscordOpenId ? "discord" : null,
      }),
    })),
    games: gameRows,
    assignments: assignmentRows,
    results: resultRows,
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

async function createGame(
  tournamentId: number,
  gameType: TournamentGameType,
  position: { x: number; y: number },
  user?: { role: "user" | "admin" }
) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const data = await fetchTournamentRows(tx, tournamentId);
    await assertGameNodeLimit(tx, tournamentId, 1, user);
    const count = data.games.filter(g => g.gameType === gameType).length + 1;
    const safePosition = clampCanvasPosition(position);
    await tx.insert(tournamentGames).values({
      tournamentId,
      gameType,
      displayLabel:
        gameType === "cashout"
          ? `Cashout Lobby ${count}`
          : `Final Round ${count}`,
      canvasX: safePosition.x,
      canvasY: safePosition.y,
    });
  });
}

async function listTournamentRows(db: QueryExecutor) {
  return db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      eventStatus: tournaments.eventStatus,
      currentCycle: tournaments.currentCycle,
      currentStage: tournaments.currentStage,
      currentMatch: tournaments.currentMatch,
      eventNote: tournaments.eventNote,
      registrationOpen: tournaments.registrationOpen,
      visibility: tournaments.visibility,
      publicSlug: tournaments.publicSlug,
      publishedAt: tournaments.publishedAt,
      maxTeams: tournaments.maxTeams,
      ownerUserId: tournaments.ownerUserId,
      createdAt: tournaments.createdAt,
      updatedAt: tournaments.updatedAt,
      owner: {
        id: users.id,
        name: users.name,
        discordDisplayName: users.discordDisplayName,
        discordUsername: users.discordUsername,
      },
    })
    .from(tournaments)
    .leftJoin(users, eq(tournaments.ownerUserId, users.id));
}

async function listOwnerCandidates(db: QueryExecutor) {
  return db
    .select({
      id: users.id,
      name: users.name,
      discordDisplayName: users.discordDisplayName,
      discordUsername: users.discordUsername,
    })
    .from(users)
    .where(eq(users.loginMethod, "discord"));
}

async function updateTournamentName(tournamentId: number, name: string) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const [tournament] = await tx
      .select({ name: tournaments.name })
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tournament not found",
      });
    if (tournament.name === name) return false;
    await tx
      .update(tournaments)
      .set({ name })
      .where(eq(tournaments.id, tournamentId));
  });
}

async function deleteTournamentTeam(tournamentId: number, teamId: number) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const [team] = await tx
      .select()
      .from(teams)
      .where(and(eq(teams.id, teamId), eq(teams.tournamentId, tournamentId)))
      .limit(1);
    if (!team)
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
    await tx
      .delete(teams)
      .where(and(eq(teams.id, teamId), eq(teams.tournamentId, tournamentId)));
  });
}

async function setTournamentOwner(
  tournamentId: number,
  ownerUserId: number | null
) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const [tournament] = await tx
      .select({ ownerUserId: tournaments.ownerUserId })
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tournament not found",
      });
    if (ownerUserId !== null) {
      const [owner] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, ownerUserId))
        .limit(1);
      if (!owner)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Owner user not found",
        });
    }
    if (tournament.ownerUserId === ownerUserId) return false;
    await tx
      .update(tournaments)
      .set({ ownerUserId })
      .where(eq(tournaments.id, tournamentId));
  });
}

async function deleteTournament(tournamentId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    await tx.execute(
      sql`UPDATE tournament_control_templates SET sourceTournamentId = NULL WHERE sourceTournamentId = ${tournamentId}`
    );
    await tx.execute(
      sql`DELETE FROM tournament_game_connections WHERE tournamentId = ${tournamentId}`
    );
    await tx
      .delete(tournamentViewerLinks)
      .where(eq(tournamentViewerLinks.tournamentId, tournamentId));
    await tx
      .delete(tournamentTeamSubmissions)
      .where(eq(tournamentTeamSubmissions.tournamentId, tournamentId));
    await tx.execute(
      sql`DELETE FROM tournament_team_claim_links WHERE tournamentTeamId IN (SELECT id FROM teams WHERE tournamentId = ${tournamentId})`
    );
    await tx
      .delete(tournamentGames)
      .where(eq(tournamentGames.tournamentId, tournamentId));
    await tx.delete(teams).where(eq(teams.tournamentId, tournamentId));
    await tx.delete(tournaments).where(eq(tournaments.id, tournamentId));
    return listTournamentRows(tx);
  });
}

async function assertUniqueTeamName(
  db: QueryExecutor,
  tournamentId: number,
  name: string
) {
  const tournamentTeams = await db
    .select()
    .from(teams)
    .where(eq(teams.tournamentId, tournamentId));
  if (
    tournamentTeams.some(
      team => team.name.trim().toLowerCase() === name.trim().toLowerCase()
    )
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A team with that name already exists in this tournament",
    });
  }
}

async function assertConnectionGames(
  db: QueryExecutor,
  tournamentId: number,
  sourceGameId: number,
  targetGameId: number
) {
  if (sourceGameId === targetGameId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "A lobby cannot connect to itself",
    });
  }

  const [sourceGame, targetGame] = await Promise.all([
    getGameOrThrow(db, sourceGameId),
    getGameOrThrow(db, targetGameId),
  ]);

  if (
    sourceGame.tournamentId !== tournamentId ||
    targetGame.tournamentId !== tournamentId
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Both lobbies must belong to this tournament",
    });
  }
}

export function getEligibleCompetitiveMapIds(
  defaultPool: readonly string[],
  bannedMapIds: readonly (string | null | undefined)[]
) {
  const bans = new Set(
    bannedMapIds.filter(
      (id): id is string => typeof id === "string" && id.length > 0
    )
  );
  return defaultPool.filter(mapId => !bans.has(mapId));
}

async function getEligibleMapIdsForGameRandomization(
  db: QueryExecutor,
  gameId: number
) {
  const rows = await db
    .select({ mapBanId: managedTeams.mapBanId })
    .from(tournamentGameAssignments)
    .innerJoin(teams, eq(tournamentGameAssignments.teamId, teams.id))
    .leftJoin(managedTeams, eq(teams.managedTeamId, managedTeams.id))
    .where(eq(tournamentGameAssignments.gameId, gameId));
  return getEligibleCompetitiveMapIds(
    DEFAULT_COMPETITIVE_MAP_IDS,
    rows.map(row => row.mapBanId)
  );
}

async function randomizeGameMap(db: QueryExecutor, gameId: number) {
  const tournamentId = await resolveGameTournamentId(gameId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const gameInTx = await getGameOrThrow(tx, gameId);
    if (gameInTx.tournamentId !== tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobby belongs to another tournament.",
      });
    const eligibleMapIds = await getEligibleMapIdsForGameRandomization(
      tx,
      gameId
    );
    if (eligibleMapIds.length === 0)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No eligible maps remain after assigned team map bans.",
      });
    const [mapId] = drawUniqueMaps(eligibleMapIds, 1);
    if (gameInTx.mapId === mapId) return false;
    await tx
      .update(tournamentGames)
      .set({ mapId })
      .where(eq(tournamentGames.id, gameId));
  });
}

async function moveGames(input: {
  tournamentId: number;
  positions: { gameId: number; position: { x: number; y: number } }[];
}) {
  const uniqueGameIds = new Set(input.positions.map(entry => entry.gameId));
  if (uniqueGameIds.size !== input.positions.length)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Duplicate lobby move.",
    });
  return runBoardMutationAndFetch(input.tournamentId, async tx => {
    const games = await tx
      .select()
      .from(tournamentGames)
      .where(inArray(tournamentGames.id, Array.from(uniqueGameIds)));
    if (games.length !== input.positions.length)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "One or more lobbies were not found.",
      });
    if (games.some(game => game.tournamentId !== input.tournamentId))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selected lobbies must belong to this tournament.",
      });
    for (const game of games) assertGamePositionUnlocked(game);
    let changed = false;
    for (const entry of input.positions) {
      const safePosition = clampCanvasPosition(entry.position);
      const game = games.find(row => row.id === entry.gameId);
      if (game?.canvasX === safePosition.x && game.canvasY === safePosition.y)
        continue;
      changed = true;
      await tx
        .update(tournamentGames)
        .set({ canvasX: safePosition.x, canvasY: safePosition.y })
        .where(eq(tournamentGames.id, entry.gameId));
    }
    if (!changed) return false;
  });
}

async function connectGames(
  tournamentId: number,
  sourceGameId: number,
  targetGameId: number,
  flowType: ConnectionFlowType = "winner"
) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    await assertConnectionGames(tx, tournamentId, sourceGameId, targetGameId);
    const existing = readRows<{ id: number; flowType: ConnectionFlowType }>(
      await tx.execute(
        sql`SELECT id, flowType FROM tournament_game_connections WHERE tournamentId = ${tournamentId} AND sourceGameId = ${sourceGameId} AND targetGameId = ${targetGameId} LIMIT 1 FOR UPDATE`
      )
    )[0];
    if (existing?.flowType === flowType) return false;
    await tx.execute(sql`
      INSERT INTO tournament_game_connections (tournamentId, sourceGameId, targetGameId, flowType)
      VALUES (${tournamentId}, ${sourceGameId}, ${targetGameId}, ${flowType})
      ON DUPLICATE KEY UPDATE flowType = VALUES(flowType), updatedAt = CURRENT_TIMESTAMP
    `);
  });
}

async function deleteGameConnection(connectionId: number) {
  const tournamentId = await resolveConnectionTournamentId(connectionId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const rows = readRows<{ id: number }>(
      await tx.execute(
        sql`SELECT id FROM tournament_game_connections WHERE id = ${connectionId} AND tournamentId = ${tournamentId} LIMIT 1 FOR UPDATE`
      )
    );
    if (rows.length === 0) return false;
    await tx.execute(
      sql`DELETE FROM tournament_game_connections WHERE id = ${connectionId} AND tournamentId = ${tournamentId}`
    );
  });
}

async function clearTournamentConnections(tournamentId: number) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const rows = readRows<{ id: number }>(
      await tx.execute(
        sql`SELECT id FROM tournament_game_connections WHERE tournamentId = ${tournamentId} FOR UPDATE`
      )
    );
    if (rows.length === 0) return false;
    await tx.execute(
      sql`DELETE FROM tournament_game_connections WHERE tournamentId = ${tournamentId}`
    );
  });
}

async function returnTournamentTeamsToAvailable(tournamentId: number) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const rows = readRows<{ id: number }>(
      await tx.execute(
        sql`SELECT tournament_game_assignments.id FROM tournament_game_assignments INNER JOIN tournament_games ON tournament_game_assignments.gameId = tournament_games.id WHERE tournament_games.tournamentId = ${tournamentId} FOR UPDATE`
      )
    );
    if (rows.length === 0) return false;
    await tx.execute(
      sql`DELETE tournament_game_assignments FROM tournament_game_assignments INNER JOIN tournament_games ON tournament_game_assignments.gameId = tournament_games.id WHERE tournament_games.tournamentId = ${tournamentId}`
    );
  });
}

async function autoFillLobby(gameId: number) {
  const db = await requireDb();
  const game = await getGameOrThrow(db, gameId);
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, game.tournamentId);
    await tx.execute(
      sql`SELECT id FROM tournament_games WHERE id = ${gameId} AND tournamentId = ${game.tournamentId} FOR UPDATE`
    );
    const targetGame = await getGameOrThrow(tx, gameId);
    if (targetGame.tournamentId !== game.tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobby belongs to another tournament.",
      });
    if (targetGame.status === "complete")
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Completed games are historical. Reopen the game before auto-filling it.",
      });
    await tx.execute(
      sql`SELECT id FROM tournament_games WHERE tournamentId = ${targetGame.tournamentId} FOR UPDATE`
    );
    await tx.execute(
      sql`SELECT tournament_game_assignments.id FROM tournament_game_assignments INNER JOIN tournament_games ON tournament_game_assignments.gameId = tournament_games.id WHERE tournament_games.tournamentId = ${targetGame.tournamentId} FOR UPDATE`
    );
    const context = await fetchGameContext(tx, targetGame.tournamentId);
    const assignments = selectAutoFillLobbyAssignments({
      teams: context.teams,
      games: context.games,
      assignments: context.assignments,
      targetGame,
    });
    for (const assignment of assignments) {
      await tx.insert(tournamentGameAssignments).values({
        gameId: targetGame.id,
        teamId: assignment.teamId,
        slotIndex: assignment.slotIndex,
      });
    }
    if (assignments.length > 0)
      await incrementBoardRevision(tx, targetGame.tournamentId);
    const updatedAssignments = await getAssignmentsForGame(tx, targetGame.id);
    const slotsOpen =
      gameCapacity[targetGame.gameType] - updatedAssignments.length;
    return {
      assignedCount: assignments.length,
      slotsOpen: Math.max(0, slotsOpen),
      assignments: updatedAssignments,
      board: await fetchTournamentRows(tx, targetGame.tournamentId),
    };
  });
}

const roundLabelSchema = z.string().trim().min(1).max(80);
const roundGroupIdSchema = z.string().trim().min(1).max(64);
const roundColorSchema = z.enum([
  "gold",
  "cyan",
  "violet",
  "orange",
  "blue",
  "fuchsia",
  "emerald",
]);

async function setRoundGroupLocked(input: {
  tournamentId: number;
  roundGroupId: string;
  locked: boolean;
}) {
  return runBoardMutationAndFetch(input.tournamentId, async tx => {
    const games = await tx
      .select({
        id: tournamentGames.id,
        roundLocked: tournamentGames.roundLocked,
      })
      .from(tournamentGames)
      .where(
        and(
          eq(tournamentGames.tournamentId, input.tournamentId),
          eq(tournamentGames.roundGroupId, input.roundGroupId)
        )
      );
    if (games.length === 0)
      throw new TRPCError({ code: "NOT_FOUND", message: "Group not found." });
    const nextLocked = input.locked ? 1 : 0;
    if (games.every(game => game.roundLocked === nextLocked)) return false;
    await tx
      .update(tournamentGames)
      .set({ roundLocked: nextLocked })
      .where(
        and(
          eq(tournamentGames.tournamentId, input.tournamentId),
          eq(tournamentGames.roundGroupId, input.roundGroupId)
        )
      );
  });
}

function assertGamePositionUnlocked(game: {
  roundGroupId: string | null;
  roundLocked: number;
}) {
  if (game.roundGroupId && game.roundLocked === 1)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Unlock this group before moving its lobbies.",
    });
}

async function updateRoundGroup(input: {
  tournamentId: number;
  gameIds: number[];
  label?: string;
  roundGroupId?: string;
  color?: z.infer<typeof roundColorSchema>;
  mode: "create" | "add" | "rename" | "remove" | "color";
}) {
  return runBoardMutationAndFetch(input.tournamentId, async tx => {
    const uniqueGameIds = Array.from(new Set(input.gameIds));
    if (
      (input.mode === "create" || input.mode === "add") &&
      uniqueGameIds.length < 2
    )
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Select at least two lobbies.",
      });
    if (uniqueGameIds.length === 0)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Select at least one lobby.",
      });
    const selectedGames = await tx
      .select()
      .from(tournamentGames)
      .where(inArray(tournamentGames.id, uniqueGameIds));
    if (selectedGames.length !== uniqueGameIds.length)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "One or more lobbies were not found.",
      });
    if (selectedGames.some(game => game.tournamentId !== input.tournamentId))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Selected lobbies must belong to this tournament.",
      });
    if (input.mode === "remove") {
      if (
        selectedGames.every(
          game =>
            !game.roundGroupId &&
            !game.roundLabel &&
            !game.roundColor &&
            game.roundLocked === 0
        )
      )
        return false;
      await tx
        .update(tournamentGames)
        .set({
          roundGroupId: null,
          roundLabel: null,
          roundColor: null,
          roundLocked: 0,
        })
        .where(inArray(tournamentGames.id, uniqueGameIds));
    } else if (input.mode === "rename" || input.mode === "color") {
      const groupId = input.roundGroupId ?? selectedGames[0]?.roundGroupId;
      if (!groupId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Group not found.",
        });
      const matchingGames = await tx
        .select()
        .from(tournamentGames)
        .where(
          and(
            eq(tournamentGames.tournamentId, input.tournamentId),
            eq(tournamentGames.roundGroupId, groupId)
          )
        );
      const nextValue =
        input.mode === "color"
          ? (input.color ?? "gold")
          : (input.label ?? "Group");
      if (
        matchingGames.length > 0 &&
        matchingGames.every(game =>
          input.mode === "color"
            ? game.roundColor === nextValue
            : game.roundLabel === nextValue
        )
      )
        return false;
      await tx
        .update(tournamentGames)
        .set(
          input.mode === "color"
            ? { roundColor: nextValue }
            : { roundLabel: nextValue }
        )
        .where(
          and(
            eq(tournamentGames.tournamentId, input.tournamentId),
            eq(tournamentGames.roundGroupId, groupId)
          )
        );
    } else {
      const nextGroupId = input.roundGroupId ?? randomUUID();
      const nextLabel = input.label ?? "Group";
      const nextColor = input.color ?? null;
      const nextLocked =
        selectedGames.find(game => game.roundGroupId === input.roundGroupId)
          ?.roundLocked ?? 0;
      if (
        selectedGames.every(
          game =>
            game.roundGroupId === nextGroupId &&
            game.roundLabel === nextLabel &&
            game.roundColor === nextColor &&
            game.roundLocked === nextLocked
        )
      )
        return false;
      await tx
        .update(tournamentGames)
        .set({
          roundGroupId: nextGroupId,
          roundLabel: nextLabel,
          roundColor: nextColor,
          roundLocked: nextLocked,
        })
        .where(inArray(tournamentGames.id, uniqueGameIds));
    }
  });
}

async function clearTournamentCanvas(tournamentId: number) {
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const existingGames = await tx
      .select({ id: tournamentGames.id })
      .from(tournamentGames)
      .where(eq(tournamentGames.tournamentId, tournamentId));
    const existingConnections = readRows<{ id: number }>(
      await tx.execute(
        sql`SELECT id FROM tournament_game_connections WHERE tournamentId = ${tournamentId} FOR UPDATE`
      )
    );
    const existingAssignments = readRows<{ id: number }>(
      await tx.execute(
        sql`SELECT tournament_game_assignments.id FROM tournament_game_assignments INNER JOIN tournament_games ON tournament_game_assignments.gameId = tournament_games.id WHERE tournament_games.tournamentId = ${tournamentId} FOR UPDATE`
      )
    );
    if (
      existingGames.length === 0 &&
      existingConnections.length === 0 &&
      existingAssignments.length === 0
    )
      return false;
    await tx.execute(
      sql`DELETE FROM tournament_game_connections WHERE tournamentId = ${tournamentId}`
    );
    await tx.execute(
      sql`DELETE tournament_game_assignments FROM tournament_game_assignments INNER JOIN tournament_games ON tournament_game_assignments.gameId = tournament_games.id WHERE tournament_games.tournamentId = ${tournamentId}`
    );
    await tx
      .delete(tournamentGames)
      .where(eq(tournamentGames.tournamentId, tournamentId));
  });
}

async function restoreTournamentBoardSnapshot(
  tournamentId: number,
  snapshot: BoardSnapshotInput
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const lockedRows = readRows<{
      id: number;
      boardRevision: number;
      finalizedAt: Date | null;
    }>(
      await tx.execute(
        sql`SELECT id, boardRevision, finalizedAt FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`
      )
    );
    const [lockedTournament] = lockedRows;
    if (!lockedTournament)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tournament not found",
      });
    assertTournamentUnlocked(lockedTournament);
    if (lockedTournament.boardRevision !== snapshot.expectedRevision)
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "The tournament changed after this action. Refresh before using Undo.",
      });

    const data = await fetchTournamentRows(tx, tournamentId);
    const tournamentTeamRows = await tx
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.tournamentId, tournamentId));
    const tournamentTeamIds = new Set(tournamentTeamRows.map(team => team.id));
    for (const game of snapshot.games) {
      if (game.tournamentId !== tournamentId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Snapshot contains a lobby from another tournament",
        });
    }
    const snapshotGameIds = new Set(snapshot.games.map(game => game.id));

    for (const assignment of snapshot.assignments) {
      if (!snapshotGameIds.has(assignment.gameId))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Snapshot assignment references an unknown lobby",
        });
      if (!tournamentTeamIds.has(assignment.teamId))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Snapshot assignment references a team from another tournament",
        });
    }
    for (const connection of snapshot.connections) {
      if (
        connection.tournamentId !== tournamentId ||
        !snapshotGameIds.has(connection.sourceGameId) ||
        !snapshotGameIds.has(connection.targetGameId)
      )
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Snapshot connection references an unknown lobby",
        });
    }

    if (snapshot.games.length > PERSONAL_TCR_LIMITS.gameNodesPerTournament)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Lobby node limit reached.",
      });

    if (snapshot.tournament?.name) {
      await tx
        .update(tournaments)
        .set({ name: snapshot.tournament.name })
        .where(eq(tournaments.id, tournamentId));
    }

    await tx.execute(
      sql`DELETE FROM tournament_game_connections WHERE tournamentId = ${tournamentId}`
    );
    await tx.execute(
      sql`DELETE tournament_game_assignments FROM tournament_game_assignments INNER JOIN tournament_games ON tournament_game_assignments.gameId = tournament_games.id WHERE tournament_games.tournamentId = ${tournamentId}`
    );
    if (snapshot.games.length === 0) {
      await tx
        .delete(tournamentGames)
        .where(eq(tournamentGames.tournamentId, tournamentId));
    } else {
      await tx.delete(tournamentGames).where(
        and(
          eq(tournamentGames.tournamentId, tournamentId),
          not(
            inArray(
              tournamentGames.id,
              snapshot.games.map(game => game.id)
            )
          )
        )
      );
    }

    const currentGameIds = new Set(data.games.map(game => game.id));
    const gameIdMap = new Map<number, number>();
    for (const game of snapshot.games) {
      const values = {
        tournamentId,
        gameType: game.gameType,
        status: game.status,
        displayLabel: game.displayLabel,
        canvasX: game.canvasX,
        canvasY: game.canvasY,
        privateLobbyCode: game.privateLobbyCode ?? null,
        seriesBestOf: game.seriesBestOf ?? 1,
        mapId: game.mapId ?? null,
        broadcastUrl: game.broadcastUrl ?? null,
        roundGroupId: game.roundGroupId ?? null,
        roundLabel: game.roundLabel ?? null,
        roundColor: game.roundColor ?? null,
        roundLocked: game.roundLocked ?? 0,
      };
      if (currentGameIds.has(game.id)) {
        await tx
          .update(tournamentGames)
          .set(values)
          .where(
            and(
              eq(tournamentGames.id, game.id),
              eq(tournamentGames.tournamentId, tournamentId)
            )
          );
        gameIdMap.set(game.id, game.id);
      } else {
        const result = await tx.insert(tournamentGames).values(values);
        gameIdMap.set(
          game.id,
          requireInsertId(result, "Failed to restore lobby")
        );
      }
    }

    for (const assignment of snapshot.assignments) {
      const newGameId = gameIdMap.get(assignment.gameId);
      if (!newGameId) continue;
      const result = await tx.insert(tournamentGameAssignments).values({
        gameId: newGameId,
        teamId: assignment.teamId,
        slotIndex: assignment.slotIndex,
      });
      const newAssignmentId = requireInsertId(
        result,
        "Failed to restore team assignment"
      );
      if (assignment.resultPlacement !== undefined)
        await tx.execute(
          sql`UPDATE tournament_game_assignments SET resultPlacement = ${assignment.resultPlacement ?? null} WHERE id = ${newAssignmentId}`
        );
    }

    for (const connection of snapshot.connections) {
      const sourceGameId = gameIdMap.get(connection.sourceGameId);
      const targetGameId = gameIdMap.get(connection.targetGameId);
      if (!sourceGameId || !targetGameId) continue;
      await tx.execute(
        sql`INSERT INTO tournament_game_connections (tournamentId, sourceGameId, targetGameId, flowType) VALUES (${tournamentId}, ${sourceGameId}, ${targetGameId}, ${connection.flowType})`
      );
    }

    await incrementBoardRevision(tx, tournamentId);
    return fetchTournamentRows(tx, tournamentId);
  });
}

function assertSeriesBestOf(
  gameType: TournamentGameType,
  seriesBestOf: 1 | 3 | 5
) {
  if (gameType === "cashout" && seriesBestOf !== 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cashout lobbies cannot use BO3 or BO5.",
    });
  }
}

function createManagedTeamSlug(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return base || "team";
}

async function listTemplates(db: QueryExecutor, userId: number) {
  const rows = await db
    .select({
      id: tournamentControlTemplates.id,
      name: tournamentControlTemplates.name,
      visibility: tournamentControlTemplates.visibility,
      createdByUserId: tournamentControlTemplates.createdByUserId,
      sourceTournamentId: tournamentControlTemplates.sourceTournamentId,
      createdAt: tournamentControlTemplates.createdAt,
      updatedAt: tournamentControlTemplates.updatedAt,
      creator: {
        id: users.id,
        name: users.name,
        discordDisplayName: users.discordDisplayName,
        discordUsername: users.discordUsername,
      },
      lobbyCount: sql<number>`count(${tournamentControlTemplateGames.id})`,
    })
    .from(tournamentControlTemplates)
    .leftJoin(users, eq(tournamentControlTemplates.createdByUserId, users.id))
    .leftJoin(
      tournamentControlTemplateGames,
      eq(
        tournamentControlTemplateGames.templateId,
        tournamentControlTemplates.id
      )
    )
    .where(
      sql`${tournamentControlTemplates.visibility} = 'public' OR ${tournamentControlTemplates.createdByUserId} = ${userId}`
    )
    .groupBy(tournamentControlTemplates.id, users.id);
  return rows.map(row => ({
    ...row,
    lobbyCount: Number(row.lobbyCount),
    ownedByCurrentUser: row.createdByUserId === userId,
  }));
}

async function getTemplateForUseOrThrow(
  db: QueryExecutor,
  templateId: number,
  userId: number
) {
  const [template] = await db
    .select()
    .from(tournamentControlTemplates)
    .where(eq(tournamentControlTemplates.id, templateId))
    .limit(1);
  if (
    !template ||
    (template.visibility !== "public" && template.createdByUserId !== userId)
  )
    throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });
  return template;
}

async function getOwnedTemplateOrThrow(
  db: QueryExecutor,
  templateId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const [template] = await db
    .select()
    .from(tournamentControlTemplates)
    .where(eq(tournamentControlTemplates.id, templateId))
    .limit(1);
  if (!template)
    throw new TRPCError({ code: "NOT_FOUND", message: "Template not found." });
  if (user.role !== "admin" && template.createdByUserId !== user.id)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only manage templates you created.",
    });
  return template;
}

async function renameTemplate(
  templateId: number,
  name: string,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getOwnedTemplateOrThrow(db, templateId, user);
  await db
    .update(tournamentControlTemplates)
    .set({ name, updatedAt: sql`now()` })
    .where(eq(tournamentControlTemplates.id, templateId));
  return { templateId };
}

async function setTemplateVisibility(
  templateId: number,
  visibility: "private" | "public",
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getOwnedTemplateOrThrow(db, templateId, user);
  await db
    .update(tournamentControlTemplates)
    .set({ visibility, updatedAt: sql`now()` })
    .where(eq(tournamentControlTemplates.id, templateId));
  return { templateId, visibility };
}

async function deleteTemplate(
  templateId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getOwnedTemplateOrThrow(db, templateId, user);
  await db
    .delete(tournamentControlTemplates)
    .where(eq(tournamentControlTemplates.id, templateId));
  return { templateId };
}

async function getActiveViewerLink(db: QueryExecutor, tournamentId: number) {
  const rows = await db
    .select()
    .from(tournamentViewerLinks)
    .where(
      and(
        eq(tournamentViewerLinks.tournamentId, tournamentId),
        eq(tournamentViewerLinks.status, "active")
      )
    );
  return rows[0] ?? null;
}

async function getOrCreateViewerLink(tournamentId: number, userId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    const existing = await getActiveViewerLink(tx, tournamentId);
    if (existing?.publicToken)
      return {
        path: createTokenPath("/bracket", existing.publicToken),
        url: createTokenPath("/bracket", existing.publicToken),
        enabled: true,
      } as const;
    if (existing)
      await tx
        .update(tournamentViewerLinks)
        .set({ status: "revoked", updatedAt: sql`now()` })
        .where(eq(tournamentViewerLinks.id, existing.id));
    const token = randomBytes(32).toString("base64url");
    await tx.insert(tournamentViewerLinks).values({
      tournamentId,
      createdByUserId: userId,
      tokenHash: hashToken(token),
      publicToken: token,
    });
    return {
      path: createTokenPath("/bracket", token),
      url: createTokenPath("/bracket", token),
      enabled: true,
    } as const;
  });
}

async function regenerateViewerLink(tournamentId: number, userId: number) {
  const db = await requireDb();
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    await tx
      .update(tournamentViewerLinks)
      .set({ status: "revoked", updatedAt: sql`now()` })
      .where(
        and(
          eq(tournamentViewerLinks.tournamentId, tournamentId),
          eq(tournamentViewerLinks.status, "active")
        )
      );
    const token = randomBytes(32).toString("base64url");
    await tx.insert(tournamentViewerLinks).values({
      tournamentId,
      createdByUserId: userId,
      tokenHash: hashToken(token),
      publicToken: token,
    });
    return {
      path: createTokenPath("/bracket", token),
      url: createTokenPath("/bracket", token),
      enabled: true,
    } as const;
  });
}

async function ensureViewerLinkForApprovedSubmission(
  db: QueryExecutor,
  tournamentId: number,
  userId: number
) {
  const activeLinks = await db
    .select()
    .from(tournamentViewerLinks)
    .where(
      and(
        eq(tournamentViewerLinks.tournamentId, tournamentId),
        eq(tournamentViewerLinks.status, "active")
      )
    );
  if (activeLinks.some(link => link.publicToken)) return;
  // Legacy active viewer links only have tokenHash, so the raw /bracket token is unrecoverable.
  // Rotate those unretrievable rows before creating a durable retrievable viewer token.
  if (activeLinks.length) {
    await db
      .update(tournamentViewerLinks)
      .set({ status: "revoked", updatedAt: sql`now()` })
      .where(
        inArray(
          tournamentViewerLinks.id,
          activeLinks.map(link => link.id)
        )
      );
  }
  const token = randomBytes(32).toString("base64url");
  await db.insert(tournamentViewerLinks).values({
    tournamentId,
    createdByUserId: userId,
    tokenHash: hashToken(token),
    publicToken: token,
  });
}

async function getViewerDataByToken(token: string) {
  const db = await requireDb();
  const tokenHash = hashToken(token);
  const [link] = await db
    .select()
    .from(tournamentViewerLinks)
    .where(
      and(
        eq(tournamentViewerLinks.tokenHash, tokenHash),
        eq(tournamentViewerLinks.status, "active")
      )
    )
    .limit(1);
  if (!link)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Viewer link not found.",
    });
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
    teams: data.teams.map(team => ({
      id: team.id,
      name: team.name,
      frp: team.frp,
    })),
    games: data.games.map(game => ({
      id: game.id,
      tournamentId: game.tournamentId,
      gameType: game.gameType,
      status: game.status,
      displayLabel: game.displayLabel,
      canvasX: game.canvasX,
      canvasY: game.canvasY,
      seriesBestOf: game.seriesBestOf,
      mapId: game.mapId,
      broadcastUrl: game.broadcastUrl,
      roundGroupId: game.roundGroupId,
      roundLabel: game.roundLabel,
      roundColor: game.roundColor,
    })),
    assignments: data.assignments,
    connections: data.connections,
  };
}

async function saveTemplateFromTournament(
  input: {
    tournamentId: number;
    name: string;
    visibility: "private" | "public";
  },
  userId: number
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const data = await fetchTournamentRows(tx, input.tournamentId);
    const insertResult = await tx.insert(tournamentControlTemplates).values({
      name: input.name,
      visibility: input.visibility,
      createdByUserId: userId,
      sourceTournamentId: input.tournamentId,
    });
    const templateId = requireInsertId(
      insertResult,
      "Template creation failed: database did not return the created template id."
    );
    const [template] = await tx
      .select()
      .from(tournamentControlTemplates)
      .where(eq(tournamentControlTemplates.id, templateId))
      .limit(1);
    if (!template)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Template creation failed.",
      });
    const gameIdMap = new Map<number, number>();
    for (const game of data.games) {
      assertSeriesBestOf(game.gameType, game.seriesBestOf as 1 | 3 | 5);
      const gameInsertResult = await tx
        .insert(tournamentControlTemplateGames)
        .values({
          templateId: template.id,
          gameType: game.gameType,
          displayLabel: game.displayLabel,
          canvasX: game.canvasX,
          canvasY: game.canvasY,
          seriesBestOf: game.gameType === "final_round" ? game.seriesBestOf : 1,
          mapId: game.mapId,
          roundGroupId: game.roundGroupId,
          roundLabel: game.roundLabel,
          roundColor: game.roundColor,
          roundLocked: game.roundLocked ?? 0,
        });
      const templateGameId = requireInsertId(
        gameInsertResult,
        "Template creation failed: database did not return the created template game id."
      );
      gameIdMap.set(game.id, templateGameId);
    }
    for (const connection of data.connections) {
      const sourceTemplateGameId = gameIdMap.get(connection.sourceGameId);
      const targetTemplateGameId = gameIdMap.get(connection.targetGameId);
      if (sourceTemplateGameId && targetTemplateGameId)
        await tx.insert(tournamentControlTemplateConnections).values({
          templateId: template.id,
          sourceTemplateGameId,
          targetTemplateGameId,
          flowType: connection.flowType,
        });
    }
    return { templateId: template.id };
  });
}

async function createTournamentFromTemplate(
  input: {
    templateId: number;
    name: string;
    visibility?: "private" | "public";
  },
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const template = await getTemplateForUseOrThrow(
      tx,
      input.templateId,
      user.id
    );
    const templateGames = await tx
      .select()
      .from(tournamentControlTemplateGames)
      .where(eq(tournamentControlTemplateGames.templateId, template.id));
    const templateConnections = await tx
      .select()
      .from(tournamentControlTemplateConnections)
      .where(eq(tournamentControlTemplateConnections.templateId, template.id));
    await assertPersonalTournamentLimit(tx, user);
    if (templateGames.length > PERSONAL_TCR_LIMITS.gameNodesPerTournament)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Lobby node limit reached.",
      });
    const visibility = input.visibility ?? "private";
    const publicSlug =
      visibility === "public"
        ? await createUniquePublicSlug(tx, input.name)
        : null;
    const insertResult = await tx.insert(tournaments).values({
      name: input.name,
      ownerUserId: user.id,
      visibility,
      publicSlug,
      publishedAt: null,
    });
    const tournamentId = requireInsertId(
      insertResult,
      "Tournament creation failed: database did not return the created tournament id."
    );
    const gameIdMap = new Map<number, number>();
    const roundGroupIdMap = new Map<string, string>();
    const remapRoundGroupId = (sourceRoundGroupId: string | null) => {
      if (!sourceRoundGroupId) return null;
      const existingGroupId = roundGroupIdMap.get(sourceRoundGroupId);
      if (existingGroupId) return existingGroupId;
      const newGroupId = randomUUID();
      roundGroupIdMap.set(sourceRoundGroupId, newGroupId);
      return newGroupId;
    };
    for (const game of templateGames) {
      assertSeriesBestOf(game.gameType, game.seriesBestOf as 1 | 3 | 5);
      const gameInsertResult = await tx.insert(tournamentGames).values({
        tournamentId,
        gameType: game.gameType,
        displayLabel: game.displayLabel,
        canvasX: game.canvasX,
        canvasY: game.canvasY,
        seriesBestOf: game.gameType === "final_round" ? game.seriesBestOf : 1,
        mapId: game.mapId,
        roundGroupId: remapRoundGroupId(game.roundGroupId),
        roundLabel: game.roundLabel,
        roundColor: game.roundColor,
        roundLocked: game.roundLocked ?? 0,
      });
      const tournamentGameId = requireInsertId(
        gameInsertResult,
        "Tournament creation failed: database did not return the created tournament game id."
      );
      gameIdMap.set(game.id, tournamentGameId);
    }
    for (const connection of templateConnections) {
      const sourceGameId = gameIdMap.get(connection.sourceTemplateGameId);
      const targetGameId = gameIdMap.get(connection.targetTemplateGameId);
      if (sourceGameId && targetGameId)
        await tx.execute(
          sql`INSERT INTO tournament_game_connections (tournamentId, sourceGameId, targetGameId, flowType) VALUES (${tournamentId}, ${sourceGameId}, ${targetGameId}, ${connection.flowType})`
        );
    }
    const [createdTournament] = await tx
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    return { createdTournament };
  });
}

function getClaimLinkState(link: {
  status: "active" | "claimed" | "revoked";
  expiresAt: Date;
}) {
  const expired = link.expiresAt.getTime() <= Date.now();
  return {
    active: link.status === "active" && !expired,
    expired,
    claimed: link.status === "claimed",
    revoked: link.status === "revoked",
  };
}

export function getAdvancingPlacements(
  gameType: TournamentGameType,
  flowType: ConnectionFlowType = "winner"
) {
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
  return db
    .select({
      id: tournamentGameAssignments.id,
      gameId: tournamentGameAssignments.gameId,
      teamId: tournamentGameAssignments.teamId,
      slotIndex: tournamentGameAssignments.slotIndex,
      resultPlacement: sql<number | null>`resultPlacement`,
    })
    .from(tournamentGameAssignments)
    .where(eq(tournamentGameAssignments.gameId, gameId)) as Promise<
    AssignmentResultRow[]
  >;
}

async function advanceCompletedGameQualifiers(
  db: QueryExecutor,
  game: AdvancementGame
) {
  const outgoingConnections = readRows<ControlGameConnection>(
    await db.execute(
      sql`SELECT id, tournamentId, sourceGameId, targetGameId, flowType FROM tournament_game_connections WHERE sourceGameId = ${game.id}`
    )
  );

  if (outgoingConnections.length === 0) return;

  const sourceAssignments = await getAssignmentsForGame(db, game.id);

  for (const connection of outgoingConnections) {
    const placementsToAdvance = getAdvancingPlacements(
      game.gameType,
      connection.flowType
    );
    const qualifiers = placementsToAdvance.map(placement => {
      const assignment = sourceAssignments.find(
        row => row.resultPlacement === placement
      );
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
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Linked lobby belongs to a different tournament",
      });
    }
    if (targetGame.status === "complete") {
      throw new TRPCError({
        code: "CONFLICT",
        message: `${targetGame.displayLabel} is already complete and cannot receive advancing teams.`,
      });
    }

    for (const qualifier of qualifiers) {
      const targetAssignments = await getAssignmentsForGame(db, targetGame.id);
      if (
        targetAssignments.some(
          assignment => assignment.teamId === qualifier.teamId
        )
      )
        continue;

      const capacity = gameCapacity[targetGame.gameType];
      const usedSlots = new Set(
        targetAssignments.map(assignment => assignment.slotIndex)
      );
      const nextSlot = Array.from(
        { length: capacity },
        (_, index) => index + 1
      ).find(slot => !usedSlots.has(slot));

      if (!nextSlot) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `${targetGame.displayLabel} has no open slots for advancing teams.`,
        });
      }

      const context = await fetchGameContext(db, targetGame.tournamentId);
      validateAssignmentPlan({
        ...context,
        targetGameId: targetGame.id,
        teamId: qualifier.teamId,
        slotIndex: nextSlot,
      });
      await db.insert(tournamentGameAssignments).values({
        gameId: targetGame.id,
        teamId: qualifier.teamId,
        slotIndex: nextSlot,
      });
    }
  }
}

function buildLobbyCodeMessage(
  tournamentName: string,
  lobbyName: string,
  teamName: string,
  code: string
) {
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

async function getLobbyCodeRecipients(
  db: QueryExecutor,
  gameId: number,
  teamId?: number
) {
  const [game] = await db
    .select({ game: tournamentGames, tournament: tournaments })
    .from(tournamentGames)
    .innerJoin(tournaments, eq(tournamentGames.tournamentId, tournaments.id))
    .where(eq(tournamentGames.id, gameId))
    .limit(1);
  if (!game)
    throw new TRPCError({ code: "NOT_FOUND", message: "Game not found" });

  const rows = await db
    .select({
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
  if (teamId && filtered.length === 0)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team is not assigned to this lobby",
    });

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
      recipientDisplayName:
        row.captain?.discordDisplayName ??
        row.captain?.discordUsername ??
        row.captain?.name ??
        null,
      message: game.game.privateLobbyCode
        ? buildLobbyCodeMessage(
            game.tournament.name,
            game.game.displayLabel,
            row.team.name,
            game.game.privateLobbyCode
          )
        : "",
      canSend: Boolean(game.game.privateLobbyCode && discordId),
      reason: game.game.privateLobbyCode
        ? reason
        : "Lobby has no private code set.",
    };
  });

  return {
    tournament: game.tournament,
    game: game.game,
    discordConfigured: Boolean(process.env.DISCORD_BOT_TOKEN),
    recipients,
  };
}

async function releaseLobbyCodeDeliveries(
  gameId: number,
  releasedByUserId: number,
  teamId?: number
) {
  const db = await requireDb();
  const tournamentId = await resolveGameTournamentId(gameId);
  await db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    const game = await getGameOrThrow(tx, gameId);
    if (game.tournamentId !== tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Lobby belongs to another tournament.",
      });
    const rows = await tx
      .select({ assignment: tournamentGameAssignments, team: teams })
      .from(tournamentGameAssignments)
      .innerJoin(teams, eq(tournamentGameAssignments.teamId, teams.id))
      .where(eq(tournamentGameAssignments.gameId, gameId));
    const selected = teamId ? rows.filter(row => row.team.id === teamId) : rows;
    if (teamId && selected.length === 0)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team is not assigned to this lobby",
      });
    for (const row of selected) {
      if (row.team.tournamentId !== tournamentId)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Assigned team belongs to another tournament.",
        });
      await tx.execute(
        sql`INSERT INTO tournament_lobby_code_deliveries (gameId, teamId, releasedByUserId, lastDiscordAttemptAt) VALUES (${gameId}, ${row.team.id}, ${releasedByUserId}, NOW()) ON DUPLICATE KEY UPDATE status = 'available', releasedByUserId = ${releasedByUserId}, lastDiscordAttemptAt = NOW(), updatedAt = NOW()`
      );
    }
  });
}

async function sendLobbyCode(gameId: number, teamId?: number) {
  const db = await requireDb();
  const preview = await getLobbyCodeRecipients(db, gameId, teamId);
  const results = [];
  for (const recipient of preview.recipients) {
    if (!preview.discordConfigured) {
      results.push({
        ...recipient,
        status: "failed" as const,
        message:
          "Discord sending not configured: DISCORD_BOT_TOKEN is missing.",
      });
      continue;
    }
    if (!recipient.canSend || !recipient.recipientDiscordId) {
      results.push({
        ...recipient,
        status: "failed" as const,
        message: recipient.reason ?? "Recipient cannot receive lobby code.",
      });
      continue;
    }
    try {
      await sendDiscordDm(recipient.recipientDiscordId, recipient.message);
      results.push({
        ...recipient,
        status: "sent" as const,
        message: "Lobby code sent.",
      });
    } catch (error) {
      results.push({
        ...recipient,
        status: "failed" as const,
        message:
          error instanceof Error
            ? error.message
            : "Discord DM failed. The captain may block bot DMs.",
      });
    }
  }
  return { gameId, results };
}

async function listSubmissionRows(db: QueryExecutor, tournamentId?: number) {
  const base = db
    .select({
      submission: tournamentTeamSubmissions,
      tournament: tournaments,
      managedTeam: managedTeams,
      captain: users,
    })
    .from(tournamentTeamSubmissions)
    .innerJoin(
      tournaments,
      eq(tournamentTeamSubmissions.tournamentId, tournaments.id)
    )
    .innerJoin(
      managedTeams,
      eq(tournamentTeamSubmissions.managedTeamId, managedTeams.id)
    )
    .innerJoin(users, eq(managedTeams.captainUserId, users.id));
  const rows = tournamentId
    ? await base.where(eq(tournamentTeamSubmissions.tournamentId, tournamentId))
    : await base;
  const teamIds = rows.map(row => row.managedTeam.id);
  const roster = teamIds.length
    ? await db
        .select({ member: managedTeamMembers, user: users })
        .from(managedTeamMembers)
        .innerJoin(users, eq(managedTeamMembers.userId, users.id))
        .where(inArray(managedTeamMembers.teamId, teamIds))
    : [];
  return rows.map(row => ({
    ...row.submission,
    tournament: row.tournament,
    managedTeam: row.managedTeam,
    captain: row.captain,
    roster: roster
      .filter(member => member.member.teamId === row.managedTeam.id)
      .map(member => ({ ...member.member, user: member.user })),
  }));
}

async function approveSubmission(submissionId: number) {
  const db = await requireDb();
  const [resolved] = await db
    .select({ tournamentId: tournamentTeamSubmissions.tournamentId })
    .from(tournamentTeamSubmissions)
    .where(eq(tournamentTeamSubmissions.id, submissionId))
    .limit(1);
  if (!resolved)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team submission not found",
    });
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, resolved.tournamentId);
    const [row] = await tx
      .select({
        submission: tournamentTeamSubmissions,
        managedTeam: managedTeams,
      })
      .from(tournamentTeamSubmissions)
      .innerJoin(
        managedTeams,
        eq(tournamentTeamSubmissions.managedTeamId, managedTeams.id)
      )
      .where(eq(tournamentTeamSubmissions.id, submissionId))
      .limit(1);
    if (!row || row.submission.tournamentId !== resolved.tournamentId)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team submission not found",
      });
    const existing = await tx
      .select()
      .from(teams)
      .where(
        and(
          eq(teams.tournamentId, row.submission.tournamentId),
          eq(teams.managedTeamId, row.submission.managedTeamId)
        )
      )
      .limit(1);
    let changed = false;
    if (
      shouldCreateTournamentTeamForApproval({
        status: row.submission.status,
        existingTournamentTeamCount: existing.length,
      })
    ) {
      await assertTeamLimit(tx, row.submission.tournamentId);
      await assertUniqueTeamName(
        tx,
        row.submission.tournamentId,
        row.managedTeam.name
      );
      await tx.insert(teams).values({
        tournamentId: row.submission.tournamentId,
        managedTeamId: row.submission.managedTeamId,
        name: row.managedTeam.name,
        frp: 0,
      });
      changed = true;
    }
    if (
      row.submission.status !== "approved" ||
      row.submission.adminNote !== null
    ) {
      await tx
        .update(tournamentTeamSubmissions)
        .set({ status: "approved", adminNote: null })
        .where(eq(tournamentTeamSubmissions.id, submissionId));
      changed = true;
    }
    const activeViewerLink = await getActiveViewerLink(
      tx,
      row.submission.tournamentId
    );
    if (!activeViewerLink?.publicToken) {
      await ensureViewerLinkForApprovedSubmission(
        tx,
        row.submission.tournamentId,
        row.submission.submittedByUserId
      );
      changed = true;
    }
    if (changed) await incrementBoardRevision(tx, row.submission.tournamentId);
    return fetchTournamentRows(tx, row.submission.tournamentId);
  });
}

async function rejectSubmission(
  submissionId: number,
  adminNote: string | null | undefined
) {
  const db = await requireDb();
  const [submission] = await db
    .select({ tournamentId: tournamentTeamSubmissions.tournamentId })
    .from(tournamentTeamSubmissions)
    .where(eq(tournamentTeamSubmissions.id, submissionId))
    .limit(1);
  if (!submission)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Team submission not found",
    });
  return runBoardMutationAndFetch(submission.tournamentId, async tx => {
    const [current] = await tx
      .select()
      .from(tournamentTeamSubmissions)
      .where(eq(tournamentTeamSubmissions.id, submissionId))
      .limit(1);
    if (!current || current.tournamentId !== submission.tournamentId)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team submission not found",
      });
    const note = adminNote ?? null;
    if (current.status === "rejected" && current.adminNote === note)
      return false;
    await tx
      .update(tournamentTeamSubmissions)
      .set({ status: "rejected", adminNote: note })
      .where(eq(tournamentTeamSubmissions.id, submissionId));
  });
}

export async function assignTeamToGameSlot(
  gameId: number,
  teamId: number,
  preferredSlotIndex?: number
) {
  const tournamentId = await resolveGameTournamentId(gameId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const gameInTx = await getGameOrThrow(tx, gameId);
    const context = await fetchGameContext(tx, gameInTx.tournamentId);
    const slotIndex = resolveAssignmentSlot({
      game: gameInTx,
      assignments: context.assignments,
      preferredSlotIndex,
      teamId,
    });
    validateAssignmentPlan({
      ...context,
      targetGameId: gameId,
      teamId,
      slotIndex,
    });
    await tx
      .insert(tournamentGameAssignments)
      .values({ gameId, teamId, slotIndex });
  });
}

async function setAssignmentResultPlacement(
  assignmentId: number,
  resultPlacement: number | null
) {
  const tournamentId = await resolveAssignmentTournamentId(assignmentId);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const [row] = await tx
      .select({ assignment: tournamentGameAssignments, game: tournamentGames })
      .from(tournamentGameAssignments)
      .innerJoin(
        tournamentGames,
        eq(tournamentGameAssignments.gameId, tournamentGames.id)
      )
      .where(eq(tournamentGameAssignments.id, assignmentId))
      .limit(1);

    if (!row)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team assignment not found",
      });
    if (row.game.tournamentId !== tournamentId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Assignment belongs to another tournament.",
      });

    const capacity = gameCapacity[row.game.gameType];
    if (resultPlacement !== null && resultPlacement > capacity) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${row.game.gameType === "cashout" ? "Cashout lobbies" : "Final Round matches"} only support placements 1-${capacity}`,
      });
    }

    if (row.assignment.resultPlacement === resultPlacement) return false;

    if (resultPlacement !== null) {
      await tx.execute(
        sql`UPDATE tournament_game_assignments SET resultPlacement = NULL WHERE gameId = ${row.assignment.gameId} AND resultPlacement = ${resultPlacement} AND id <> ${assignmentId}`
      );
    }

    await tx.execute(
      sql`UPDATE tournament_game_assignments SET resultPlacement = ${resultPlacement} WHERE id = ${assignmentId}`
    );
  });
}

async function acceptTeamClaimLink(token: string, user: { id: number }) {
  const db = await requireDb();
  const tokenHash = hashToken(token);
  const [resolved] = await db
    .select({ tournamentId: teams.tournamentId })
    .from(tournamentTeamClaimLinks)
    .innerJoin(teams, eq(tournamentTeamClaimLinks.tournamentTeamId, teams.id))
    .where(eq(tournamentTeamClaimLinks.tokenHash, tokenHash))
    .limit(1);
  if (!resolved)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Claim link not found.",
    });

  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, resolved.tournamentId);
    const [row] = await tx
      .select({ link: tournamentTeamClaimLinks, team: teams })
      .from(tournamentTeamClaimLinks)
      .innerJoin(teams, eq(tournamentTeamClaimLinks.tournamentTeamId, teams.id))
      .where(eq(tournamentTeamClaimLinks.tokenHash, tokenHash))
      .limit(1);
    if (!row || row.team.tournamentId !== resolved.tournamentId)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Claim link not found.",
      });
    const state = getClaimLinkState(row.link);
    if (state.revoked)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This claim link has been revoked.",
      });
    if (state.claimed)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This claim link has already been used.",
      });
    if (state.expired)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This claim link has expired.",
      });
    if (row.team.managedTeamId)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This team is already managed.",
      });

    const baseSlug = createManagedTeamSlug(row.team.name);
    let slug = baseSlug;
    for (let i = 2; ; i++) {
      const existing = await tx
        .select({ id: managedTeams.id })
        .from(managedTeams)
        .where(eq(managedTeams.slug, slug))
        .limit(1);
      if (!existing.length) break;
      slug = `${baseSlug}-${i}`.slice(0, 80);
    }
    await tx
      .insert(managedTeams)
      .values({ name: row.team.name, slug, captainUserId: user.id });
    const [managedTeam] = await tx
      .select()
      .from(managedTeams)
      .where(eq(managedTeams.slug, slug))
      .limit(1);
    if (!managedTeam)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Managed team creation failed.",
      });
    await tx.insert(managedTeamMembers).values({
      teamId: managedTeam.id,
      userId: user.id,
      role: "captain",
    });
    await tx
      .update(teams)
      .set({ managedTeamId: managedTeam.id })
      .where(eq(teams.id, row.team.id));
    const claimResult = await tx.execute(sql`
      UPDATE tournament_team_claim_links
      SET status = 'claimed', claimedByUserId = ${user.id}, updatedAt = NOW()
      WHERE id = ${row.link.id}
        AND status = 'active'
        AND expiresAt > NOW()
    `);
    if (getAffectedRows(claimResult) !== 1)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This claim link has already been used.",
      });
    await incrementBoardRevision(tx, resolved.tournamentId);
    const board = await fetchTournamentRows(tx, resolved.tournamentId);
    return {
      success: true,
      managedTeamId: managedTeam.id,
      tournamentId: row.team.tournamentId,
      boardRevision: board.tournament.boardRevision,
      board,
    };
  });
}

export const discordTournamentStaffProcedure = publicProcedure.use(
  async ({ ctx, next }) => {
    await assertDiscordTournamentStaff(ctx);
    return next({ ctx: { ...ctx, user: ctx.user! } });
  }
);

async function listPersonalTournamentRows(
  db: QueryExecutor,
  user: { id: number; role: "user" | "admin" }
) {
  const rows = await listTournamentRows(db);
  if (user.role === "admin")
    return rows.map(row => ({
      ...row,
      staffRole:
        row.ownerUserId === user.id ? ("owner" as const) : ("admin" as const),
    }));
  const staffRows = await db
    .select({ tournamentId: tournamentStaffMembers.tournamentId })
    .from(tournamentStaffMembers)
    .where(eq(tournamentStaffMembers.userId, user.id));
  const staffIds = new Set(staffRows.map(row => row.tournamentId));
  return rows
    .filter(row => row.ownerUserId === user.id || staffIds.has(row.id))
    .map(row => ({
      ...row,
      staffRole:
        row.ownerUserId === user.id
          ? ("owner" as const)
          : ("collaborator" as const),
    }));
}

async function getActivePrivateInviteLink(
  db: QueryExecutor,
  tournamentId: number
) {
  const rows = await db
    .select()
    .from(tournamentPrivateInviteLinks)
    .where(
      and(
        eq(tournamentPrivateInviteLinks.tournamentId, tournamentId),
        eq(tournamentPrivateInviteLinks.status, "active")
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

async function listTournamentStaff(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getOwnedTournamentOrThrow(db, tournamentId, user);
  const members = await db
    .select({
      id: tournamentStaffMembers.id,
      role: tournamentStaffMembers.role,
      createdAt: tournamentStaffMembers.createdAt,
      user: {
        id: users.id,
        name: users.name,
        discordDisplayName: users.discordDisplayName,
        discordUsername: users.discordUsername,
      },
    })
    .from(tournamentStaffMembers)
    .innerJoin(users, eq(tournamentStaffMembers.userId, users.id))
    .where(eq(tournamentStaffMembers.tournamentId, tournamentId));
  const [activeInvite] = await db
    .select({
      id: tournamentStaffInviteLinks.id,
      status: tournamentStaffInviteLinks.status,
      expiresAt: tournamentStaffInviteLinks.expiresAt,
    })
    .from(tournamentStaffInviteLinks)
    .where(
      and(
        eq(tournamentStaffInviteLinks.tournamentId, tournamentId),
        eq(tournamentStaffInviteLinks.status, "active")
      )
    )
    .limit(1);
  return { members, activeInvite: activeInvite ?? null } as const;
}

async function removeTournamentStaffMember(
  tournamentId: number,
  memberId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getOwnedTournamentOrThrow(db, tournamentId, user);
  await db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    await tx
      .delete(tournamentStaffMembers)
      .where(
        and(
          eq(tournamentStaffMembers.tournamentId, tournamentId),
          eq(tournamentStaffMembers.id, memberId)
        )
      );
  });
  return listTournamentStaff(tournamentId, user);
}
async function getOrCreateStaffInviteLink(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getOwnedTournamentOrThrow(db, tournamentId, user);
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    const [existing] = await tx
      .execute(
        sql`
      SELECT id, expiresAt
      FROM tournament_staff_invite_links
      WHERE tournamentId = ${tournamentId}
        AND status = 'active'
        AND expiresAt > NOW()
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
    `
      )
      .then(result => readRows<{ id: number; expiresAt: Date }>(result));
    if (existing)
      return {
        path: null,
        url: null,
        expiresAt: existing.expiresAt,
        hasActiveInvite: true,
      } as const;

    await tx.execute(sql`
      UPDATE tournament_staff_invite_links
      SET status = 'revoked', updatedAt = NOW()
      WHERE tournamentId = ${tournamentId}
        AND status = 'active'
    `);

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + STAFF_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    await tx.insert(tournamentStaffInviteLinks).values({
      tournamentId,
      createdByUserId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    });
    return {
      path: createTokenPath("/TCR/staff/join", token),
      url: createTokenPath("/TCR/staff/join", token),
      expiresAt,
      hasActiveInvite: true,
    } as const;
  });
}

async function revokeStaffInviteLink(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getOwnedTournamentOrThrow(db, tournamentId, user);
  await db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    await tx
      .update(tournamentStaffInviteLinks)
      .set({ status: "revoked", updatedAt: sql`now()` })
      .where(
        and(
          eq(tournamentStaffInviteLinks.tournamentId, tournamentId),
          eq(tournamentStaffInviteLinks.status, "active")
        )
      );
  });
  return { success: true } as const;
}

async function regenerateStaffInviteLink(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getOwnedTournamentOrThrow(db, tournamentId, user);
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    await tx.execute(sql`
      UPDATE tournament_staff_invite_links
      SET status = 'revoked', updatedAt = NOW()
      WHERE tournamentId = ${tournamentId}
        AND status = 'active'
    `);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + STAFF_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    await tx.insert(tournamentStaffInviteLinks).values({
      tournamentId,
      createdByUserId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    });
    return {
      path: createTokenPath("/TCR/staff/join", token),
      url: createTokenPath("/TCR/staff/join", token),
      expiresAt,
      hasActiveInvite: true,
    } as const;
  });
}

async function previewStaffInvite(token: string) {
  const db = await requireDb();
  const tokenHash = hashToken(token);
  const [row] = await db
    .select({
      invite: tournamentStaffInviteLinks,
      tournament: tournaments,
      owner: users,
    })
    .from(tournamentStaffInviteLinks)
    .innerJoin(
      tournaments,
      eq(tournamentStaffInviteLinks.tournamentId, tournaments.id)
    )
    .leftJoin(users, eq(tournaments.ownerUserId, users.id))
    .where(eq(tournamentStaffInviteLinks.tokenHash, tokenHash))
    .limit(1);
  if (
    !row ||
    row.invite.status !== "active" ||
    row.invite.expiresAt <= new Date()
  )
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "This staff invite is invalid, expired, revoked, or already used.",
    });
  return {
    tournament: { id: row.tournament.id, name: row.tournament.name },
    owner: {
      name:
        row.owner?.discordDisplayName ??
        row.owner?.discordUsername ??
        row.owner?.name ??
        "Tournament owner",
    },
    expiresAt: row.invite.expiresAt,
  } as const;
}

async function acceptStaffInvite(
  token: string,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  const tokenHash = hashToken(token);
  return db.transaction(async tx => {
    const [row] = await tx
      .select({ invite: tournamentStaffInviteLinks, tournament: tournaments })
      .from(tournamentStaffInviteLinks)
      .innerJoin(
        tournaments,
        eq(tournamentStaffInviteLinks.tournamentId, tournaments.id)
      )
      .where(eq(tournamentStaffInviteLinks.tokenHash, tokenHash))
      .limit(1);
    if (!row)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "This staff invite is invalid.",
      });
    await lockTournamentForBoardMutation(tx, row.tournament.id);
    if (row.invite.status === "revoked")
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This staff invite has been revoked.",
      });
    if (row.invite.status === "accepted")
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This staff invite has already been used.",
      });
    if (row.invite.expiresAt <= new Date())
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This staff invite has expired.",
      });
    if (row.tournament.ownerUserId === user.id)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Tournament owners cannot accept their own staff invite.",
      });
    if (await hasTournamentStaffMembership(tx, row.tournament.id, user.id))
      throw new TRPCError({
        code: "CONFLICT",
        message: "You are already a collaborator for this tournament.",
      });

    const claimResult = await tx.execute(sql`
      UPDATE tournament_staff_invite_links
      SET status = 'accepted', acceptedByUserId = ${user.id}, updatedAt = NOW()
      WHERE id = ${row.invite.id}
        AND tokenHash = ${tokenHash}
        AND status = 'active'
        AND expiresAt > NOW()
    `);
    if (getAffectedRows(claimResult) !== 1)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This staff invite has already been used.",
      });

    await tx.insert(tournamentStaffMembers).values({
      tournamentId: row.tournament.id,
      userId: user.id,
      role: "collaborator",
      addedByUserId: row.invite.createdByUserId,
    });
    return { tournamentId: row.tournament.id } as const;
  });
}

async function getOrCreatePrivateInviteLink(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getManageableTournamentOrThrow(db, tournamentId, user);
  const existing = await getActivePrivateInviteLink(db, tournamentId);
  if (existing)
    return {
      path: createTokenPath("/tournaments/invite", existing.token),
      url: createTokenPath("/tournaments/invite", existing.token),
    } as const;
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    const active = await tx
      .select({ id: tournamentPrivateInviteLinks.id })
      .from(tournamentPrivateInviteLinks)
      .where(
        and(
          eq(tournamentPrivateInviteLinks.tournamentId, tournamentId),
          eq(tournamentPrivateInviteLinks.status, "active")
        )
      );
    if (active.length >= PERSONAL_TCR_LIMITS.activePrivateLinksPerTournament)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Private invite link limit reached.",
      });
    const token = randomBytes(32).toString("base64url");
    await tx
      .insert(tournamentPrivateInviteLinks)
      .values({ tournamentId, createdByUserId: user.id, token });
    return {
      path: createTokenPath("/tournaments/invite", token),
      url: createTokenPath("/tournaments/invite", token),
    } as const;
  });
}

async function regeneratePrivateInviteLink(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getMutableManageableTournamentOrThrow(db, tournamentId, user);
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    await tx
      .update(tournamentPrivateInviteLinks)
      .set({ status: "revoked", updatedAt: sql`now()` })
      .where(
        and(
          eq(tournamentPrivateInviteLinks.tournamentId, tournamentId),
          eq(tournamentPrivateInviteLinks.status, "active")
        )
      );
    const token = randomBytes(32).toString("base64url");
    await tx
      .insert(tournamentPrivateInviteLinks)
      .values({ tournamentId, createdByUserId: user.id, token });
    return {
      path: createTokenPath("/tournaments/invite", token),
      url: createTokenPath("/tournaments/invite", token),
    } as const;
  });
}

async function revokePrivateInviteLink(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getMutableManageableTournamentOrThrow(db, tournamentId, user);
  await db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, tournamentId);
    await tx
      .update(tournamentPrivateInviteLinks)
      .set({ status: "revoked", updatedAt: sql`now()` })
      .where(
        and(
          eq(tournamentPrivateInviteLinks.tournamentId, tournamentId),
          eq(tournamentPrivateInviteLinks.status, "active")
        )
      );
  });
  return { success: true } as const;
}

async function createTeamClaimLink(
  teamId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  const [team] = await db
    .select({ tournamentId: teams.tournamentId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team)
    throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, team.tournamentId);
    const [currentTeam] = await tx
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    if (!currentTeam || currentTeam.tournamentId !== team.tournamentId)
      throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
    if (currentTeam.managedTeamId)
      throw new TRPCError({
        code: "CONFLICT",
        message: "This team is already managed.",
      });
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(
      Date.now() + CLAIM_LINK_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    await tx.insert(tournamentTeamClaimLinks).values({
      tournamentTeamId: currentTeam.id,
      createdByUserId: user.id,
      tokenHash: hashToken(token),
      expiresAt,
    });
    return {
      path: createTokenPath("/teams/claim", token),
      url: createTokenPath("/teams/claim", token),
      expiresAt,
    };
  });
}

async function revokeTeamClaimLink(linkId: number) {
  const db = await requireDb();
  const [row] = await db
    .select({ team: teams })
    .from(tournamentTeamClaimLinks)
    .innerJoin(teams, eq(tournamentTeamClaimLinks.tournamentTeamId, teams.id))
    .where(eq(tournamentTeamClaimLinks.id, linkId))
    .limit(1);
  if (!row)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Claim link not found.",
    });
  return db.transaction(async tx => {
    await lockTournamentForBoardMutation(tx, row.team.tournamentId);
    const [current] = await tx
      .select({ link: tournamentTeamClaimLinks, team: teams })
      .from(tournamentTeamClaimLinks)
      .innerJoin(teams, eq(tournamentTeamClaimLinks.tournamentTeamId, teams.id))
      .where(eq(tournamentTeamClaimLinks.id, linkId))
      .limit(1);
    if (!current || current.team.tournamentId !== row.team.tournamentId)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Claim link not found.",
      });
    if (current.link.status === "revoked") return { success: true } as const;
    await tx
      .update(tournamentTeamClaimLinks)
      .set({ status: "revoked", updatedAt: sql`now()` })
      .where(eq(tournamentTeamClaimLinks.id, linkId));
    return { success: true } as const;
  });
}

async function setTournamentVisibility(
  tournamentId: number,
  visibility: "private" | "public",
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getMutableManageableTournamentOrThrow(db, tournamentId, user);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const [fullTournament] = await tx
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!fullTournament)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tournament not found",
      });
    const publicSlug =
      visibility === "public"
        ? (fullTournament.publicSlug ??
          (await createUniquePublicSlug(tx, fullTournament.name)))
        : fullTournament.publicSlug;
    if (
      fullTournament.visibility === visibility &&
      fullTournament.publicSlug === publicSlug
    )
      return false;
    await tx
      .update(tournaments)
      .set({ visibility, publicSlug })
      .where(eq(tournaments.id, tournamentId));
  });
}

async function publishTournament(
  tournamentId: number,
  publish: boolean,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  await getMutableManageableTournamentOrThrow(db, tournamentId, user);
  return runBoardMutationAndFetch(tournamentId, async tx => {
    const [tournament] = await tx
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tournament not found",
      });
    let publicSlug = tournament.publicSlug;
    if (publish && tournament.visibility !== "public")
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Set visibility to public before publishing.",
      });
    if (publish && !publicSlug)
      publicSlug = await createUniquePublicSlug(tx, tournament.name);
    if (
      (publish &&
        tournament.publishedAt &&
        tournament.publicSlug === publicSlug) ||
      (!publish && !tournament.publishedAt)
    )
      return false;
    await tx
      .update(tournaments)
      .set({ publicSlug, publishedAt: publish ? sql`now()` : null })
      .where(eq(tournaments.id, tournamentId));
  });
}

async function listCommunityTournaments() {
  // Public, read-only listing: degrade to an empty result when the database
  // isn't configured (mirrors getTournamentHistory's pattern in server/db.ts)
  // instead of throwing, since "no tournaments to show" is an honest
  // representation of a degraded directory. Unlike getBySlug/getResultsArchive,
  // there's no specific requested resource here to mis-report.
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot list community tournaments: database not available"
    );
    return [];
  }
  return db
    .select({
      id: tournaments.id,
      name: tournaments.name,
      eventNote: tournaments.eventNote,
      eventStatus: tournaments.eventStatus,
      registrationOpen: tournaments.registrationOpen,
      publicSlug: tournaments.publicSlug,
      publishedAt: tournaments.publishedAt,
      maxTeams: tournaments.maxTeams,
      owner: {
        id: users.id,
        name: users.name,
        discordDisplayName: users.discordDisplayName,
        discordUsername: users.discordUsername,
      },
    })
    .from(tournaments)
    .leftJoin(users, eq(tournaments.ownerUserId, users.id))
    .where(
      and(
        eq(tournaments.visibility, "public"),
        sql`${tournaments.publishedAt} IS NOT NULL`
      )
    );
}

function getArchivedResultsPath(tournamentId: number) {
  return `/tournament-results/${tournamentId}`;
}

type FinalizationSummary = {
  tournamentId: number;
  finalizedAt: Date | null;
  boardRevision: number | null;
  champion: { teamId: number; teamName: string } | null;
  resultsPath: string;
};

async function getFinalizationSummary(
  db: QueryExecutor,
  tournamentId: number
): Promise<FinalizationSummary> {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  const [champion] = await db
    .select()
    .from(tournamentTeamResults)
    .where(
      and(
        eq(tournamentTeamResults.tournamentId, tournamentId),
        eq(tournamentTeamResults.isChampion, 1)
      )
    )
    .limit(1);
  return {
    tournamentId,
    finalizedAt: tournament?.finalizedAt ?? null,
    boardRevision: tournament?.boardRevision ?? null,
    champion: champion
      ? {
          teamId: champion.tournamentTeamId,
          teamName: champion.teamNameSnapshot,
        }
      : null,
    resultsPath: getArchivedResultsPath(tournamentId),
  };
}

function findChampionGame(input: {
  games: Array<{
    id: number;
    gameType: TournamentGameType;
    status: string;
    displayLabel: string;
  }>;
  connections: ControlGameConnection[];
  assignments: AssignmentResultRow[];
}) {
  const sourceIds = new Set(
    input.connections.map(connection => connection.sourceGameId)
  );
  const terminalFinals = input.games.filter(
    game =>
      game.gameType === "final_round" &&
      game.status === "complete" &&
      !sourceIds.has(game.id) &&
      input.assignments.some(assignment => assignment.gameId === game.id)
  );
  if (terminalFinals.length === 0)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The championship winner could not be determined.",
    });
  if (terminalFinals.length > 1)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Multiple possible championship matches were found.",
    });
  const championAssignments = input.assignments.filter(
    assignment =>
      assignment.gameId === terminalFinals[0]!.id &&
      assignment.resultPlacement === 1
  );
  if (championAssignments.length !== 1)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The championship winner could not be determined.",
    });
  return {
    game: terminalFinals[0]!,
    championTeamId: championAssignments[0]!.teamId,
  };
}

function validateFinalizationData(
  data: Awaited<ReturnType<typeof fetchTournamentRows>>
) {
  if (data.teams.length === 0)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The tournament must contain teams before it can be finalized.",
    });
  if (data.games.length === 0)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        "The tournament must contain tournament games before it can be finalized.",
    });
  const teamsById = new Map(data.teams.map(team => [team.id, team] as const));
  for (const game of data.games) {
    const gameAssignments = data.assignments.filter(
      assignment => assignment.gameId === game.id
    );
    if (gameAssignments.length === 0) continue;
    if (game.status !== "complete")
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `${game.displayLabel} is not complete.`,
      });
    const validPlacements = new Set<number>(
      getValidPlacementsForGameType(game.gameType)
    );
    const seen = new Set<number>();
    for (const assignment of gameAssignments) {
      const teamName =
        teamsById.get(assignment.teamId)?.name ?? "Assigned team";
      if (assignment.resultPlacement == null)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${game.displayLabel} is missing a placement for ${teamName}.`,
        });
      if (!validPlacements.has(assignment.resultPlacement))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${game.displayLabel} has an invalid placement for ${teamName}.`,
        });
      if (seen.has(assignment.resultPlacement))
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${game.displayLabel} has duplicate placement ${assignment.resultPlacement}.`,
        });
      seen.add(assignment.resultPlacement);
    }
  }
  return findChampionGame({
    games: data.games,
    connections: data.connections,
    assignments: data.assignments,
  });
}

async function finalizeTournament(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  const db = await requireDb();
  return db.transaction(async tx => {
    const lockedTournament = await lockTournamentRow(tx, tournamentId);
    if (user.role !== "admin" && lockedTournament.ownerUserId !== user.id)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the tournament owner can finalize this tournament.",
      });
    if (lockedTournament.finalizedAt)
      return getFinalizationSummary(tx, tournamentId);

    const data = await fetchTournamentRows(tx, tournamentId);
    const { championTeamId } = validateFinalizationData(data);
    const scoreboard = calculateTournamentScoreboard(
      data.teams,
      data.games,
      data.assignments
    );
    const scoreByTeamId = new Map(
      scoreboard.map(row => [row.teamId, row] as const)
    );
    const finalPlacementByTeamId = new Map<number, number>();
    for (const assignment of data.assignments) {
      const game = data.games.find(row => row.id === assignment.gameId);
      if (game?.gameType === "final_round" && assignment.resultPlacement)
        finalPlacementByTeamId.set(
          assignment.teamId,
          assignment.resultPlacement
        );
    }
    for (const team of data.teams) {
      const row = scoreByTeamId.get(team.id);
      const finalPlacement =
        team.id === championTeamId
          ? 1
          : (finalPlacementByTeamId.get(team.id) ?? null);
      await tx.execute(
        sql`INSERT INTO tournament_team_results (tournamentId, tournamentTeamId, managedTeamId, teamNameSnapshot, scoreSnapshot, totalWins, totalLosses, cashoutWins, cashoutLosses, finalRoundWins, finalRoundLosses, finalPlacement, isChampion, createdAt, updatedAt) VALUES (${tournamentId}, ${team.id}, ${team.managedTeamId ?? null}, ${team.name}, ${team.frp}, ${row?.wins ?? 0}, ${row?.losses ?? 0}, ${row?.cashoutWins ?? 0}, ${row?.cashoutLosses ?? 0}, ${row?.finalRoundWins ?? 0}, ${row?.finalRoundLosses ?? 0}, ${finalPlacement}, ${team.id === championTeamId ? 1 : 0}, NOW(), NOW()) ON DUPLICATE KEY UPDATE managedTeamId = VALUES(managedTeamId), teamNameSnapshot = VALUES(teamNameSnapshot), scoreSnapshot = VALUES(scoreSnapshot), totalWins = VALUES(totalWins), totalLosses = VALUES(totalLosses), cashoutWins = VALUES(cashoutWins), cashoutLosses = VALUES(cashoutLosses), finalRoundWins = VALUES(finalRoundWins), finalRoundLosses = VALUES(finalRoundLosses), finalPlacement = VALUES(finalPlacement), isChampion = VALUES(isChampion), updatedAt = NOW()`
      );
    }
    await tx
      .update(tournaments)
      .set({
        eventStatus: "complete",
        currentStage: "finished",
        finalizedAt: sql`now()`,
        finalizedByUserId: user.id,
        unlockedAt: null,
        unlockedByUserId: null,
      })
      .where(eq(tournaments.id, tournamentId));
    await incrementBoardRevision(tx, tournamentId);
    return getFinalizationSummary(tx, tournamentId);
  });
}

async function unlockTournamentForEditing(
  tournamentId: number,
  user: { id: number; role: "user" | "admin" }
) {
  if (user.role !== "admin")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only site administrators can unlock finalized tournaments.",
    });
  const db = await requireDb();
  return db.transaction(async tx => {
    const rows = readRows<{
      id: number;
      finalizedAt: Date | null;
    }>(
      await tx.execute(
        sql`SELECT id, finalizedAt FROM tournaments WHERE id = ${tournamentId} FOR UPDATE`
      )
    );
    const [tournament] = rows;
    if (!tournament)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Tournament not found",
      });
    if (!tournament.finalizedAt) return fetchTournamentRows(tx, tournamentId);
    await tx
      .update(tournaments)
      .set({
        finalizedAt: null,
        finalizedByUserId: null,
        unlockedAt: sql`now()`,
        unlockedByUserId: user.id,
        eventStatus: "live",
      })
      .where(eq(tournaments.id, tournamentId));
    await incrementBoardRevision(tx, tournamentId);
    return fetchTournamentRows(tx, tournamentId);
  });
}

export const personalTcrProcedure = personalTcrAlphaProcedure;

export const personalTcrRouter = router({
  listTournaments: personalTcrProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return listPersonalTournamentRows(db, ctx.user);
  }),
  listTemplates: personalTcrProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return listTemplates(db, ctx.user.id);
  }),
  createTournament: personalTcrProcedure
    .input(
      createTournamentSchema.extend({
        visibility: z.enum(["private", "public"]).default("private"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertPersonalTournamentLimit(db, ctx.user);
      const publicSlug =
        input.visibility === "public"
          ? await createUniquePublicSlug(db, input.name)
          : null;
      const insertResult = await db.insert(tournaments).values({
        name: input.name,
        eventStatus: input.eventStatus,
        currentCycle: input.currentCycle,
        currentStage: input.currentStage,
        currentMatch: input.currentMatch,
        eventNote: input.eventNote ?? null,
        visibility: input.visibility,
        publicSlug,
        publishedAt: null,
        ownerUserId: ctx.user.id,
      });
      const tournamentId = requireInsertId(
        insertResult,
        "Tournament creation failed"
      );
      const [createdTournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, tournamentId))
        .limit(1);
      return {
        createdTournament,
        tournaments: await listPersonalTournamentRows(db, ctx.user),
      };
    }),
  createTournamentFromTemplate: personalTcrProcedure
    .input(
      z.object({
        templateId: idSchema,
        name: z.string().trim().min(2).max(255),
        visibility: z.enum(["private", "public"]).default("private"),
      })
    )
    .mutation(async ({ input, ctx }) =>
      createTournamentFromTemplate(
        {
          templateId: input.templateId,
          name: input.name,
          visibility: input.visibility,
        },
        ctx.user
      )
    ),
  renameTemplate: personalTcrProcedure
    .input(
      z.object({
        templateId: idSchema,
        name: z.string().trim().min(2).max(120),
      })
    )
    .mutation(({ input, ctx }) =>
      renameTemplate(input.templateId, input.name, ctx.user)
    ),
  setTemplateVisibility: personalTcrProcedure
    .input(
      z.object({ templateId: idSchema, visibility: templateVisibilitySchema })
    )
    .mutation(({ input, ctx }) =>
      setTemplateVisibility(input.templateId, input.visibility, ctx.user)
    ),
  deleteTemplate: personalTcrProcedure
    .input(z.object({ templateId: idSchema }))
    .mutation(({ input, ctx }) => deleteTemplate(input.templateId, ctx.user)),
  get: personalTcrProcedure
    .input(tournamentIdSchema)
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return fetchTournamentRows(db, input.tournamentId);
    }),
  renameTournament: personalTcrProcedure
    .input(
      tournamentIdSchema.extend({ name: z.string().trim().min(2).max(255) })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return updateTournamentName(input.tournamentId, input.name);
    }),
  finalizeTournament: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(({ input, ctx }) =>
      finalizeTournament(input.tournamentId, ctx.user)
    ),
  unlockTournamentForEditing: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(({ input, ctx }) =>
      unlockTournamentForEditing(input.tournamentId, ctx.user)
    ),
  deleteTournament: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getOwnedTournamentOrThrow(db, input.tournamentId, ctx.user);
      return deleteTournament(input.tournamentId);
    }),
  setTournamentRegistrationOpen: personalTcrProcedure
    .input(tournamentIdSchema.extend({ registrationOpen: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getMutableManageableTournamentOrThrow(
        db,
        input.tournamentId,
        ctx.user
      );
      return setTournamentRegistrationOpenAndFetch(
        input.tournamentId,
        input.registrationOpen
      );
    }),
  setTournamentVisibility: personalTcrProcedure
    .input(
      tournamentIdSchema.extend({ visibility: z.enum(["private", "public"]) })
    )
    .mutation(({ input, ctx }) =>
      setTournamentVisibility(input.tournamentId, input.visibility, ctx.user)
    ),
  publishTournament: personalTcrProcedure
    .input(tournamentIdSchema.extend({ publish: z.boolean() }))
    .mutation(({ input, ctx }) =>
      publishTournament(input.tournamentId, input.publish, ctx.user)
    ),
  getPrivateInviteLink: personalTcrProcedure
    .input(tournamentIdSchema)
    .query(({ input, ctx }) =>
      getOrCreatePrivateInviteLink(input.tournamentId, ctx.user)
    ),
  regeneratePrivateInviteLink: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(async ({ input, ctx }) => {
      return regeneratePrivateInviteLink(input.tournamentId, ctx.user);
    }),
  listStaff: personalTcrProcedure
    .input(tournamentIdSchema)
    .query(({ input, ctx }) =>
      listTournamentStaff(input.tournamentId, ctx.user)
    ),
  removeStaffMember: personalTcrProcedure
    .input(tournamentIdSchema.extend({ memberId: idSchema }))
    .mutation(({ input, ctx }) =>
      removeTournamentStaffMember(input.tournamentId, input.memberId, ctx.user)
    ),
  getStaffInviteLink: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(({ input, ctx }) =>
      getOrCreateStaffInviteLink(input.tournamentId, ctx.user)
    ),
  regenerateStaffInviteLink: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(async ({ input, ctx }) => {
      return regenerateStaffInviteLink(input.tournamentId, ctx.user);
    }),
  revokeStaffInviteLink: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(({ input, ctx }) =>
      revokeStaffInviteLink(input.tournamentId, ctx.user)
    ),
  previewStaffInvite: personalTcrProcedure
    .input(z.object({ token: tokenSchema }))
    .query(({ input }) => previewStaffInvite(input.token)),
  acceptStaffInvite: personalTcrProcedure
    .input(z.object({ token: tokenSchema }))
    .mutation(({ input, ctx }) => acceptStaffInvite(input.token, ctx.user)),
  enableViewerLink: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return getOrCreateViewerLink(input.tournamentId, ctx.user.id);
    }),
  regenerateViewerLink: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return regenerateViewerLink(input.tournamentId, ctx.user.id);
    }),
  listTeamSubmissions: personalTcrProcedure
    .input(z.object({ tournamentId: idSchema.optional() }).optional())
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      if (input?.tournamentId)
        await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      const rows = await listSubmissionRows(db, input?.tournamentId);
      if (ctx.user.role === "admin") return rows;
      const staffRows = await db
        .select({ tournamentId: tournamentStaffMembers.tournamentId })
        .from(tournamentStaffMembers)
        .where(eq(tournamentStaffMembers.userId, ctx.user.id));
      const staffedIds = new Set(staffRows.map(row => row.tournamentId));
      return rows.filter(
        row =>
          row.tournament.ownerUserId === ctx.user.id ||
          staffedIds.has(row.tournament.id)
      );
    }),
  approveTeamSubmission: personalTcrProcedure
    .input(z.object({ submissionId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [submission] = await db
        .select()
        .from(tournamentTeamSubmissions)
        .where(eq(tournamentTeamSubmissions.id, input.submissionId))
        .limit(1);
      if (!submission)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team submission not found",
        });
      await getManageableTournamentOrThrow(
        db,
        submission.tournamentId,
        ctx.user
      );
      return approveSubmission(input.submissionId);
    }),
  rejectTeamSubmission: personalTcrProcedure
    .input(z.object({ submissionId: idSchema, adminNote: adminNoteSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [submission] = await db
        .select()
        .from(tournamentTeamSubmissions)
        .where(eq(tournamentTeamSubmissions.id, input.submissionId))
        .limit(1);
      if (!submission)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team submission not found",
        });
      await getManageableTournamentOrThrow(
        db,
        submission.tournamentId,
        ctx.user
      );
      return rejectSubmission(input.submissionId, input.adminNote);
    }),
  createTeam: personalTcrProcedure
    .input(tournamentIdSchema.extend({ name: teamNameSchema, frp: frpSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getMutableManageableTournamentOrThrow(
        db,
        input.tournamentId,
        ctx.user
      );
      return createTournamentTeamAndFetch({ ...input, user: ctx.user });
    }),
  deleteTeam: personalTcrProcedure
    .input(tournamentIdSchema.extend({ teamId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getMutableManageableTournamentOrThrow(
        db,
        input.tournamentId,
        ctx.user
      );
      return deleteTournamentTeam(input.tournamentId, input.teamId);
    }),
  createCashoutLobby: personalTcrProcedure
    .input(tournamentIdSchema.extend({ position: positionSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getMutableManageableTournamentOrThrow(
        db,
        input.tournamentId,
        ctx.user
      );
      return createGame(
        input.tournamentId,
        "cashout",
        input.position,
        ctx.user
      );
    }),
  createFinalRoundMatch: personalTcrProcedure
    .input(tournamentIdSchema.extend({ position: positionSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getMutableManageableTournamentOrThrow(
        db,
        input.tournamentId,
        ctx.user
      );
      return createGame(
        input.tournamentId,
        "final_round",
        input.position,
        ctx.user
      );
    }),
  renameGame: personalTcrProcedure
    .input(gameIdSchema.extend({ displayLabel: labelSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return updateGameFieldAndFetch(
        input.gameId,
        () => ({ displayLabel: input.displayLabel }),
        { requireMutable: true }
      );
    }),
  moveGame: personalTcrProcedure
    .input(gameIdSchema.extend({ position: positionSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return updateGameFieldAndFetch(input.gameId, game => {
        assertGamePositionUnlocked(game);
        const safePosition = clampCanvasPosition(input.position);
        return { canvasX: safePosition.x, canvasY: safePosition.y };
      });
    }),
  moveGames: personalTcrProcedure
    .input(
      tournamentIdSchema.extend({
        positions: z
          .array(gameIdSchema.extend({ position: positionSchema }))
          .min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return moveGames(input);
    }),
  setLobbyCode: personalTcrProcedure
    .input(gameIdSchema.extend({ lobbyCode: lobbyCodeSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return updateGameFieldAndFetch(
        input.gameId,
        () => ({ privateLobbyCode: input.lobbyCode }),
        { requireMutable: true }
      );
    }),
  setGameMap: personalTcrProcedure
    .input(gameIdSchema.extend({ mapId: userSelectedMapIdSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return updateGameFieldAndFetch(input.gameId, () => ({
        mapId: input.mapId,
      }));
    }),
  setBroadcastUrl: personalTcrProcedure
    .input(gameIdSchema.extend({ broadcastUrl: broadcastUrlSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return updateGameFieldAndFetch(input.gameId, () => ({
        broadcastUrl: input.broadcastUrl,
      }));
    }),
  setFinalRoundSeriesBestOf: personalTcrProcedure
    .input(gameIdSchema.extend({ seriesBestOf: seriesBestOfSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return updateGameFieldAndFetch(
        input.gameId,
        () => ({ seriesBestOf: input.seriesBestOf }),
        { requireMutable: true, requireFinalRound: true }
      );
    }),
  randomizeGameMap: personalTcrProcedure
    .input(gameIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return randomizeGameMap(db, input.gameId);
    }),
  connectGames: personalTcrProcedure
    .input(
      tournamentIdSchema.extend({
        sourceGameId: idSchema,
        targetGameId: idSchema,
        flowType: connectionFlowTypeSchema.default("winner"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return connectGames(
        input.tournamentId,
        input.sourceGameId,
        input.targetGameId,
        input.flowType
      );
    }),
  deleteGameConnection: personalTcrProcedure
    .input(z.object({ connectionId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertConnectionBelongsToOwnedTournament(
        db,
        input.connectionId,
        ctx.user
      );
      return deleteGameConnection(input.connectionId);
    }),
  clearTournamentConnections: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return clearTournamentConnections(input.tournamentId);
    }),
  returnTournamentTeamsToAvailable: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return returnTournamentTeamsToAvailable(input.tournamentId);
    }),
  clearTournamentCanvas: personalTcrProcedure
    .input(tournamentIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return clearTournamentCanvas(input.tournamentId);
    }),
  restoreTournamentBoardSnapshot: personalTcrProcedure
    .input(tournamentIdSchema.extend({ snapshot: boardSnapshotSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return restoreTournamentBoardSnapshot(input.tournamentId, input.snapshot);
    }),
  updateStatus: personalTcrProcedure
    .input(gameIdSchema.extend({ status: z.enum(tournamentGameStatuses) }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return updateGameStatusAndFetch(input.gameId, input.status);
    }),
  setAssignmentResultPlacement: personalTcrProcedure
    .input(
      z.object({
        assignmentId: idSchema,
        resultPlacement: resultPlacementSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertAssignmentBelongsToOwnedTournament(
        db,
        input.assignmentId,
        ctx.user
      );
      return setAssignmentResultPlacement(
        input.assignmentId,
        input.resultPlacement
      );
    }),
  assignTeam: personalTcrProcedure
    .input(
      gameIdSchema.extend({
        teamId: idSchema,
        slotIndex: z.number().int().positive().optional(),
        preferredSlotIndex: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return assignTeamToGameSlot(
        input.gameId,
        input.teamId,
        input.preferredSlotIndex ?? input.slotIndex
      );
    }),
  moveTeam: personalTcrProcedure
    .input(
      gameIdSchema.extend({
        teamId: idSchema,
        toGameId: idSchema,
        slotIndex: z.number().int().positive().optional(),
        preferredSlotIndex: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      await assertGameBelongsToOwnedTournament(db, input.toGameId, ctx.user);
      return moveTeamBetweenGamesAndFetch({
        gameId: input.gameId,
        teamId: input.teamId,
        toGameId: input.toGameId,
        preferredSlotIndex: input.preferredSlotIndex ?? input.slotIndex,
      });
    }),

  autoFillLobby: personalTcrProcedure
    .input(gameIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return autoFillLobby(input.gameId);
    }),
  updateRoundGroup: personalTcrProcedure
    .input(
      tournamentIdSchema.extend({
        gameIds: z.array(idSchema).min(1),
        label: roundLabelSchema.optional(),
        roundGroupId: roundGroupIdSchema.optional(),
        color: roundColorSchema.optional(),
        mode: z.enum(["create", "add", "rename", "remove", "color"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return updateRoundGroup(input);
    }),
  setRoundGroupLocked: personalTcrProcedure
    .input(
      tournamentIdSchema.extend({
        roundGroupId: roundGroupIdSchema,
        locked: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getMutableManageableTournamentOrThrow(
        db,
        input.tournamentId,
        ctx.user
      );
      return setRoundGroupLocked(input);
    }),
  removeTeam: personalTcrProcedure
    .input(gameIdSchema.extend({ teamId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return deleteGameAssignmentAndFetch(input.gameId, input.teamId);
    }),
  removeAssignedTeams: personalTcrProcedure
    .input(gameIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return deleteGameAssignmentAndFetch(input.gameId);
    }),
  deleteGame: personalTcrProcedure
    .input(gameIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return deleteGameAndFetch(input.gameId);
    }),
  saveTemplateFromTournament: personalTcrProcedure
    .input(
      tournamentIdSchema.extend({
        name: z.string().trim().min(2).max(120),
        visibility: templateVisibilitySchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await getManageableTournamentOrThrow(db, input.tournamentId, ctx.user);
      return saveTemplateFromTournament(input, ctx.user.id);
    }),
  createTeamClaimLink: personalTcrProcedure
    .input(z.object({ teamId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);
      if (!team)
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
      await getMutableManageableTournamentOrThrow(
        db,
        team.tournamentId,
        ctx.user
      );
      return createTeamClaimLink(input.teamId, ctx.user);
    }),
  listTeamClaimLinks: personalTcrProcedure
    .input(z.object({ teamId: idSchema }))
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, input.teamId))
        .limit(1);
      if (!team)
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found." });
      await getManageableTournamentOrThrow(db, team.tournamentId, ctx.user);
      const rows = await db
        .select()
        .from(tournamentTeamClaimLinks)
        .where(eq(tournamentTeamClaimLinks.tournamentTeamId, input.teamId));
      return rows.map(link => ({ ...link, state: getClaimLinkState(link) }));
    }),
  revokeTeamClaimLink: personalTcrProcedure
    .input(z.object({ linkId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [row] = await db
        .select({ team: teams })
        .from(tournamentTeamClaimLinks)
        .innerJoin(
          teams,
          eq(tournamentTeamClaimLinks.tournamentTeamId, teams.id)
        )
        .where(eq(tournamentTeamClaimLinks.id, input.linkId))
        .limit(1);
      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Claim link not found.",
        });
      await getMutableManageableTournamentOrThrow(
        db,
        row.team.tournamentId,
        ctx.user
      );
      return revokeTeamClaimLink(input.linkId);
    }),
  previewLobbyCodeRecipients: personalTcrProcedure
    .input(gameIdSchema)
    .query(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      return getLobbyCodeRecipients(db, input.gameId);
    }),
  sendLobbyCodeToTeamLeader: personalTcrProcedure
    .input(gameIdSchema.extend({ teamId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      await releaseLobbyCodeDeliveries(input.gameId, ctx.user.id, input.teamId);
      return sendLobbyCode(input.gameId, input.teamId);
    }),
  sendLobbyCodeToLobbyLeaders: personalTcrProcedure
    .input(gameIdSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await assertGameBelongsToOwnedTournament(db, input.gameId, ctx.user);
      await releaseLobbyCodeDeliveries(input.gameId, ctx.user.id);
      return sendLobbyCode(input.gameId);
    }),
});

export const communityTournamentsRouter = router({
  list: publicProcedure.query(() => listCommunityTournaments()),
  getResultsArchive: publicProcedure
    .input(tournamentIdSchema)
    .query(async ({ input, ctx }) => {
      const db = await requireDbForPublicRead(
        `getResultsArchive(tournamentId=${input.tournamentId})`
      );
      const [tournament] = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, input.tournamentId))
        .limit(1);
      if (!tournament?.finalizedAt)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Finalized results not found.",
        });
      if (tournament.visibility !== "public") {
        const user = ctx.user;
        const isManager =
          user &&
          (user.role === "admin" ||
            tournament.ownerUserId === user.id ||
            (await hasTournamentStaffMembership(
              db,
              input.tournamentId,
              user.id
            )));
        const memberRows = user
          ? await db
              .select({ id: managedTeamMembers.id })
              .from(tournamentTeamResults)
              .innerJoin(
                managedTeamMembers,
                eq(
                  tournamentTeamResults.managedTeamId,
                  managedTeamMembers.teamId
                )
              )
              .where(
                and(
                  eq(tournamentTeamResults.tournamentId, input.tournamentId),
                  eq(managedTeamMembers.userId, user.id)
                )
              )
              .limit(1)
          : [];
        if (!isManager && memberRows.length === 0)
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Private tournament results require an authorized team or manager view.",
          });
      }
      const results = await db
        .select()
        .from(tournamentTeamResults)
        .where(eq(tournamentTeamResults.tournamentId, input.tournamentId));
      return {
        tournament: {
          id: tournament.id,
          name: tournament.name,
          finalizedAt: tournament.finalizedAt,
        },
        results: results.sort(
          (a, b) =>
            (a.finalPlacement ?? 999) - (b.finalPlacement ?? 999) ||
            b.totalWins - a.totalWins
        ),
      };
    }),
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string().trim().min(1).max(120) }))
    .query(async ({ input }) => {
      const db = await requireDbForPublicRead(`getBySlug(slug=${input.slug})`);
      const [row] = await db
        .select({ tournament: tournaments, owner: users })
        .from(tournaments)
        .leftJoin(users, eq(tournaments.ownerUserId, users.id))
        .where(
          and(
            eq(tournaments.publicSlug, input.slug),
            eq(tournaments.visibility, "public"),
            sql`${tournaments.publishedAt} IS NOT NULL`
          )
        )
        .limit(1);
      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Tournament not found.",
        });
      const approvedTeams = await db
        .select({ id: teams.id, name: teams.name })
        .from(teams)
        .where(eq(teams.tournamentId, row.tournament.id));
      return {
        tournament: {
          id: row.tournament.id,
          name: row.tournament.name,
          eventNote: row.tournament.eventNote,
          eventStatus: row.tournament.eventStatus,
          registrationOpen: row.tournament.registrationOpen,
          publicSlug: row.tournament.publicSlug,
          maxTeams: row.tournament.maxTeams,
        },
        organizer: row.owner
          ? {
              name:
                row.owner.discordDisplayName ??
                row.owner.discordUsername ??
                row.owner.name,
            }
          : null,
        approvedTeams,
      };
    }),
});

export const tournamentControlRouter = router({
  listTemplates: discordTournamentStaffProcedure.query(async ({ ctx }) => {
    const db = await requireDb();
    return listTemplates(db, ctx.user.id);
  }),
  saveTemplateFromTournament: discordTournamentStaffProcedure
    .input(
      tournamentIdSchema.extend({
        name: z.string().trim().min(2).max(120),
        visibility: templateVisibilitySchema,
      })
    )
    .mutation(({ input, ctx }) =>
      saveTemplateFromTournament(input, ctx.user.id)
    ),
  createTournamentFromTemplate: discordTournamentStaffProcedure
    .input(
      z.object({
        templateId: idSchema,
        name: z.string().trim().min(2).max(255),
      })
    )
    .mutation(({ input, ctx }) =>
      createTournamentFromTemplate(input, ctx.user)
    ),
  enableViewerLink: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input, ctx }) =>
      getOrCreateViewerLink(input.tournamentId, ctx.user.id)
    ),
  regenerateViewerLink: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input, ctx }) =>
      regenerateViewerLink(input.tournamentId, ctx.user.id)
    ),
  getViewer: publicProcedure
    .input(z.object({ token: tokenSchema }))
    .query(({ input }) => getViewerDataByToken(input.token)),
  getTeamClaimLinkPreview: publicProcedure
    .input(z.object({ token: tokenSchema }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const [row] = await db
        .select({
          link: tournamentTeamClaimLinks,
          team: teams,
          tournament: tournaments,
        })
        .from(tournamentTeamClaimLinks)
        .innerJoin(
          teams,
          eq(tournamentTeamClaimLinks.tournamentTeamId, teams.id)
        )
        .innerJoin(tournaments, eq(teams.tournamentId, tournaments.id))
        .where(eq(tournamentTeamClaimLinks.tokenHash, hashToken(input.token)))
        .limit(1);
      if (!row)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Claim link not found.",
        });
      const state = getClaimLinkState(row.link);
      return {
        teamName: row.team.name,
        tournamentName: row.tournament.name,
        expiresAt: row.link.expiresAt,
        ...state,
      };
    }),
  acceptTeamClaimLink: protectedProcedure
    .input(z.object({ token: tokenSchema }))
    .mutation(({ input, ctx }) => acceptTeamClaimLink(input.token, ctx.user)),
  listTournaments: discordTournamentStaffProcedure.query(async () => {
    const db = await requireDb();
    return listTournamentRows(db);
  }),
  listOwnerCandidates: discordTournamentStaffProcedure.query(async () => {
    const db = await requireDb();
    return listOwnerCandidates(db);
  }),
  setTournamentRegistrationOpen: discordTournamentStaffProcedure
    .input(tournamentIdSchema.extend({ registrationOpen: z.boolean() }))
    .mutation(({ input }) =>
      setTournamentRegistrationOpenAndFetch(
        input.tournamentId,
        input.registrationOpen
      )
    ),
  listTeamSubmissions: discordTournamentStaffProcedure
    .input(z.object({ tournamentId: idSchema.optional() }).optional())
    .query(async ({ input }) => {
      const db = await requireDb();
      return listSubmissionRows(db, input?.tournamentId);
    }),
  approveTeamSubmission: discordTournamentStaffProcedure
    .input(z.object({ submissionId: idSchema }))
    .mutation(({ input }) => approveSubmission(input.submissionId)),
  rejectTeamSubmission: discordTournamentStaffProcedure
    .input(z.object({ submissionId: idSchema, adminNote: adminNoteSchema }))
    .mutation(({ input }) =>
      rejectSubmission(input.submissionId, input.adminNote)
    ),
  createTournament: discordTournamentStaffProcedure
    .input(createTournamentSchema)
    .mutation(async ({ input, ctx }) => {
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
      const insertId = Number(
        (insertResult as { insertId?: unknown } | undefined)?.insertId ?? 0
      );
      const createdTournament =
        rows.find(tournament => tournament.id === insertId) ??
        rows
          .filter(tournament => tournament.name === input.name)
          .sort((a, b) => b.id - a.id)[0] ??
        rows.sort((a, b) => b.id - a.id)[0];
      if (!createdTournament)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Tournament creation failed",
        });
      return { createdTournament, tournaments: rows };
    }),
  get: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .query(({ input }) => fetchTournamentControlData(input.tournamentId)),
  renameTournament: discordTournamentStaffProcedure
    .input(
      tournamentIdSchema.extend({ name: z.string().trim().min(2).max(255) })
    )
    .mutation(({ input }) =>
      updateTournamentName(input.tournamentId, input.name)
    ),
  setTournamentOwner: discordTournamentStaffProcedure
    .input(tournamentIdSchema.extend({ ownerUserId: idSchema.nullable() }))
    .mutation(({ input }) =>
      setTournamentOwner(input.tournamentId, input.ownerUserId)
    ),
  finalizeTournament: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input, ctx }) =>
      finalizeTournament(input.tournamentId, ctx.user)
    ),
  unlockTournamentForEditing: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input, ctx }) =>
      unlockTournamentForEditing(input.tournamentId, ctx.user)
    ),
  deleteTournament: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input }) => deleteTournament(input.tournamentId)),
  previewLobbyCodeRecipients: discordTournamentStaffProcedure
    .input(gameIdSchema)
    .query(async ({ input }) => {
      const db = await requireDb();
      return getLobbyCodeRecipients(db, input.gameId);
    }),
  sendLobbyCodeToTeamLeader: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ teamId: idSchema }))
    .mutation(async ({ input, ctx }) => {
      await releaseLobbyCodeDeliveries(input.gameId, ctx.user.id, input.teamId);
      return sendLobbyCode(input.gameId, input.teamId);
    }),
  sendLobbyCodeToLobbyLeaders: discordTournamentStaffProcedure
    .input(gameIdSchema)
    .mutation(async ({ input, ctx }) => {
      await releaseLobbyCodeDeliveries(input.gameId, ctx.user.id);
      return sendLobbyCode(input.gameId);
    }),
  createTeam: discordTournamentStaffProcedure
    .input(tournamentIdSchema.extend({ name: teamNameSchema, frp: frpSchema }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      return createTournamentTeamAndFetch(input);
    }),
  deleteTeam: discordTournamentStaffProcedure
    .input(tournamentIdSchema.extend({ teamId: idSchema }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await fetchTournamentRows(db, input.tournamentId);
      return deleteTournamentTeam(input.tournamentId, input.teamId);
    }),
  createCashoutLobby: discordTournamentStaffProcedure
    .input(tournamentIdSchema.extend({ position: positionSchema }))
    .mutation(({ input }) =>
      createGame(input.tournamentId, "cashout", input.position)
    ),
  createFinalRoundMatch: discordTournamentStaffProcedure
    .input(tournamentIdSchema.extend({ position: positionSchema }))
    .mutation(({ input }) =>
      createGame(input.tournamentId, "final_round", input.position)
    ),
  renameGame: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ displayLabel: labelSchema }))
    .mutation(({ input }) =>
      updateGameFieldAndFetch(
        input.gameId,
        () => ({ displayLabel: input.displayLabel }),
        { requireMutable: true }
      )
    ),
  setFinalRoundSeriesBestOf: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ seriesBestOf: seriesBestOfSchema }))
    .mutation(({ input }) =>
      updateGameFieldAndFetch(
        input.gameId,
        () => ({ seriesBestOf: input.seriesBestOf }),
        { requireMutable: true, requireFinalRound: true }
      )
    ),
  moveGame: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ position: positionSchema }))
    .mutation(({ input }) =>
      updateGameFieldAndFetch(input.gameId, game => {
        assertGamePositionUnlocked(game);
        const safePosition = clampCanvasPosition(input.position);
        return { canvasX: safePosition.x, canvasY: safePosition.y };
      })
    ),
  moveGames: discordTournamentStaffProcedure
    .input(
      tournamentIdSchema.extend({
        positions: z
          .array(gameIdSchema.extend({ position: positionSchema }))
          .min(1),
      })
    )
    .mutation(({ input }) => moveGames(input)),
  connectGames: discordTournamentStaffProcedure
    .input(
      tournamentIdSchema.extend({
        sourceGameId: idSchema,
        targetGameId: idSchema,
        flowType: connectionFlowTypeSchema.default("winner"),
      })
    )
    .mutation(({ input }) =>
      connectGames(
        input.tournamentId,
        input.sourceGameId,
        input.targetGameId,
        input.flowType
      )
    ),
  deleteGameConnection: discordTournamentStaffProcedure
    .input(z.object({ connectionId: idSchema }))
    .mutation(({ input }) => deleteGameConnection(input.connectionId)),
  deleteTournamentGameConnections: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input }) => clearTournamentConnections(input.tournamentId)),
  clearTournamentConnections: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input }) => clearTournamentConnections(input.tournamentId)),
  clearTournamentGameAssignments: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input }) =>
      returnTournamentTeamsToAvailable(input.tournamentId)
    ),
  returnTournamentTeamsToAvailable: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input }) =>
      returnTournamentTeamsToAvailable(input.tournamentId)
    ),
  clearTournamentCanvas: discordTournamentStaffProcedure
    .input(tournamentIdSchema)
    .mutation(({ input }) => clearTournamentCanvas(input.tournamentId)),
  restoreTournamentBoardSnapshot: discordTournamentStaffProcedure
    .input(tournamentIdSchema.extend({ snapshot: boardSnapshotSchema }))
    .mutation(({ input }) =>
      restoreTournamentBoardSnapshot(input.tournamentId, input.snapshot)
    ),
  updateStatus: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ status: z.enum(tournamentGameStatuses) }))
    .mutation(({ input }) =>
      updateGameStatusAndFetch(input.gameId, input.status)
    ),
  setGameMap: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ mapId: userSelectedMapIdSchema }))
    .mutation(({ input }) =>
      updateGameFieldAndFetch(input.gameId, () => ({ mapId: input.mapId }))
    ),
  randomizeGameMap: discordTournamentStaffProcedure
    .input(gameIdSchema)
    .mutation(async ({ input }) => {
      const db = await requireDb();
      return randomizeGameMap(db, input.gameId);
    }),

  setBroadcastUrl: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ broadcastUrl: broadcastUrlSchema }))
    .mutation(({ input }) =>
      updateGameFieldAndFetch(input.gameId, () => ({
        broadcastUrl: input.broadcastUrl,
      }))
    ),
  setLobbyCode: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ lobbyCode: lobbyCodeSchema }))
    .mutation(({ input }) =>
      updateGameFieldAndFetch(
        input.gameId,
        () => ({ privateLobbyCode: input.lobbyCode }),
        { requireMutable: true }
      )
    ),
  setAssignmentResultPlacement: discordTournamentStaffProcedure
    .input(
      z.object({
        assignmentId: idSchema,
        resultPlacement: resultPlacementSchema,
      })
    )
    .mutation(({ input }) =>
      setAssignmentResultPlacement(input.assignmentId, input.resultPlacement)
    ),
  assignTeam: discordTournamentStaffProcedure
    .input(
      gameIdSchema.extend({
        teamId: idSchema,
        slotIndex: z.number().int().positive().optional(),
        preferredSlotIndex: z.number().int().positive().optional(),
      })
    )
    .mutation(({ input }) =>
      assignTeamToGameSlot(
        input.gameId,
        input.teamId,
        input.preferredSlotIndex ?? input.slotIndex
      )
    ),
  moveTeam: discordTournamentStaffProcedure
    .input(
      gameIdSchema.extend({
        teamId: idSchema,
        toGameId: idSchema,
        slotIndex: z.number().int().positive().optional(),
        preferredSlotIndex: z.number().int().positive().optional(),
      })
    )
    .mutation(({ input }) =>
      moveTeamBetweenGamesAndFetch({
        gameId: input.gameId,
        teamId: input.teamId,
        toGameId: input.toGameId,
        preferredSlotIndex: input.preferredSlotIndex ?? input.slotIndex,
      })
    ),
  createTeamClaimLink: discordTournamentStaffProcedure
    .input(z.object({ teamId: idSchema }))
    .mutation(({ input, ctx }) => createTeamClaimLink(input.teamId, ctx.user)),
  listTeamClaimLinks: discordTournamentStaffProcedure
    .input(z.object({ teamId: idSchema }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(tournamentTeamClaimLinks)
        .where(eq(tournamentTeamClaimLinks.tournamentTeamId, input.teamId));
      return rows.map(link => ({ ...link, state: getClaimLinkState(link) }));
    }),
  revokeTeamClaimLink: discordTournamentStaffProcedure
    .input(z.object({ linkId: idSchema }))
    .mutation(({ input }) => revokeTeamClaimLink(input.linkId)),

  autoFillLobby: discordTournamentStaffProcedure
    .input(gameIdSchema)
    .mutation(({ input }) => autoFillLobby(input.gameId)),
  updateRoundGroup: discordTournamentStaffProcedure
    .input(
      tournamentIdSchema.extend({
        gameIds: z.array(idSchema).min(1),
        label: roundLabelSchema.optional(),
        roundGroupId: roundGroupIdSchema.optional(),
        color: roundColorSchema.optional(),
        mode: z.enum(["create", "add", "rename", "remove", "color"]),
      })
    )
    .mutation(({ input }) => updateRoundGroup(input)),
  setRoundGroupLocked: discordTournamentStaffProcedure
    .input(
      tournamentIdSchema.extend({
        roundGroupId: roundGroupIdSchema,
        locked: z.boolean(),
      })
    )
    .mutation(({ input }) => setRoundGroupLocked(input)),
  removeTeam: discordTournamentStaffProcedure
    .input(gameIdSchema.extend({ teamId: idSchema }))
    .mutation(({ input }) =>
      deleteGameAssignmentAndFetch(input.gameId, input.teamId)
    ),
  removeAssignedTeams: discordTournamentStaffProcedure
    .input(gameIdSchema)
    .mutation(({ input }) => deleteGameAssignmentAndFetch(input.gameId)),
  deleteGame: discordTournamentStaffProcedure
    .input(gameIdSchema)
    .mutation(({ input }) => deleteGameAndFetch(input.gameId)),
});

export { getActiveAssignedTeamIds, gameCapacity };
export const __tournamentControlTestInternals = {
  runBoardMutationAndFetch,
  updateTournamentName,
  setTournamentOwner,
  deleteTournament,
  finalizeTournament,
  unlockTournamentForEditing,
  approveSubmission,
  moveGames,
  createGame,
  assignTeamToGameSlot,
  createTournamentTeamAndFetch,
  setTournamentRegistrationOpenAndFetch,
  setTournamentVisibility,
  publishTournament,
  rejectSubmission,
  regeneratePrivateInviteLink,
  createTeamClaimLink,
  revokeTeamClaimLink,
  releaseLobbyCodeDeliveries,
  acceptTeamClaimLink,
  getOrCreateStaffInviteLink,
  regenerateStaffInviteLink,
  revokeStaffInviteLink,
  acceptStaffInvite,
  getOrCreateViewerLink,
  regenerateViewerLink,
  updateGameFieldAndFetch,
  updateGameStatusAndFetch,
  restoreTournamentBoardSnapshot,
};
