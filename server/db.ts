import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  tournaments,
  teams,
  Tournament,
  Team,
  patchNotes,
  InsertPatchNote,
  PatchNote,
  arcadeScores,
  InsertArcadeScore,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

type AppDb = ReturnType<typeof drizzle>;

let _db: AppDb | null = null;
let _schemaEnsurePromise: Promise<void> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function readExecutionRows(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) {
    const [first] = result;
    if (Array.isArray(first)) return first.filter(isRecord);
    return result.filter(isRecord);
  }

  if (isRecord(result) && Array.isArray(result.rows)) {
    return result.rows.filter(isRecord);
  }

  return [];
}

function isDuplicateColumnError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("duplicate column")
  );
}

function isDuplicateIndexError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.toLowerCase().includes("duplicate key name") ||
      error.message.toLowerCase().includes("duplicate index"))
  );
}

async function columnExists(db: AppDb, tableName: string, columnName: string) {
  const rows = readExecutionRows(
    await db.execute(sql`
      SELECT COLUMN_NAME
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
        AND COLUMN_NAME = ${columnName}
      LIMIT 1
    `)
  );
  return rows.length > 0;
}

export async function addColumnIfMissing(
  db: AppDb,
  tableName: string,
  columnName: string,
  definition: string
) {
  if (await columnExists(db, tableName, columnName)) return;

  try {
    await db.execute(
      sql.raw(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`
      )
    );
  } catch (error) {
    if (isDuplicateColumnError(error)) return;
    throw error;
  }
}

async function indexExists(db: AppDb, tableName: string, indexName: string) {
  const rows = readExecutionRows(
    await db.execute(sql`
      SELECT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
        AND INDEX_NAME = ${indexName}
      LIMIT 1
    `)
  );
  return rows.length > 0;
}

export async function addIndexIfMissing(
  db: AppDb,
  tableName: string,
  indexName: string,
  definition: string
) {
  if (await indexExists(db, tableName, indexName)) return;

  try {
    await db.execute(
      sql.raw(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` ${definition}`)
    );
  } catch (error) {
    if (isDuplicateIndexError(error)) return;
    throw error;
  }
}

export async function ensureTournamentControlColumns(db: AppDb) {
  await addColumnIfMissing(db, "tournaments", "ownerUserId", "int");
  await addColumnIfMissing(db, "tournament_games", "mapId", "varchar(64)");
  await addColumnIfMissing(
    db,
    "tournament_games",
    "broadcastUrl",
    "varchar(1024)"
  );
  await addColumnIfMissing(
    db,
    "tournament_control_template_games",
    "mapId",
    "varchar(64)"
  );
  await addColumnIfMissing(
    db,
    "tournament_games",
    "roundGroupId",
    "varchar(64)"
  );
  await addColumnIfMissing(db, "tournament_games", "roundLabel", "varchar(80)");
  await addColumnIfMissing(db, "tournament_games", "roundColor", "varchar(24)");
  await addColumnIfMissing(
    db,
    "tournament_control_template_games",
    "roundGroupId",
    "varchar(64)"
  );
  await addColumnIfMissing(
    db,
    "tournament_control_template_games",
    "roundLabel",
    "varchar(80)"
  );
  await addColumnIfMissing(
    db,
    "tournament_control_template_games",
    "roundColor",
    "varchar(24)"
  );
  await addIndexIfMissing(
    db,
    "tournament_games",
    "tournament_games_round_group_idx",
    "(`tournamentId`, `roundGroupId`)"
  );
}

async function ensureDatabaseSchema(db: AppDb) {
  if (!_schemaEnsurePromise) {
    _schemaEnsurePromise = ensureTournamentControlColumns(db).catch(error => {
      _schemaEnsurePromise = null;
      console.error(
        "[Database] Failed to ensure tournament control columns:",
        error
      );
      throw error;
    });
  }

  await _schemaEnsurePromise;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }

  if (_db) {
    await ensureDatabaseSchema(_db);
  }

  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = [
      "name",
      "email",
      "loginMethod",
      "discordDisplayName",
      "discordUsername",
      "discordAvatarUrl",
    ] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Tournament queries
export async function getOrCreateDevDivisionTournament() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get tournament: database not available");
    return undefined;
  }

  try {
    // Try to find existing Dev Division tournament
    const existing = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.name, "Development Division"))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new tournament if it doesn't exist
    const result = await db.insert(tournaments).values({
      name: "Development Division",
      eventStatus: "not-live",
      currentCycle: "1",
      currentStage: "check-in",
      currentMatch: "Team A vs Team B",
      eventNote: "Awaiting Results / Match In Progress / Sudden Death",
    });

    // Return the created tournament
    const created = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.name, "Development Division"))
      .limit(1);
    return created[0];
  } catch (error) {
    console.error("[Database] Failed to get/create tournament:", error);
    throw error;
  }
}

export async function updateTournamentStatus(
  tournamentId: number,
  updates: Partial<Tournament>
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update tournament: database not available");
    return undefined;
  }

  try {
    await db
      .update(tournaments)
      .set(updates)
      .where(eq(tournaments.id, tournamentId));
    const result = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to update tournament:", error);
    throw error;
  }
}

export async function getTeamsByTournament(tournamentId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get teams: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(teams)
      .where(eq(teams.tournamentId, tournamentId));
  } catch (error) {
    console.error("[Database] Failed to get teams:", error);
    throw error;
  }
}

export async function updateTeamFRP(teamId: number, frp: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update team: database not available");
    return undefined;
  }

  try {
    await db.update(teams).set({ frp }).where(eq(teams.id, teamId));
    const result = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to update team FRP:", error);
    throw error;
  }
}

export async function upsertTeams(
  tournamentId: number,
  teamList: Array<{ name: string; frp: number }>
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert teams: database not available");
    return [];
  }

  try {
    // Delete existing teams for this tournament
    await db.delete(teams).where(eq(teams.tournamentId, tournamentId));

    // Insert new teams
    const teamValues = teamList.map(t => ({
      tournamentId,
      name: t.name,
      frp: t.frp,
    }));

    if (teamValues.length > 0) {
      await db.insert(teams).values(teamValues);
    }

    // Return all teams
    return await db
      .select()
      .from(teams)
      .where(eq(teams.tournamentId, tournamentId));
  } catch (error) {
    console.error("[Database] Failed to upsert teams:", error);
    throw error;
  }
}

// 7th Circle tournament queries
export async function getOrCreateSeventhCircleTournament() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get tournament: database not available");
    return undefined;
  }

  try {
    // Try to find existing 7th Circle tournament
    const existing = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.name, "7th Circle"))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new tournament if it doesn't exist
    const result = await db.insert(tournaments).values({
      name: "7th Circle",
      eventStatus: "not-live",
      currentCycle: "1",
      currentStage: "check-in",
      currentMatch: "Team A vs Team B",
      eventNote: "Awaiting Results / Match In Progress / Sudden Death",
    });

    // Return the created tournament
    const created = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.name, "7th Circle"))
      .limit(1);
    return created[0];
  } catch (error) {
    console.error(
      "[Database] Failed to get/create 7th Circle tournament:",
      error
    );
    throw error;
  }
}

// Tournament history functions
export async function getTournamentHistory() {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot get tournament history: database not available"
    );
    return [];
  }

  try {
    const { tournamentHistory } = await import("../drizzle/schema");
    return await db
      .select()
      .from(tournamentHistory)
      .orderBy(desc(tournamentHistory.completedAt));
  } catch (error) {
    console.error("[Database] Failed to get tournament history:", error);
    throw error;
  }
}

export async function addTournamentToHistory(
  tournamentId: number,
  name: string,
  winner: string,
  runnerUp?: string,
  finalFrp: number = 0
) {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot add tournament history: database not available"
    );
    return undefined;
  }

  try {
    const { tournamentHistory } = await import("../drizzle/schema");
    const result = await db.insert(tournamentHistory).values({
      tournamentId,
      name,
      winner,
      runnerUp: runnerUp || null,
      finalFrp,
    });
    return result;
  } catch (error) {
    console.error("[Database] Failed to add tournament history:", error);
    throw error;
  }
}

// Patch notes functions
export async function getAllPatchNotes() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get patch notes: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(patchNotes)
      .where(eq(patchNotes.isGameUpdate, 1))
      .orderBy(desc(patchNotes.date));
  } catch (error) {
    console.error("[Database] Failed to get patch notes:", error);
    throw error;
  }
}

export async function addPatchNote(patch: InsertPatchNote) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot add patch note:", "database not available");
    return undefined;
  }

  try {
    await db.insert(patchNotes).values(patch);
    const result = await db
      .select()
      .from(patchNotes)
      .orderBy(desc(patchNotes.id))
      .limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to add patch note:", error);
    throw error;
  }
}

export async function getPatchNoteByVersion(version: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get patch note: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(patchNotes)
      .where(eq(patchNotes.version, version))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get patch note by version:", error);
    throw error;
  }
}

// Arcade queries

export type ArcadeLeaderboardRow = {
  rank: number;
  userId: number;
  displayName: string;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
  bestScore: number;
  runs: number;
  lastPlayed: Date | null;
};

function arcadeDisplayName(user: {
  discordDisplayName: string | null;
  name: string | null;
  discordUsername: string | null;
}) {
  return (
    user.discordDisplayName?.trim() ||
    user.name?.trim() ||
    user.discordUsername?.trim() ||
    "Unknown pilot"
  );
}

export async function recordArcadeScore(score: InsertArcadeScore) {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot record arcade score: database not available"
    );
    return false;
  }

  await db.insert(arcadeScores).values(score);
  return true;
}

/**
 * One row per player — their best run only — so a single dominant session
 * cannot fill the whole board. Aggregate-only selects keep this valid under
 * MySQL's ONLY_FULL_GROUP_BY.
 */
export async function getArcadeLeaderboard(
  game: string,
  limit: number
): Promise<ArcadeLeaderboardRow[]> {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot read arcade leaderboard: database not available"
    );
    return [];
  }

  const bests = await db
    .select({
      userId: arcadeScores.userId,
      bestScore: sql<number>`max(${arcadeScores.score})`,
      runs: sql<number>`count(*)`,
      lastPlayed: sql<Date | null>`max(${arcadeScores.createdAt})`,
    })
    .from(arcadeScores)
    .where(eq(arcadeScores.game, game))
    .groupBy(arcadeScores.userId)
    .orderBy(desc(sql`max(${arcadeScores.score})`))
    .limit(limit);

  if (bests.length === 0) return [];

  const profiles = await db
    .select({
      id: users.id,
      name: users.name,
      discordDisplayName: users.discordDisplayName,
      discordUsername: users.discordUsername,
      discordAvatarUrl: users.discordAvatarUrl,
    })
    .from(users)
    .where(
      inArray(
        users.id,
        bests.map(best => best.userId)
      )
    );

  const byId = new Map(profiles.map(profile => [profile.id, profile]));

  return bests.map((best, index) => {
    const profile = byId.get(best.userId);
    return {
      rank: index + 1,
      userId: best.userId,
      displayName: profile ? arcadeDisplayName(profile) : "Unknown pilot",
      discordUsername: profile?.discordUsername ?? null,
      discordAvatarUrl: profile?.discordAvatarUrl ?? null,
      bestScore: Number(best.bestScore ?? 0),
      runs: Number(best.runs ?? 0),
      lastPlayed: best.lastPlayed ? new Date(best.lastPlayed) : null,
    };
  });
}

/**
 * A player's saved best and where it places overall. Rank counts the players
 * whose best beats theirs, so ties share a placing rather than being ordered
 * arbitrarily.
 */
export async function getArcadePlayerStanding(userId: number, game: string) {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot read arcade standing: database not available"
    );
    return null;
  }

  const [own] = await db
    .select({
      bestScore: sql<number>`max(${arcadeScores.score})`,
      runs: sql<number>`count(*)`,
    })
    .from(arcadeScores)
    .where(and(eq(arcadeScores.userId, userId), eq(arcadeScores.game, game)));

  const bestScore = Number(own?.bestScore ?? 0);
  const runs = Number(own?.runs ?? 0);
  if (runs === 0) return { bestScore: 0, runs: 0, rank: null as number | null };

  const ahead = readExecutionRows(
    await db.execute(sql`
      SELECT COUNT(*) AS ahead FROM (
        SELECT ${arcadeScores.userId}
        FROM ${arcadeScores}
        WHERE ${arcadeScores.game} = ${game}
        GROUP BY ${arcadeScores.userId}
        HAVING MAX(${arcadeScores.score}) > ${bestScore}
      ) AS better
    `)
  );

  const aheadCount = Number(ahead[0]?.ahead ?? 0);
  return { bestScore, runs, rank: aheadCount + 1 };
}
