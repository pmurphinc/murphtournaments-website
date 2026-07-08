import { desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tournaments, teams, Tournament, Team, patchNotes, InsertPatchNote, PatchNote } from "../drizzle/schema";
import { ENV } from './_core/env';

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
  return error instanceof Error && error.message.toLowerCase().includes("duplicate column");
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

async function addColumnIfMissing(db: AppDb, tableName: string, columnName: string, definition: string) {
  if (await columnExists(db, tableName, columnName)) return;

  try {
    await db.execute(sql.raw(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`));
  } catch (error) {
    if (isDuplicateColumnError(error)) return;
    throw error;
  }
}

async function ensureTournamentControlColumns(db: AppDb) {
  await addColumnIfMissing(db, "tournaments", "ownerUserId", "int");
  await addColumnIfMissing(db, "tournament_games", "mapId", "varchar(64)");
  await addColumnIfMissing(db, "tournament_control_template_games", "mapId", "varchar(64)");
}

async function ensureDatabaseSchema(db: AppDb) {
  if (!_schemaEnsurePromise) {
    _schemaEnsurePromise = ensureTournamentControlColumns(db).catch(error => {
      _schemaEnsurePromise = null;
      console.error("[Database] Failed to ensure tournament control columns:", error);
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

    const textFields = ["name", "email", "loginMethod", "discordDisplayName", "discordUsername", "discordAvatarUrl"] as const;
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
      values.role = 'admin';
      updateSet.role = 'admin';
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

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

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
    const existing = await db.select().from(tournaments).where(eq(tournaments.name, "Development Division")).limit(1);
    
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
    const created = await db.select().from(tournaments).where(eq(tournaments.name, "Development Division")).limit(1);
    return created[0];
  } catch (error) {
    console.error("[Database] Failed to get/create tournament:", error);
    throw error;
  }
}

export async function updateTournamentStatus(tournamentId: number, updates: Partial<Tournament>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update tournament: database not available");
    return undefined;
  }

  try {
    await db.update(tournaments).set(updates).where(eq(tournaments.id, tournamentId));
    const result = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
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
    return await db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
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
    const result = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to update team FRP:", error);
    throw error;
  }
}

export async function upsertTeams(tournamentId: number, teamList: Array<{ name: string; frp: number }>) {
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
    return await db.select().from(teams).where(eq(teams.tournamentId, tournamentId));
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
    const existing = await db.select().from(tournaments).where(eq(tournaments.name, "7th Circle")).limit(1);
    
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
    const created = await db.select().from(tournaments).where(eq(tournaments.name, "7th Circle")).limit(1);
    return created[0];
  } catch (error) {
    console.error("[Database] Failed to get/create 7th Circle tournament:", error);
    throw error;
  }
}


// Tournament history functions
export async function getTournamentHistory() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get tournament history: database not available");
    return [];
  }

  try {
    const { tournamentHistory } = await import("../drizzle/schema");
    return await db.select().from(tournamentHistory).orderBy(desc(tournamentHistory.completedAt));
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
    console.warn("[Database] Cannot add tournament history: database not available");
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
    return await db.select().from(patchNotes).where(eq(patchNotes.isGameUpdate, 1)).orderBy(desc(patchNotes.date));
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
    const result = await db.select().from(patchNotes).orderBy(desc(patchNotes.id)).limit(1);
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
    const result = await db.select().from(patchNotes).where(eq(patchNotes.version, version)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get patch note by version:", error);
    throw error;
  }
}