import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import mysql from "mysql2/promise";

type MigrationJournal = {
  entries: Array<{
    idx: number;
    when: number;
    tag: string;
  }>;
};

type MigrationEntry = {
  idx: number;
  createdAt: number;
  tag: string;
  hash: string;
};

type DbMigrationRow = {
  id: number;
  hash: string;
  created_at: number | string;
};

type CountRow = { count: number };

type ColumnCheck = {
  table: string;
  column: string;
  columnType?: string;
  nullable?: boolean;
  defaultValue?: string | null;
};

type TableCheck = {
  table: string;
};

type IndexCheck = {
  table: string;
  index: string;
  columns: string[];
  unique: boolean;
};

type IndexDefinition = {
  exists: boolean;
  columns: string[];
  unique: boolean;
};

type IndexStatisticsRow = {
  columnName: string | Buffer;
  nonUnique: unknown;
};

type ColumnDefinitionRow = {
  columnType: string | Buffer;
  isNullable: string | Buffer;
  columnDefault: string | Buffer | null;
};

type ForeignKeyCheck = {
  table: string;
  constraint: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
};

const migrationsToReconcile = [
  "0019_tournament_maps_and_owners",
  "0020_add_tournament_connection_flow_type",
  "0021_add_tournament_game_broadcast_url",
  "0022_add_personal_tcr",
  "0023_tournament_staff_invites",
  "0024_add_tournament_round_groups",
  "0025_add_tournament_round_group_colors",
] as const;

const requiredColumns: ColumnCheck[] = [
  { table: "tournaments", column: "ownerUserId" },
  { table: "tournament_games", column: "mapId" },
  { table: "tournament_control_template_games", column: "mapId" },
  { table: "tournament_game_connections", column: "flowType" },
  { table: "tournament_control_template_connections", column: "flowType" },
  { table: "tournament_games", column: "broadcastUrl" },
  {
    table: "tournaments",
    column: "visibility",
    columnType: "enum('private','public')",
    nullable: false,
    defaultValue: "private",
  },
  {
    table: "tournaments",
    column: "publicSlug",
    columnType: "varchar(120)",
    nullable: true,
    defaultValue: null,
  },
  {
    table: "tournaments",
    column: "publishedAt",
    columnType: "timestamp",
    nullable: true,
    defaultValue: null,
  },
  {
    table: "tournaments",
    column: "maxTeams",
    columnType: "int",
    nullable: true,
    defaultValue: null,
  },
  {
    table: "tournament_games",
    column: "roundGroupId",
    columnType: "varchar(64)",
    nullable: true,
    defaultValue: null,
  },
  {
    table: "tournament_games",
    column: "roundLabel",
    columnType: "varchar(80)",
    nullable: true,
    defaultValue: null,
  },
  {
    table: "tournament_control_template_games",
    column: "roundGroupId",
    columnType: "varchar(64)",
    nullable: true,
    defaultValue: null,
  },
  {
    table: "tournament_control_template_games",
    column: "roundLabel",
    columnType: "varchar(80)",
    nullable: true,
    defaultValue: null,
  },
  {
    table: "tournament_games",
    column: "roundColor",
    columnType: "varchar(24)",
    nullable: true,
    defaultValue: null,
  },
  {
    table: "tournament_control_template_games",
    column: "roundColor",
    columnType: "varchar(24)",
    nullable: true,
    defaultValue: null,
  },
];

const requiredTables: TableCheck[] = [
  { table: "tournament_private_invite_links" },
  { table: "tournament_lobby_code_deliveries" },
  { table: "tournament_staff_members" },
  { table: "tournament_staff_invite_links" },
];

const requiredIndexes: IndexCheck[] = [
  {
    table: "tournaments",
    index: "tournaments_publicSlug_unique",
    columns: ["publicSlug"],
    unique: true,
  },
  {
    table: "tournaments",
    index: "tournaments_visibility_published_idx",
    columns: ["visibility", "publishedAt"],
    unique: false,
  },
  {
    table: "tournaments",
    index: "tournaments_owner_visibility_idx",
    columns: ["ownerUserId", "visibility"],
    unique: false,
  },
  {
    table: "tournament_private_invite_links",
    index: "tournament_private_invite_links_token_unique",
    columns: ["token"],
    unique: true,
  },
  {
    table: "tournament_private_invite_links",
    index: "tournament_private_invite_links_tournament_status_idx",
    columns: ["tournamentId", "status"],
    unique: false,
  },
  {
    table: "tournament_lobby_code_deliveries",
    index: "tournament_lobby_code_deliveries_game_team_unique",
    columns: ["gameId", "teamId"],
    unique: true,
  },
  {
    table: "tournament_lobby_code_deliveries",
    index: "tournament_lobby_code_deliveries_team_status_idx",
    columns: ["teamId", "status"],
    unique: false,
  },
  {
    table: "tournament_staff_members",
    index: "tournament_staff_members_tournament_user_unique",
    columns: ["tournamentId", "userId"],
    unique: true,
  },
  {
    table: "tournament_staff_members",
    index: "tournament_staff_members_tournament_idx",
    columns: ["tournamentId"],
    unique: false,
  },
  {
    table: "tournament_staff_members",
    index: "tournament_staff_members_user_idx",
    columns: ["userId"],
    unique: false,
  },
  {
    table: "tournament_staff_invite_links",
    index: "tournament_staff_invite_links_tokenHash_unique",
    columns: ["tokenHash"],
    unique: true,
  },
  {
    table: "tournament_staff_invite_links",
    index: "tournament_staff_invite_links_tournament_status_idx",
    columns: ["tournamentId", "status"],
    unique: false,
  },
  {
    table: "tournament_staff_invite_links",
    index: "tournament_staff_invite_links_status_expires_idx",
    columns: ["status", "expiresAt"],
    unique: false,
  },
  {
    table: "tournament_games",
    index: "tournament_games_round_group_idx",
    columns: ["tournamentId", "roundGroupId"],
    unique: false,
  },
  {
    table: "tournament_game_connections",
    index: "tournament_game_connections_source_target_flow_unique",
    columns: ["sourceGameId", "targetGameId", "flowType"],
    unique: true,
  },
  {
    table: "tournament_control_template_connections",
    index: "tournament_control_template_connections_unique",
    columns: ["sourceTemplateGameId", "targetTemplateGameId", "flowType"],
    unique: true,
  },
];

const requiredForeignKeys: ForeignKeyCheck[] = [
  {
    table: "tournaments",
    constraint: "tournaments_ownerUserId_users_id_fk",
    column: "ownerUserId",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "tournament_private_invite_links",
    constraint: "tournament_private_invite_links_tournament_fk",
    column: "tournamentId",
    referencedTable: "tournaments",
    referencedColumn: "id",
  },
  {
    table: "tournament_private_invite_links",
    constraint: "tournament_private_invite_links_creator_fk",
    column: "createdByUserId",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "tournament_lobby_code_deliveries",
    constraint: "tournament_lobby_code_deliveries_game_fk",
    column: "gameId",
    referencedTable: "tournament_games",
    referencedColumn: "id",
  },
  {
    table: "tournament_lobby_code_deliveries",
    constraint: "tournament_lobby_code_deliveries_team_fk",
    column: "teamId",
    referencedTable: "teams",
    referencedColumn: "id",
  },
  {
    table: "tournament_lobby_code_deliveries",
    constraint: "tournament_lobby_code_deliveries_releaser_fk",
    column: "releasedByUserId",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "tournament_staff_members",
    constraint: "tournament_staff_members_tournamentId_tournaments_id_fk",
    column: "tournamentId",
    referencedTable: "tournaments",
    referencedColumn: "id",
  },
  {
    table: "tournament_staff_members",
    constraint: "tournament_staff_members_userId_users_id_fk",
    column: "userId",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "tournament_staff_members",
    constraint: "tournament_staff_members_addedByUserId_users_id_fk",
    column: "addedByUserId",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "tournament_staff_invite_links",
    constraint: "tournament_staff_invite_links_tournamentId_tournaments_id_fk",
    column: "tournamentId",
    referencedTable: "tournaments",
    referencedColumn: "id",
  },
  {
    table: "tournament_staff_invite_links",
    constraint: "tournament_staff_invite_links_createdByUserId_users_id_fk",
    column: "createdByUserId",
    referencedTable: "users",
    referencedColumn: "id",
  },
  {
    table: "tournament_staff_invite_links",
    constraint: "tournament_staff_invite_links_acceptedByUserId_users_id_fk",
    column: "acceptedByUserId",
    referencedTable: "users",
    referencedColumn: "id",
  },
];

async function readMigrationEntries(): Promise<MigrationEntry[]> {
  const migrationsDir = path.join(process.cwd(), "drizzle");
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");
  const journal = JSON.parse(
    await fs.readFile(journalPath, "utf8")
  ) as MigrationJournal;

  return Promise.all(
    journal.entries.map(async entry => {
      const sql = await fs.readFile(
        path.join(migrationsDir, `${entry.tag}.sql`),
        "utf8"
      );
      return {
        idx: entry.idx,
        createdAt: entry.when,
        tag: entry.tag,
        hash: crypto.createHash("sha256").update(sql).digest("hex"),
      };
    })
  );
}

export function assertReconciliationEntries(
  entries: MigrationEntry[]
): MigrationEntry[] {
  const entriesByTag = new Map(entries.map(entry => [entry.tag, entry]));
  return migrationsToReconcile.map(tag => {
    const entry = entriesByTag.get(tag);
    if (!entry) {
      throw new Error(`Missing ${tag} in drizzle/meta/_journal.json`);
    }
    return entry;
  });
}

async function getDatabaseName(connection: mysql.Connection): Promise<string> {
  const [rows] = await connection.query<Array<{ databaseName: string }>>(
    "select database() as databaseName"
  );
  const databaseName = rows[0]?.databaseName;
  if (!databaseName) {
    throw new Error("Could not determine the active MySQL database");
  }
  return databaseName;
}

async function countRows(
  connection: mysql.Connection,
  sql: string,
  values: Array<string | number | boolean>
): Promise<number> {
  const [rows] = await connection.execute<CountRow[]>(sql, values);
  return Number(rows[0]?.count ?? 0);
}

async function assertTableExists(
  connection: mysql.Connection,
  databaseName: string,
  check: TableCheck
) {
  const count = await countRows(
    connection,
    `select count(*) as count
       from information_schema.tables
      where table_schema = ? and table_name = ?`,
    [databaseName, check.table]
  );

  if (count !== 1) {
    throw new Error(
      `Required table ${check.table} is missing; not reconciling the ledger.`
    );
  }
}

function normalizeInformationSchemaValue(
  value: string | Buffer | null
): string | null {
  if (value === null) {
    return null;
  }
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
}

async function assertColumnExists(
  connection: mysql.Connection,
  databaseName: string,
  check: ColumnCheck
) {
  const [rows] = await connection.execute<ColumnDefinitionRow[]>(
    `select
        COLUMN_TYPE as columnType,
        IS_NULLABLE as isNullable,
        COLUMN_DEFAULT as columnDefault
       from information_schema.columns
      where table_schema = ? and table_name = ? and column_name = ?`,
    [databaseName, check.table, check.column]
  );

  const definition = rows[0];
  if (!definition) {
    throw new Error(
      `Required column ${check.table}.${check.column} is missing; not reconciling the ledger.`
    );
  }

  const actualColumnType = normalizeInformationSchemaValue(
    definition.columnType
  );
  if (check.columnType && actualColumnType !== check.columnType) {
    throw new Error(
      `Required column ${check.table}.${check.column} has unexpected type ${actualColumnType}; expected ${check.columnType}.`
    );
  }

  const actualNullable =
    normalizeInformationSchemaValue(definition.isNullable) === "YES";
  if (check.nullable !== undefined && actualNullable !== check.nullable) {
    throw new Error(
      `Required column ${check.table}.${check.column} has unexpected nullability; expected ${check.nullable ? "nullable" : "not nullable"}.`
    );
  }

  const actualDefault = normalizeInformationSchemaValue(
    definition.columnDefault
  );
  if (
    check.defaultValue !== undefined &&
    actualDefault !== check.defaultValue
  ) {
    throw new Error(
      `Required column ${check.table}.${check.column} has unexpected default ${String(actualDefault)}; expected ${String(check.defaultValue)}.`
    );
  }
}

async function getIndexDefinition(
  connection: mysql.Connection,
  databaseName: string,
  table: string,
  index: string
): Promise<IndexDefinition> {
  const [rows] = await connection.execute<IndexStatisticsRow[]>(
    `select
        COLUMN_NAME as columnName,
        NON_UNIQUE as nonUnique
       from information_schema.statistics
      where table_schema = ?
        and table_name = ?
        and index_name = ?
      order by SEQ_IN_INDEX`,
    [databaseName, table, index]
  );

  return buildIndexDefinitionFromStatisticsRows(rows);
}

export function parseMysqlNonUnique(value: unknown): boolean {
  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "bigint") {
    return value !== 0n;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "0") {
      return false;
    }
    if (trimmed === "1") {
      return true;
    }
  }

  if (Buffer.isBuffer(value)) {
    return parseMysqlNonUnique(value.toString("utf8"));
  }

  throw new Error(
    `Unexpected information_schema.statistics.non_unique value: ${String(value)}`
  );
}

export function normalizeIndexColumnName(value: string | Buffer): string {
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
}

export function buildIndexDefinitionFromStatisticsRows(
  rows: IndexStatisticsRow[]
): IndexDefinition {
  return {
    exists: rows.length > 0,
    columns: rows.map(row => normalizeIndexColumnName(row.columnName)),
    unique:
      rows.length > 0 && rows.every(row => !parseMysqlNonUnique(row.nonUnique)),
  };
}

function indexMatchesDefinition(
  definition: IndexDefinition,
  columns: string[],
  unique: boolean
): boolean {
  return (
    definition.exists &&
    definition.unique === unique &&
    definition.columns.join(",") === columns.join(",")
  );
}

async function assertIndexExists(
  connection: mysql.Connection,
  databaseName: string,
  check: IndexCheck
) {
  const definition = await getIndexDefinition(
    connection,
    databaseName,
    check.table,
    check.index
  );

  if (!indexMatchesDefinition(definition, check.columns, check.unique)) {
    throw new Error(
      `Required index ${check.table}.${check.index} is missing or has an unexpected definition.`
    );
  }
}

async function reconcileMigration0020IndexTransition(
  connection: mysql.Connection,
  databaseName: string
) {
  const gameLegacyIndex = await getIndexDefinition(
    connection,
    databaseName,
    "tournament_game_connections",
    "tournament_game_connections_source_target_unique"
  );
  const gameFlowIndex = await getIndexDefinition(
    connection,
    databaseName,
    "tournament_game_connections",
    "tournament_game_connections_source_target_flow_unique"
  );

  const gameLegacyMatches = indexMatchesDefinition(
    gameLegacyIndex,
    ["sourceGameId", "targetGameId"],
    true
  );
  const gameFlowMatches = indexMatchesDefinition(
    gameFlowIndex,
    ["sourceGameId", "targetGameId", "flowType"],
    true
  );

  if (gameFlowMatches) {
    if (gameLegacyIndex.exists) {
      if (!gameLegacyMatches) {
        throw new Error(
          "Obsolete index tournament_game_connections.tournament_game_connections_source_target_unique has an unexpected definition; not dropping it."
        );
      }
      await connection.execute(
        "alter table `tournament_game_connections` drop index `tournament_game_connections_source_target_unique`"
      );
      console.log(
        "Dropped obsolete tournament_game_connections_source_target_unique index."
      );
    }
  } else if (gameLegacyMatches && !gameFlowIndex.exists) {
    await connection.execute(
      "alter table `tournament_game_connections` drop index `tournament_game_connections_source_target_unique`"
    );
    await connection.execute(
      "create unique index `tournament_game_connections_source_target_flow_unique` on `tournament_game_connections` (`sourceGameId`, `targetGameId`, `flowType`)"
    );
    console.log(
      "Recreated tournament_game_connections unique index with flowType."
    );
  } else if (!gameLegacyIndex.exists && !gameFlowIndex.exists) {
    await connection.execute(
      "create unique index `tournament_game_connections_source_target_flow_unique` on `tournament_game_connections` (`sourceGameId`, `targetGameId`, `flowType`)"
    );
    console.log(
      "Created tournament_game_connections_source_target_flow_unique index after interrupted transition."
    );
  } else {
    throw new Error(
      "tournament_game_connections migration 0020 indexes are not in a recognized safe transition state; not modifying them."
    );
  }

  const templateIndex = await getIndexDefinition(
    connection,
    databaseName,
    "tournament_control_template_connections",
    "tournament_control_template_connections_unique"
  );
  const templateDesiredMatches = indexMatchesDefinition(
    templateIndex,
    ["sourceTemplateGameId", "targetTemplateGameId", "flowType"],
    true
  );
  const templateLegacyMatches = indexMatchesDefinition(
    templateIndex,
    ["sourceTemplateGameId", "targetTemplateGameId"],
    true
  );

  if (templateDesiredMatches) {
    return;
  }

  if (!templateLegacyMatches) {
    throw new Error(
      "tournament_control_template_connections migration 0020 index is not in a recognized safe transition state; not modifying it."
    );
  }

  await connection.execute(
    "alter table `tournament_control_template_connections` drop index `tournament_control_template_connections_unique`"
  );
  await connection.execute(
    "create unique index `tournament_control_template_connections_unique` on `tournament_control_template_connections` (`sourceTemplateGameId`, `targetTemplateGameId`, `flowType`)"
  );
  console.log(
    "Recreated tournament_control_template_connections_unique index with flowType."
  );
}

async function assertForeignKeyExists(
  connection: mysql.Connection,
  databaseName: string
) {
  for (const check of requiredForeignKeys) {
    const count = await countRows(
      connection,
      `select count(*) as count
         from information_schema.key_column_usage
        where table_schema = ?
          and table_name = ?
          and constraint_name = ?
          and column_name = ?
          and referenced_table_name = ?
          and referenced_column_name = ?`,
      [
        databaseName,
        check.table,
        check.constraint,
        check.column,
        check.referencedTable,
        check.referencedColumn,
      ]
    );

    if (count !== 1) {
      throw new Error(
        `Required foreign key ${check.table}.${check.constraint} is missing; not reconciling the ledger.`
      );
    }
  }
}

export async function assertProductionSchemaAlreadyHasMigrations(
  connection: mysql.Connection,
  databaseName: string
) {
  await Promise.all(
    requiredTables.map(check =>
      assertTableExists(connection, databaseName, check)
    )
  );
  await Promise.all(
    requiredColumns.map(check =>
      assertColumnExists(connection, databaseName, check)
    )
  );
  await reconcileMigration0020IndexTransition(connection, databaseName);
  await Promise.all(
    requiredIndexes.map(check =>
      assertIndexExists(connection, databaseName, check)
    )
  );
  await assertForeignKeyExists(connection, databaseName);
}

export async function reconcileLedgerEntries(
  connection: mysql.Connection,
  reconciliationEntries: MigrationEntry[]
) {
  await connection.beginTransaction();
  try {
    const [latestRows] = await connection.query<DbMigrationRow[]>(
      "select id, hash, created_at from __drizzle_migrations order by created_at desc limit 1 for update"
    );
    let latestCreatedAt = Number(latestRows[0]?.created_at ?? 0);

    for (const entry of reconciliationEntries) {
      const [existingRows] = await connection.execute<DbMigrationRow[]>(
        "select id, hash, created_at from __drizzle_migrations where created_at = ? for update",
        [entry.createdAt]
      );

      if (existingRows.length > 0) {
        const mismatched = existingRows.find(row => row.hash !== entry.hash);
        if (mismatched) {
          throw new Error(
            `Migration ledger row for ${entry.tag} exists with an unexpected hash; not modifying it.`
          );
        }
        console.log(`Ledger already contains ${entry.tag}; skipping.`);
        continue;
      }

      if (latestCreatedAt >= entry.createdAt) {
        throw new Error(
          `Latest ledger timestamp (${latestCreatedAt}) is already at or beyond ${entry.tag} (${entry.createdAt}), but that row is missing; not reconciling out of order.`
        );
      }

      await connection.execute(
        "insert into __drizzle_migrations (`hash`, `created_at`) values (?, ?)",
        [entry.hash, entry.createdAt]
      );
      latestCreatedAt = entry.createdAt;
      console.log(`Inserted ledger row for ${entry.tag}.`);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to reconcile Drizzle migrations");
  }

  const reconciliationEntries = assertReconciliationEntries(
    await readMigrationEntries()
  );
  const connection = await mysql.createConnection(databaseUrl);

  try {
    const databaseName = await getDatabaseName(connection);
    await assertProductionSchemaAlreadyHasMigrations(connection, databaseName);
    await reconcileLedgerEntries(connection, reconciliationEntries);
  } finally {
    await connection.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
