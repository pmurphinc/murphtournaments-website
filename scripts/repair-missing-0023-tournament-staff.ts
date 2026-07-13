import process from "node:process";

import mysql from "mysql2/promise";

type CountRow = { count: number };
type ColumnRow = {
  columnName: string | Buffer;
  columnType: string | Buffer;
  isNullable: string | Buffer;
  columnDefault: string | Buffer | null;
  extra: string | Buffer;
};
type IndexRow = { columnName: string | Buffer; nonUnique: unknown };
type ForeignKeyRow = {
  columnName: string | Buffer;
  referencedTableName: string | Buffer;
  referencedColumnName: string | Buffer;
  deleteRule: string | Buffer;
  updateRule: string | Buffer;
};

type Connection = Pick<
  mysql.Connection,
  "execute" | "query" | "beginTransaction" | "commit" | "rollback" | "end"
>;

type ColumnCheck = {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  extra?: string;
};
type IndexCheck = { name: string; columns: string[]; unique: boolean };
type ForeignKeyCheck = {
  name: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
  deleteRule: "CASCADE" | "NO ACTION";
  updateRule: "NO ACTION";
};
type TableCheck = {
  name: string;
  createSql: string;
  columns: ColumnCheck[];
  indexes: IndexCheck[];
  foreignKeys: ForeignKeyCheck[];
};

type RepairResult = { createdArtifacts: string[]; databaseName: string };

function normalize(value: string | Buffer | null): string | null {
  if (value === null) return null;
  return Buffer.isBuffer(value) ? value.toString("utf8") : String(value);
}

type NormalizedColumnDefault = string | null;

function normalizeDefault(
  value: string | Buffer | null
): NormalizedColumnDefault {
  const normalized = normalize(value);
  return normalized === "NULL" ? null : normalized;
}

function stripWrappingParentheses(value: string): string {
  let current = value.trim();
  while (current.startsWith("(") && current.endsWith(")")) {
    let depth = 0;
    let wrapsWholeExpression = true;
    for (let index = 0; index < current.length; index += 1) {
      const char = current[index];
      if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      if (depth === 0 && index < current.length - 1) {
        wrapsWholeExpression = false;
        break;
      }
      if (depth < 0) {
        wrapsWholeExpression = false;
        break;
      }
    }
    if (!wrapsWholeExpression || depth !== 0) break;
    current = current.slice(1, -1).trim();
  }
  return current;
}

function canonicalizeCurrentTimestampExpression(
  value: string | Buffer | null
): "CURRENT_TIMESTAMP" | null {
  const normalized = normalize(value);
  if (normalized === null) return null;
  const unwrapped = stripWrappingParentheses(normalized);
  return /^current_timestamp\s*(?:\(\s*\))?$/i.test(unwrapped)
    ? "CURRENT_TIMESTAMP"
    : null;
}

function normalizeComparableDefault(
  value: string | Buffer | null,
  expected: NormalizedColumnDefault
): NormalizedColumnDefault {
  const normalized = normalizeDefault(value);
  if (expected !== "CURRENT_TIMESTAMP") return normalized;
  return canonicalizeCurrentTimestampExpression(normalized) ?? normalized;
}

function hasOnUpdateCurrentTimestamp(extra: string): boolean {
  const withoutDefaultGenerated = extra.replace(/\bdefault_generated\b/gi, " ");
  const match = withoutDefaultGenerated.match(/\bon\s+update\s+(.+)$/i);
  if (!match) return false;
  return (
    canonicalizeCurrentTimestampExpression(match[1]) === "CURRENT_TIMESTAMP"
  );
}

function describeColumnDefinition(
  table: string,
  check: ColumnCheck,
  actual: {
    type: string | null;
    nullable: boolean;
    defaultValue: NormalizedColumnDefault;
    extra: string;
  }
): string {
  return [
    `Column ${table}.${check.name} has unexpected definition.`,
    `Actual: type=${JSON.stringify(actual.type)}, nullable=${actual.nullable}, default=${JSON.stringify(actual.defaultValue)}, extra=${JSON.stringify(actual.extra)}.`,
    `Expected: type=${JSON.stringify(check.type)}, nullable=${check.nullable}, default=${JSON.stringify(check.defaultValue)}, extra=${JSON.stringify(check.extra ?? "")}.`,
  ].join(" ");
}

function parseNonUnique(value: unknown): boolean {
  if (typeof value === "number") return value !== 0;
  if (typeof value === "bigint") return value !== 0n;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.trim() === "0") return false;
    if (value.trim() === "1") return true;
  }
  if (Buffer.isBuffer(value)) return parseNonUnique(value.toString("utf8"));
  throw new Error(
    `Unexpected information_schema.statistics.non_unique value: ${String(value)}`
  );
}

export const prerequisiteTables = ["tournaments", "users"] as const;

const migration0022Checks = {
  tables: [
    "tournament_private_invite_links",
    "tournament_lobby_code_deliveries",
  ],
  columns: [
    {
      table: "tournaments",
      name: "visibility",
      type: "enum('private','public')",
      nullable: false,
      defaultValue: "private",
    },
    {
      table: "tournaments",
      name: "publicSlug",
      type: "varchar(120)",
      nullable: true,
      defaultValue: null,
    },
    {
      table: "tournaments",
      name: "publishedAt",
      type: "timestamp",
      nullable: true,
      defaultValue: null,
    },
    {
      table: "tournaments",
      name: "maxTeams",
      type: "int",
      nullable: true,
      defaultValue: null,
    },
  ],
  indexes: [
    {
      table: "tournaments",
      name: "tournaments_publicSlug_unique",
      columns: ["publicSlug"],
      unique: true,
    },
    {
      table: "tournaments",
      name: "tournaments_visibility_published_idx",
      columns: ["visibility", "publishedAt"],
      unique: false,
    },
    {
      table: "tournaments",
      name: "tournaments_owner_visibility_idx",
      columns: ["ownerUserId", "visibility"],
      unique: false,
    },
  ],
};

const migration0024Checks = {
  columns: [
    {
      table: "tournament_games",
      name: "roundGroupId",
      type: "varchar(64)",
      nullable: true,
      defaultValue: null,
    },
    {
      table: "tournament_games",
      name: "roundLabel",
      type: "varchar(80)",
      nullable: true,
      defaultValue: null,
    },
    {
      table: "tournament_control_template_games",
      name: "roundGroupId",
      type: "varchar(64)",
      nullable: true,
      defaultValue: null,
    },
    {
      table: "tournament_control_template_games",
      name: "roundLabel",
      type: "varchar(80)",
      nullable: true,
      defaultValue: null,
    },
  ],
  indexes: [
    {
      table: "tournament_games",
      name: "tournament_games_round_group_idx",
      columns: ["tournamentId", "roundGroupId"],
      unique: false,
    },
  ],
};

export const migration0023Tables: TableCheck[] = [
  {
    name: "tournament_staff_members",
    createSql:
      "CREATE TABLE `tournament_staff_members` (`id` int AUTO_INCREMENT NOT NULL,`tournamentId` int NOT NULL,`userId` int NOT NULL,`role` enum('collaborator') NOT NULL DEFAULT 'collaborator',`addedByUserId` int NOT NULL,`createdAt` timestamp NOT NULL DEFAULT (now()),`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,CONSTRAINT `tournament_staff_members_id` PRIMARY KEY(`id`),CONSTRAINT `tournament_staff_members_tournament_user_unique` UNIQUE(`tournamentId`,`userId`))",
    columns: [
      {
        name: "id",
        type: "int",
        nullable: false,
        defaultValue: null,
        extra: "auto_increment",
      },
      {
        name: "tournamentId",
        type: "int",
        nullable: false,
        defaultValue: null,
      },
      { name: "userId", type: "int", nullable: false, defaultValue: null },
      {
        name: "role",
        type: "enum('collaborator')",
        nullable: false,
        defaultValue: "collaborator",
      },
      {
        name: "addedByUserId",
        type: "int",
        nullable: false,
        defaultValue: null,
      },
      {
        name: "createdAt",
        type: "timestamp",
        nullable: false,
        defaultValue: "CURRENT_TIMESTAMP",
      },
      {
        name: "updatedAt",
        type: "timestamp",
        nullable: false,
        defaultValue: "CURRENT_TIMESTAMP",
        extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
      },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["id"], unique: true },
      {
        name: "tournament_staff_members_tournament_user_unique",
        columns: ["tournamentId", "userId"],
        unique: true,
      },
      {
        name: "tournament_staff_members_tournament_idx",
        columns: ["tournamentId"],
        unique: false,
      },
      {
        name: "tournament_staff_members_user_idx",
        columns: ["userId"],
        unique: false,
      },
    ],
    foreignKeys: [
      {
        name: "tournament_staff_members_tournamentId_tournaments_id_fk",
        column: "tournamentId",
        referencedTable: "tournaments",
        referencedColumn: "id",
        deleteRule: "CASCADE",
        updateRule: "NO ACTION",
      },
      {
        name: "tournament_staff_members_userId_users_id_fk",
        column: "userId",
        referencedTable: "users",
        referencedColumn: "id",
        deleteRule: "CASCADE",
        updateRule: "NO ACTION",
      },
      {
        name: "tournament_staff_members_addedByUserId_users_id_fk",
        column: "addedByUserId",
        referencedTable: "users",
        referencedColumn: "id",
        deleteRule: "NO ACTION",
        updateRule: "NO ACTION",
      },
    ],
  },
  {
    name: "tournament_staff_invite_links",
    createSql:
      "CREATE TABLE `tournament_staff_invite_links` (`id` int AUTO_INCREMENT NOT NULL,`tournamentId` int NOT NULL,`createdByUserId` int NOT NULL,`tokenHash` varchar(64) NOT NULL,`status` enum('active','accepted','revoked') NOT NULL DEFAULT 'active',`expiresAt` timestamp NOT NULL,`acceptedByUserId` int,`createdAt` timestamp NOT NULL DEFAULT (now()),`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,CONSTRAINT `tournament_staff_invite_links_id` PRIMARY KEY(`id`),CONSTRAINT `tournament_staff_invite_links_tokenHash_unique` UNIQUE(`tokenHash`))",
    columns: [
      {
        name: "id",
        type: "int",
        nullable: false,
        defaultValue: null,
        extra: "auto_increment",
      },
      {
        name: "tournamentId",
        type: "int",
        nullable: false,
        defaultValue: null,
      },
      {
        name: "createdByUserId",
        type: "int",
        nullable: false,
        defaultValue: null,
      },
      {
        name: "tokenHash",
        type: "varchar(64)",
        nullable: false,
        defaultValue: null,
      },
      {
        name: "status",
        type: "enum('active','accepted','revoked')",
        nullable: false,
        defaultValue: "active",
      },
      {
        name: "expiresAt",
        type: "timestamp",
        nullable: false,
        defaultValue: null,
      },
      {
        name: "acceptedByUserId",
        type: "int",
        nullable: true,
        defaultValue: null,
      },
      {
        name: "createdAt",
        type: "timestamp",
        nullable: false,
        defaultValue: "CURRENT_TIMESTAMP",
      },
      {
        name: "updatedAt",
        type: "timestamp",
        nullable: false,
        defaultValue: "CURRENT_TIMESTAMP",
        extra: "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
      },
    ],
    indexes: [
      { name: "PRIMARY", columns: ["id"], unique: true },
      {
        name: "tournament_staff_invite_links_tokenHash_unique",
        columns: ["tokenHash"],
        unique: true,
      },
      {
        name: "tournament_staff_invite_links_tournament_status_idx",
        columns: ["tournamentId", "status"],
        unique: false,
      },
      {
        name: "tournament_staff_invite_links_status_expires_idx",
        columns: ["status", "expiresAt"],
        unique: false,
      },
    ],
    foreignKeys: [
      {
        name: "tournament_staff_invite_links_tournamentId_tournaments_id_fk",
        column: "tournamentId",
        referencedTable: "tournaments",
        referencedColumn: "id",
        deleteRule: "CASCADE",
        updateRule: "NO ACTION",
      },
      {
        name: "tournament_staff_invite_links_createdByUserId_users_id_fk",
        column: "createdByUserId",
        referencedTable: "users",
        referencedColumn: "id",
        deleteRule: "NO ACTION",
        updateRule: "NO ACTION",
      },
      {
        name: "tournament_staff_invite_links_acceptedByUserId_users_id_fk",
        column: "acceptedByUserId",
        referencedTable: "users",
        referencedColumn: "id",
        deleteRule: "NO ACTION",
        updateRule: "NO ACTION",
      },
    ],
  },
];

async function countRows(
  connection: Connection,
  sql: string,
  values: unknown[]
) {
  const [rows] = (await connection.execute(sql, values)) as [CountRow[]];
  return Number(rows[0]?.count ?? 0);
}

async function tableExists(connection: Connection, db: string, table: string) {
  return (
    (await countRows(
      connection,
      "select count(*) as count from information_schema.tables where table_schema = ? and table_name = ?",
      [db, table]
    )) === 1
  );
}

async function getColumn(
  connection: Connection,
  db: string,
  table: string,
  column: string
) {
  const [rows] = (await connection.execute(
    "select COLUMN_NAME as columnName, COLUMN_TYPE as columnType, IS_NULLABLE as isNullable, COLUMN_DEFAULT as columnDefault, EXTRA as extra from information_schema.columns where table_schema = ? and table_name = ? and column_name = ?",
    [db, table, column]
  )) as [ColumnRow[]];
  return rows[0];
}

function assertColumn(
  row: ColumnRow | undefined,
  table: string,
  check: ColumnCheck
) {
  if (!row)
    throw new Error(`Expected column ${table}.${check.name} is missing.`);
  const type = normalize(row.columnType);
  const nullable = normalize(row.isNullable) === "YES";
  const def = normalizeComparableDefault(row.columnDefault, check.defaultValue);
  const extra = normalize(row.extra) ?? "";
  const actual = { type, nullable, defaultValue: def, extra };
  if (
    type !== check.type ||
    nullable !== check.nullable ||
    def !== check.defaultValue
  ) {
    throw new Error(describeColumnDefinition(table, check, actual));
  }
  if (check.extra === "auto_increment") {
    if (!extra.toLowerCase().split(/\s+/).includes("auto_increment"))
      throw new Error(describeColumnDefinition(table, check, actual));
  } else if (check.extra?.toLowerCase().includes("on update")) {
    if (!hasOnUpdateCurrentTimestamp(extra))
      throw new Error(describeColumnDefinition(table, check, actual));
  } else if (
    check.extra &&
    !extra.toLowerCase().includes(check.extra.toLowerCase())
  ) {
    throw new Error(describeColumnDefinition(table, check, actual));
  }
}

async function getIndex(
  connection: Connection,
  db: string,
  table: string,
  index: string
) {
  const [rows] = (await connection.execute(
    "select COLUMN_NAME as columnName, NON_UNIQUE as nonUnique from information_schema.statistics where table_schema = ? and table_name = ? and index_name = ? order by SEQ_IN_INDEX",
    [db, table, index]
  )) as [IndexRow[]];
  return {
    exists: rows.length > 0,
    columns: rows.map(r => normalize(r.columnName) ?? ""),
    unique: rows.length > 0 && rows.every(r => !parseNonUnique(r.nonUnique)),
  };
}

async function assertIndex(
  connection: Connection,
  db: string,
  table: string,
  check: IndexCheck
) {
  const index = await getIndex(connection, db, table, check.name);
  if (
    !index.exists ||
    index.unique !== check.unique ||
    index.columns.join(",") !== check.columns.join(",")
  ) {
    throw new Error(
      `Index ${table}.${check.name} is missing or has an unexpected definition.`
    );
  }
}

async function getForeignKey(
  connection: Connection,
  db: string,
  table: string,
  name: string
) {
  const [rows] = (await connection.execute(
    "select k.COLUMN_NAME as columnName, k.REFERENCED_TABLE_NAME as referencedTableName, k.REFERENCED_COLUMN_NAME as referencedColumnName, r.DELETE_RULE as deleteRule, r.UPDATE_RULE as updateRule from information_schema.key_column_usage k join information_schema.referential_constraints r on r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA and r.TABLE_NAME = k.TABLE_NAME and r.CONSTRAINT_NAME = k.CONSTRAINT_NAME where k.table_schema = ? and k.table_name = ? and k.constraint_name = ? order by k.ORDINAL_POSITION",
    [db, table, name]
  )) as [ForeignKeyRow[]];
  return rows[0];
}

async function assertForeignKey(
  connection: Connection,
  db: string,
  table: string,
  check: ForeignKeyCheck
) {
  const fk = await getForeignKey(connection, db, table, check.name);
  if (!fk) throw new Error(`Foreign key ${table}.${check.name} is missing.`);
  if (
    normalize(fk.columnName) !== check.column ||
    normalize(fk.referencedTableName) !== check.referencedTable ||
    normalize(fk.referencedColumnName) !== check.referencedColumn ||
    normalize(fk.deleteRule) !== check.deleteRule ||
    normalize(fk.updateRule) !== check.updateRule
  ) {
    throw new Error(
      `Foreign key ${table}.${check.name} has an unexpected definition.`
    );
  }
}

async function assertColumns(
  connection: Connection,
  db: string,
  table: string,
  columns: ColumnCheck[]
) {
  for (const column of columns)
    assertColumn(
      await getColumn(connection, db, table, column.name),
      table,
      column
    );
}

async function assertSchemaChecks(
  connection: Connection,
  db: string,
  label: string,
  checks: typeof migration0022Checks | typeof migration0024Checks
) {
  for (const table of "tables" in checks ? checks.tables : []) {
    if (!(await tableExists(connection, db, table)))
      throw new Error(`${label} prerequisite table ${table} is missing.`);
  }
  for (const column of checks.columns)
    assertColumn(
      await getColumn(connection, db, column.table, column.name),
      column.table,
      column
    );
  for (const index of checks.indexes)
    await assertIndex(connection, db, index.table, index);
}

async function assert0023Table(
  connection: Connection,
  db: string,
  table: TableCheck
) {
  if (!(await tableExists(connection, db, table.name)))
    throw new Error(`Expected table ${table.name} is missing.`);
  await assertColumns(connection, db, table.name, table.columns);
  for (const index of table.indexes)
    await assertIndex(connection, db, table.name, index);
  for (const fk of table.foreignKeys)
    await assertForeignKey(connection, db, table.name, fk);
}

async function createMissing0023Artifacts(
  connection: Connection,
  db: string,
  created: string[]
) {
  for (const table of migration0023Tables) {
    if (await tableExists(connection, db, table.name)) {
      await assertColumns(connection, db, table.name, table.columns);
      await assertIndex(connection, db, table.name, table.indexes[0]);
      for (const index of table.indexes.slice(1, 2))
        await assertIndex(connection, db, table.name, index);
    } else {
      await connection.execute(table.createSql);
      created.push(`table ${table.name}`);
    }
  }

  for (const table of migration0023Tables) {
    for (const fk of table.foreignKeys) {
      const existing = await getForeignKey(connection, db, table.name, fk.name);
      if (existing) await assertForeignKey(connection, db, table.name, fk);
      else {
        await connection.execute(
          `ALTER TABLE \`${table.name}\` ADD CONSTRAINT \`${fk.name}\` FOREIGN KEY (\`${fk.column}\`) REFERENCES \`${fk.referencedTable}\`(\`${fk.referencedColumn}\`) ON DELETE ${fk.deleteRule.toLowerCase()} ON UPDATE no action`
        );
        created.push(`foreign key ${table.name}.${fk.name}`);
      }
    }
    for (const index of table.indexes.slice(2)) {
      const existing = await getIndex(connection, db, table.name, index.name);
      if (existing.exists) await assertIndex(connection, db, table.name, index);
      else {
        await connection.execute(
          `CREATE INDEX \`${index.name}\` ON \`${table.name}\` (${index.columns.map(c => `\`${c}\``).join(",")})`
        );
        created.push(`index ${table.name}.${index.name}`);
      }
    }
  }
}

export async function repairMissing0023TournamentStaff(
  connection: Connection
): Promise<RepairResult> {
  const [dbRows] = (await connection.query(
    "select database() as databaseName"
  )) as [Array<{ databaseName: string | null }>];
  const databaseName = dbRows[0]?.databaseName;
  if (!databaseName)
    throw new Error("Could not determine the active MySQL database.");
  console.log(`Repair target database: ${databaseName}`);

  for (const table of prerequisiteTables) {
    if (!(await tableExists(connection, databaseName, table)))
      throw new Error(
        `Required prerequisite table ${table} is missing; refusing repair.`
      );
  }
  await assertSchemaChecks(
    connection,
    databaseName,
    "0022",
    migration0022Checks
  );
  await assertSchemaChecks(
    connection,
    databaseName,
    "0024",
    migration0024Checks
  );

  const createdArtifacts: string[] = [];
  await connection.beginTransaction();
  try {
    await createMissing0023Artifacts(
      connection,
      databaseName,
      createdArtifacts
    );
    for (const table of migration0023Tables)
      await assert0023Table(connection, databaseName, table);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }

  return { createdArtifacts, databaseName };
}

async function main() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is required for db:repair-0023.");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const result = await repairMissing0023TournamentStaff(connection);
    if (result.createdArtifacts.length === 0)
      console.log(
        "0023 tournament staff schema already matches; no changes made."
      );
    else
      console.log(
        `Created ${result.createdArtifacts.length} missing 0023 artifact(s): ${result.createdArtifacts.join(", ")}.`
      );
    console.log("Repair complete. Migration ledger was not modified.");
  } finally {
    await connection.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
