import { describe, expect, it } from "vitest";

import {
  buildIndexDefinitionFromStatisticsRows,
  normalizeIndexColumnName,
  parseMysqlNonUnique,
} from "../../../scripts/reconcile-drizzle-migrations";

describe("parseMysqlNonUnique", () => {
  it("recognizes unique index metadata values returned as zero", () => {
    expect(parseMysqlNonUnique(0)).toBe(false);
    expect(parseMysqlNonUnique(0n)).toBe(false);
    expect(parseMysqlNonUnique("0")).toBe(false);
    expect(parseMysqlNonUnique(" 0 ")).toBe(false);
    expect(parseMysqlNonUnique(Buffer.from("0"))).toBe(false);
  });

  it("recognizes non-unique index metadata values returned as one", () => {
    expect(parseMysqlNonUnique(1)).toBe(true);
    expect(parseMysqlNonUnique(1n)).toBe(true);
    expect(parseMysqlNonUnique("1")).toBe(true);
    expect(parseMysqlNonUnique(" 1 ")).toBe(true);
    expect(parseMysqlNonUnique(Buffer.from("1"))).toBe(true);
  });

  it("rejects unexpected metadata values instead of guessing", () => {
    expect(() => parseMysqlNonUnique("yes")).toThrow(
      /Unexpected information_schema\.statistics\.non_unique value/
    );
  });
});

describe("normalizeIndexColumnName", () => {
  it("normalizes string and Buffer column names", () => {
    expect(normalizeIndexColumnName("sourceGameId")).toBe("sourceGameId");
    expect(normalizeIndexColumnName(Buffer.from("targetGameId"))).toBe(
      "targetGameId"
    );
  });
});

describe("buildIndexDefinitionFromStatisticsRows", () => {
  it("uses aliased production-style fields to build a unique index definition", () => {
    expect(
      buildIndexDefinitionFromStatisticsRows([
        { columnName: "sourceGameId", nonUnique: "0" },
        { columnName: "targetGameId", nonUnique: 0 },
        { columnName: Buffer.from("flowType"), nonUnique: 0n },
      ])
    ).toEqual({
      exists: true,
      columns: ["sourceGameId", "targetGameId", "flowType"],
      unique: true,
    });
  });

  it("supports string, numeric, bigint, and Buffer nonUnique values", () => {
    expect(
      buildIndexDefinitionFromStatisticsRows([
        { columnName: Buffer.from("sourceGameId"), nonUnique: "1" },
        { columnName: "targetGameId", nonUnique: 1 },
        { columnName: "flowType", nonUnique: 1n },
        { columnName: "extra", nonUnique: Buffer.from("1") },
      ])
    ).toEqual({
      exists: true,
      columns: ["sourceGameId", "targetGameId", "flowType", "extra"],
      unique: false,
    });
  });

  it("rejects undefined aliased nonUnique values instead of guessing", () => {
    expect(() =>
      buildIndexDefinitionFromStatisticsRows([
        { columnName: "sourceGameId", nonUnique: undefined },
      ])
    ).toThrow(/Unexpected information_schema\.statistics\.non_unique value/);
  });
});

import {
  assertProductionSchemaAlreadyHasMigrations,
  assertReconciliationEntries,
  reconcileLedgerEntries,
} from "../../../scripts/reconcile-drizzle-migrations";

type MockSchema = {
  tables: Set<string>;
  columns: Map<
    string,
    {
      columnType: string;
      isNullable: "YES" | "NO";
      columnDefault: string | null;
    }
  >;
  indexes: Map<string, Array<{ columnName: string; nonUnique: 0 | 1 }>>;
  foreignKeys: Set<string>;
};

function columnKey(table: string, column: string) {
  return `${table}.${column}`;
}

function indexKey(table: string, index: string) {
  return `${table}.${index}`;
}

function fkKey(
  table: string,
  constraint: string,
  column: string,
  refTable: string,
  refColumn: string
) {
  return `${table}.${constraint}.${column}.${refTable}.${refColumn}`;
}

function addIndex(
  schema: MockSchema,
  table: string,
  index: string,
  columns: string[],
  unique: boolean
) {
  schema.indexes.set(
    indexKey(table, index),
    columns.map(columnName => ({ columnName, nonUnique: unique ? 0 : 1 }))
  );
}

function addColumn(
  schema: MockSchema,
  table: string,
  column: string,
  columnType = "int",
  isNullable: "YES" | "NO" = "YES",
  columnDefault: string | null = null
) {
  schema.columns.set(columnKey(table, column), {
    columnType,
    isNullable,
    columnDefault,
  });
}

function fullSchema(): MockSchema {
  const schema: MockSchema = {
    tables: new Set([
      "tournament_private_invite_links",
      "tournament_lobby_code_deliveries",
      "tournament_staff_members",
      "tournament_staff_invite_links",
    ]),
    columns: new Map(),
    indexes: new Map(),
    foreignKeys: new Set(),
  };

  [
    ["tournaments", "ownerUserId"],
    ["tournament_games", "mapId"],
    ["tournament_control_template_games", "mapId"],
    ["tournament_game_connections", "flowType"],
    ["tournament_control_template_connections", "flowType"],
    ["tournament_games", "broadcastUrl"],
  ].forEach(([table, column]) => addColumn(schema, table, column));
  addColumn(
    schema,
    "tournaments",
    "visibility",
    "enum('private','public')",
    "NO",
    "private"
  );
  addColumn(schema, "tournaments", "publicSlug", "varchar(120)");
  addColumn(schema, "tournaments", "publishedAt", "timestamp");
  addColumn(schema, "tournaments", "maxTeams", "int");
  addColumn(schema, "tournament_games", "roundGroupId", "varchar(64)");
  addColumn(schema, "tournament_games", "roundLabel", "varchar(80)");
  addColumn(
    schema,
    "tournament_control_template_games",
    "roundGroupId",
    "varchar(64)"
  );
  addColumn(
    schema,
    "tournament_control_template_games",
    "roundLabel",
    "varchar(80)"
  );
  addColumn(schema, "tournament_games", "roundColor", "varchar(24)");
  addColumn(
    schema,
    "tournament_control_template_games",
    "roundColor",
    "varchar(24)"
  );

  addIndex(
    schema,
    "tournaments",
    "tournaments_publicSlug_unique",
    ["publicSlug"],
    true
  );
  addIndex(
    schema,
    "tournaments",
    "tournaments_visibility_published_idx",
    ["visibility", "publishedAt"],
    false
  );
  addIndex(
    schema,
    "tournaments",
    "tournaments_owner_visibility_idx",
    ["ownerUserId", "visibility"],
    false
  );
  addIndex(
    schema,
    "tournament_private_invite_links",
    "tournament_private_invite_links_token_unique",
    ["token"],
    true
  );
  addIndex(
    schema,
    "tournament_private_invite_links",
    "tournament_private_invite_links_tournament_status_idx",
    ["tournamentId", "status"],
    false
  );
  addIndex(
    schema,
    "tournament_lobby_code_deliveries",
    "tournament_lobby_code_deliveries_game_team_unique",
    ["gameId", "teamId"],
    true
  );
  addIndex(
    schema,
    "tournament_lobby_code_deliveries",
    "tournament_lobby_code_deliveries_team_status_idx",
    ["teamId", "status"],
    false
  );
  addIndex(
    schema,
    "tournament_staff_members",
    "tournament_staff_members_tournament_user_unique",
    ["tournamentId", "userId"],
    true
  );
  addIndex(
    schema,
    "tournament_staff_members",
    "tournament_staff_members_tournament_idx",
    ["tournamentId"],
    false
  );
  addIndex(
    schema,
    "tournament_staff_members",
    "tournament_staff_members_user_idx",
    ["userId"],
    false
  );
  addIndex(
    schema,
    "tournament_staff_invite_links",
    "tournament_staff_invite_links_tokenHash_unique",
    ["tokenHash"],
    true
  );
  addIndex(
    schema,
    "tournament_staff_invite_links",
    "tournament_staff_invite_links_tournament_status_idx",
    ["tournamentId", "status"],
    false
  );
  addIndex(
    schema,
    "tournament_staff_invite_links",
    "tournament_staff_invite_links_status_expires_idx",
    ["status", "expiresAt"],
    false
  );
  addIndex(
    schema,
    "tournament_games",
    "tournament_games_round_group_idx",
    ["tournamentId", "roundGroupId"],
    false
  );
  addIndex(
    schema,
    "tournament_game_connections",
    "tournament_game_connections_source_target_flow_unique",
    ["sourceGameId", "targetGameId", "flowType"],
    true
  );
  addIndex(
    schema,
    "tournament_control_template_connections",
    "tournament_control_template_connections_unique",
    ["sourceTemplateGameId", "targetTemplateGameId", "flowType"],
    true
  );

  [
    [
      "tournaments",
      "tournaments_ownerUserId_users_id_fk",
      "ownerUserId",
      "users",
      "id",
    ],
    [
      "tournament_private_invite_links",
      "tournament_private_invite_links_tournament_fk",
      "tournamentId",
      "tournaments",
      "id",
    ],
    [
      "tournament_private_invite_links",
      "tournament_private_invite_links_creator_fk",
      "createdByUserId",
      "users",
      "id",
    ],
    [
      "tournament_lobby_code_deliveries",
      "tournament_lobby_code_deliveries_game_fk",
      "gameId",
      "tournament_games",
      "id",
    ],
    [
      "tournament_lobby_code_deliveries",
      "tournament_lobby_code_deliveries_team_fk",
      "teamId",
      "teams",
      "id",
    ],
    [
      "tournament_lobby_code_deliveries",
      "tournament_lobby_code_deliveries_releaser_fk",
      "releasedByUserId",
      "users",
      "id",
    ],
    [
      "tournament_staff_members",
      "tournament_staff_members_tournamentId_tournaments_id_fk",
      "tournamentId",
      "tournaments",
      "id",
    ],
    [
      "tournament_staff_members",
      "tournament_staff_members_userId_users_id_fk",
      "userId",
      "users",
      "id",
    ],
    [
      "tournament_staff_members",
      "tournament_staff_members_addedByUserId_users_id_fk",
      "addedByUserId",
      "users",
      "id",
    ],
    [
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_tournamentId_tournaments_id_fk",
      "tournamentId",
      "tournaments",
      "id",
    ],
    [
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_createdByUserId_users_id_fk",
      "createdByUserId",
      "users",
      "id",
    ],
    [
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_acceptedByUserId_users_id_fk",
      "acceptedByUserId",
      "users",
      "id",
    ],
  ].forEach(([table, constraint, column, refTable, refColumn]) =>
    schema.foreignKeys.add(
      fkKey(table, constraint, column, refTable, refColumn)
    )
  );
  return schema;
}

function schemaConnection(schema: MockSchema) {
  return {
    execute: async (sql: string, values: string[]) => {
      if (sql.includes("information_schema.tables")) {
        return [[{ count: schema.tables.has(values[1]) ? 1 : 0 }]];
      }
      if (sql.includes("information_schema.columns")) {
        const row = schema.columns.get(columnKey(values[1], values[2]));
        return [row ? [row] : []];
      }
      if (sql.includes("information_schema.statistics")) {
        return [schema.indexes.get(indexKey(values[1], values[2])) ?? []];
      }
      if (sql.includes("information_schema.key_column_usage")) {
        return [
          [
            {
              count: schema.foreignKeys.has(
                fkKey(values[1], values[2], values[3], values[4], values[5])
              )
                ? 1
                : 0,
            },
          ],
        ];
      }
      return [[]];
    },
  } as never;
}

describe("production schema reconciliation checks", () => {
  it("accepts fully applied 0022-0025 schema without requiring 0026", async () => {
    const schema = fullSchema();
    await expect(
      assertProductionSchemaAlreadyHasMigrations(
        schemaConnection(schema),
        "app"
      )
    ).resolves.toBeUndefined();
    expect(schema.columns.has(columnKey("managed_teams", "mapBanId"))).toBe(
      false
    );
    expect(
      schema.columns.has(columnKey("tournament_games", "roundLocked"))
    ).toBe(false);
  });

  it("rejects a partially applied migration", async () => {
    const schema = fullSchema();
    schema.columns.delete(columnKey("tournament_games", "roundColor"));
    await expect(
      assertProductionSchemaAlreadyHasMigrations(
        schemaConnection(schema),
        "app"
      )
    ).rejects.toThrow(
      /Required column tournament_games\.roundColor is missing/
    );
  });

  it("rejects an incorrectly defined index or foreign key", async () => {
    const badIndex = fullSchema();
    addIndex(
      badIndex,
      "tournament_games",
      "tournament_games_round_group_idx",
      ["roundGroupId", "tournamentId"],
      false
    );
    await expect(
      assertProductionSchemaAlreadyHasMigrations(
        schemaConnection(badIndex),
        "app"
      )
    ).rejects.toThrow(
      /Required index tournament_games\.tournament_games_round_group_idx/
    );

    const badFk = fullSchema();
    badFk.foreignKeys.delete(
      fkKey(
        "tournament_staff_invite_links",
        "tournament_staff_invite_links_acceptedByUserId_users_id_fk",
        "acceptedByUserId",
        "users",
        "id"
      )
    );
    await expect(
      assertProductionSchemaAlreadyHasMigrations(schemaConnection(badFk), "app")
    ).rejects.toThrow(
      /Required foreign key tournament_staff_invite_links\.tournament_staff_invite_links_acceptedByUserId_users_id_fk/
    );
  });
});

function ledgerConnection(
  existing: Array<{ hash: string; created_at: number }>
) {
  const inserted: Array<[string, number]> = [];
  return {
    inserted,
    beginTransaction: async () => undefined,
    commit: async () => undefined,
    rollback: async () => undefined,
    query: async () => [[existing.at(-1) ?? null].filter(Boolean)],
    execute: async (sql: string, values: [string | number, number?]) => {
      if (sql.startsWith("select id, hash")) {
        return [existing.filter(row => row.created_at === values[0])];
      }
      if (sql.startsWith("insert into")) {
        inserted.push(values as [string, number]);
      }
      return [[]];
    },
  } as never as { inserted: Array<[string, number]> };
}

const entries = [
  { idx: 22, tag: "0022_add_personal_tcr", createdAt: 22, hash: "h22" },
  { idx: 23, tag: "0023_tournament_staff_invites", createdAt: 23, hash: "h23" },
  {
    idx: 24,
    tag: "0024_add_tournament_round_groups",
    createdAt: 24,
    hash: "h24",
  },
  {
    idx: 25,
    tag: "0025_add_tournament_round_group_colors",
    createdAt: 25,
    hash: "h25",
  },
];

describe("migration ledger reconciliation", () => {
  it("inserts ledger rows chronologically", async () => {
    const connection = ledgerConnection([{ hash: "h21", created_at: 21 }]);
    await reconcileLedgerEntries(connection as never, entries);
    expect(connection.inserted).toEqual([
      ["h22", 22],
      ["h23", 23],
      ["h24", 24],
      ["h25", 25],
    ]);
  });

  it("skips existing ledger rows with matching hashes", async () => {
    const connection = ledgerConnection(
      entries.map(({ hash, createdAt }) => ({ hash, created_at: createdAt }))
    );
    await reconcileLedgerEntries(connection as never, entries);
    expect(connection.inserted).toEqual([]);
  });

  it("fails existing ledger rows with mismatched hashes", async () => {
    const connection = ledgerConnection([{ hash: "wrong", created_at: 22 }]);
    await expect(
      reconcileLedgerEntries(connection as never, entries)
    ).rejects.toThrow(/unexpected hash/);
  });

  it("does not include migration 0026 in reconciliation entries", () => {
    const reconciled = assertReconciliationEntries([
      ...entries,
      {
        idx: 26,
        tag: "0026_team_bans_round_locks",
        createdAt: 26,
        hash: "h26",
      },
      {
        idx: 19,
        tag: "0019_tournament_maps_and_owners",
        createdAt: 19,
        hash: "h19",
      },
      {
        idx: 20,
        tag: "0020_add_tournament_connection_flow_type",
        createdAt: 20,
        hash: "h20",
      },
      {
        idx: 21,
        tag: "0021_add_tournament_game_broadcast_url",
        createdAt: 21,
        hash: "h21",
      },
    ]);
    expect(reconciled.map(entry => entry.tag)).not.toContain(
      "0026_team_bans_round_locks"
    );
    expect(reconciled.at(-1)?.tag).toBe(
      "0025_add_tournament_round_group_colors"
    );
  });
});
