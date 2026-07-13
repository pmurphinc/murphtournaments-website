import { describe, expect, it } from "vitest";

import { repairMissing0023TournamentStaff } from "../../../scripts/repair-missing-0023-tournament-staff";

type Col = {
  columnName?: string;
  columnType: string;
  isNullable: "YES" | "NO";
  columnDefault: string | Buffer | null;
  extra: string | Buffer;
};
type Schema = {
  tables: Set<string>;
  columns: Map<string, Col>;
  indexes: Map<string, Array<{ columnName: string; nonUnique: 0 | 1 }>>;
  fks: Map<
    string,
    {
      columnName: string;
      referencedTableName: string;
      referencedColumnName: string;
      deleteRule: string;
      updateRule: string;
    }
  >;
  data: Map<string, unknown[]>;
  sql: string[];
  ledgerWrites: number;
};
const ck = (t: string, c: string) => `${t}.${c}`;
const ik = (t: string, i: string) => `${t}.${i}`;
const fk = (t: string, n: string) => `${t}.${n}`;
function addCol(
  s: Schema,
  t: string,
  c: string,
  type = "int",
  nullable: "YES" | "NO" = "YES",
  def: string | Buffer | null = null,
  extra: string | Buffer = ""
) {
  s.columns.set(ck(t, c), {
    columnName: c,
    columnType: type,
    isNullable: nullable,
    columnDefault: def,
    extra,
  });
}

function setDefault(
  s: Schema,
  table: string,
  column: string,
  value: string | Buffer | null
) {
  const col = s.columns.get(ck(table, column));
  if (!col) throw new Error(`Missing test column ${table}.${column}`);
  col.columnDefault = value;
}
function setExtra(
  s: Schema,
  table: string,
  column: string,
  value: string | Buffer
) {
  const col = s.columns.get(ck(table, column));
  if (!col) throw new Error(`Missing test column ${table}.${column}`);
  col.extra = value;
}
function destructiveSql(sql: string) {
  return /\b(drop|truncate)\b|\bdelete\s+from\b|^\s*update\s+/i.test(sql);
}
function addIdx(
  s: Schema,
  t: string,
  i: string,
  cols: string[],
  unique = false
) {
  s.indexes.set(
    ik(t, i),
    cols.map(columnName => ({ columnName, nonUnique: unique ? 0 : 1 }))
  );
}
function addFk(
  s: Schema,
  t: string,
  n: string,
  c: string,
  rt: string,
  rc = "id",
  dr = "NO ACTION",
  ur = "NO ACTION"
) {
  s.fks.set(fk(t, n), {
    columnName: c,
    referencedTableName: rt,
    referencedColumnName: rc,
    deleteRule: dr,
    updateRule: ur,
  });
}
function base() {
  const s: Schema = {
    tables: new Set([
      "tournaments",
      "users",
      "tournament_games",
      "tournament_control_template_games",
      "tournament_private_invite_links",
      "tournament_lobby_code_deliveries",
    ]),
    columns: new Map(),
    indexes: new Map(),
    fks: new Map(),
    data: new Map([
      [
        "tournament_games",
        [{ id: 1, roundGroupId: "finals", roundColor: "red" }],
      ],
    ]),
    sql: [],
    ledgerWrites: 0,
  };
  addCol(
    s,
    "tournaments",
    "visibility",
    "enum('private','public')",
    "NO",
    "private"
  );
  addCol(s, "tournaments", "publicSlug", "varchar(120)");
  addCol(s, "tournaments", "publishedAt", "timestamp");
  addCol(s, "tournaments", "maxTeams", "int");
  addIdx(
    s,
    "tournaments",
    "tournaments_publicSlug_unique",
    ["publicSlug"],
    true
  );
  addIdx(s, "tournaments", "tournaments_visibility_published_idx", [
    "visibility",
    "publishedAt",
  ]);
  addIdx(s, "tournaments", "tournaments_owner_visibility_idx", [
    "ownerUserId",
    "visibility",
  ]);
  addCol(s, "tournament_games", "roundGroupId", "varchar(64)");
  addCol(s, "tournament_games", "roundLabel", "varchar(80)");
  addCol(s, "tournament_control_template_games", "roundGroupId", "varchar(64)");
  addCol(s, "tournament_control_template_games", "roundLabel", "varchar(80)");
  addCol(s, "tournament_games", "roundColor", "varchar(24)");
  addCol(s, "tournament_control_template_games", "roundColor", "varchar(24)");
  addIdx(s, "tournament_games", "tournament_games_round_group_idx", [
    "tournamentId",
    "roundGroupId",
  ]);
  return s;
}
function add0023(s: Schema, partial = false) {
  s.tables.add("tournament_staff_members");
  [
    ["id", "int", "NO", null, "auto_increment"],
    ["tournamentId", "int", "NO", null, ""],
    ["userId", "int", "NO", null, ""],
    ["role", "enum('collaborator')", "NO", "collaborator", ""],
    ["addedByUserId", "int", "NO", null, ""],
    ["createdAt", "timestamp", "NO", "CURRENT_TIMESTAMP", ""],
    [
      "updatedAt",
      "timestamp",
      "NO",
      "CURRENT_TIMESTAMP",
      "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    ],
  ].forEach(([c, t, n, d, e]) =>
    addCol(s, "tournament_staff_members", c!, t!, n as never, d as never, e!)
  );
  addIdx(s, "tournament_staff_members", "PRIMARY", ["id"], true);
  addIdx(
    s,
    "tournament_staff_members",
    "tournament_staff_members_tournament_user_unique",
    ["tournamentId", "userId"],
    true
  );
  if (!partial) {
    addIdx(
      s,
      "tournament_staff_members",
      "tournament_staff_members_tournament_idx",
      ["tournamentId"]
    );
    addIdx(s, "tournament_staff_members", "tournament_staff_members_user_idx", [
      "userId",
    ]);
    addFk(
      s,
      "tournament_staff_members",
      "tournament_staff_members_tournamentId_tournaments_id_fk",
      "tournamentId",
      "tournaments",
      "id",
      "CASCADE"
    );
    addFk(
      s,
      "tournament_staff_members",
      "tournament_staff_members_userId_users_id_fk",
      "userId",
      "users",
      "id",
      "CASCADE"
    );
    addFk(
      s,
      "tournament_staff_members",
      "tournament_staff_members_addedByUserId_users_id_fk",
      "addedByUserId",
      "users"
    );
  }
  s.tables.add("tournament_staff_invite_links");
  [
    ["id", "int", "NO", null, "auto_increment"],
    ["tournamentId", "int", "NO", null, ""],
    ["createdByUserId", "int", "NO", null, ""],
    ["tokenHash", "varchar(64)", "NO", null, ""],
    ["status", "enum('active','accepted','revoked')", "NO", "active", ""],
    ["expiresAt", "timestamp", "NO", null, ""],
    ["acceptedByUserId", "int", "YES", null, ""],
    ["createdAt", "timestamp", "NO", "CURRENT_TIMESTAMP", ""],
    [
      "updatedAt",
      "timestamp",
      "NO",
      "CURRENT_TIMESTAMP",
      "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    ],
  ].forEach(([c, t, n, d, e]) =>
    addCol(
      s,
      "tournament_staff_invite_links",
      c!,
      t!,
      n as never,
      d as never,
      e!
    )
  );
  addIdx(s, "tournament_staff_invite_links", "PRIMARY", ["id"], true);
  addIdx(
    s,
    "tournament_staff_invite_links",
    "tournament_staff_invite_links_tokenHash_unique",
    ["tokenHash"],
    true
  );
  if (!partial) {
    addIdx(
      s,
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_tournament_status_idx",
      ["tournamentId", "status"]
    );
    addIdx(
      s,
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_status_expires_idx",
      ["status", "expiresAt"]
    );
    addFk(
      s,
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_tournamentId_tournaments_id_fk",
      "tournamentId",
      "tournaments",
      "id",
      "CASCADE"
    );
    addFk(
      s,
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_createdByUserId_users_id_fk",
      "createdByUserId",
      "users"
    );
    addFk(
      s,
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_acceptedByUserId_users_id_fk",
      "acceptedByUserId",
      "users"
    );
  }
}
function conn(s: Schema) {
  return {
    beginTransaction: async () => s.sql.push("begin"),
    commit: async () => s.sql.push("commit"),
    rollback: async () => s.sql.push("rollback"),
    end: async () => {},
    query: async () => [[{ databaseName: "app" }]],
    execute: async (sql: string, vals?: string[]) => {
      s.sql.push(sql);
      if (sql.includes("__drizzle_migrations")) {
        s.ledgerWrites++;
        return [[]];
      }
      if (sql.includes("information_schema.tables"))
        return [[{ count: s.tables.has(vals![1]) ? 1 : 0 }]];
      if (sql.includes("information_schema.columns"))
        return [[s.columns.get(ck(vals![1], vals![2]))].filter(Boolean)];
      if (sql.includes("information_schema.statistics"))
        return [s.indexes.get(ik(vals![1], vals![2])) ?? []];
      if (sql.includes("key_column_usage")) {
        const row = s.fks.get(fk(vals![1], vals![2]));
        return [row ? [row] : []];
      }
      if (sql.startsWith("CREATE TABLE `tournament_staff_members`")) {
        add0023(s, true);
        return [[]];
      }
      if (sql.startsWith("CREATE TABLE `tournament_staff_invite_links`")) {
        return [[]];
      }
      if (sql.startsWith("ALTER TABLE")) {
        const m = sql.match(
          /`([^`]+)` ADD CONSTRAINT `([^`]+)` FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)`\(`([^`]+)`\) ON DELETE (cascade|no action)/
        )!;
        addFk(s, m[1], m[2], m[3], m[4], m[5], m[6].toUpperCase());
        return [[]];
      }
      if (sql.startsWith("CREATE INDEX")) {
        const m = sql.match(/CREATE INDEX `([^`]+)` ON `([^`]+)` \((.+)\)/)!;
        addIdx(
          s,
          m[2],
          m[1],
          [...m[3].matchAll(/`([^`]+)`/g)].map(x => x[1])
        );
        return [[]];
      }
      return [[]];
    },
  } as never;
}

describe("repair missing 0023 tournament staff", () => {
  it("creates all 0023 artifacts in the expected 0023-absent/0024-present state", async () => {
    const s = base();
    const r = await repairMissing0023TournamentStaff(conn(s));
    expect(r.createdArtifacts.length).toBeGreaterThan(0);
    expect(s.tables.has("tournament_staff_members")).toBe(true);
    expect(
      s.fks.has(
        fk(
          "tournament_staff_invite_links",
          "tournament_staff_invite_links_acceptedByUserId_users_id_fk"
        )
      )
    ).toBe(true);
  });
  it("is idempotent when 0023 is fully repaired", async () => {
    const s = base();
    add0023(s);
    const r = await repairMissing0023TournamentStaff(conn(s));
    expect(r.createdArtifacts).toEqual([]);
    expect(
      s.sql.some(x => x.startsWith("CREATE") || x.startsWith("ALTER TABLE"))
    ).toBe(false);
  });
  it("preserves correct partial artifacts and creates missing ones", async () => {
    const s = base();
    add0023(s, true);
    const r = await repairMissing0023TournamentStaff(conn(s));
    expect(r.createdArtifacts.some(x => x.includes("foreign key"))).toBe(true);
    expect(
      s.indexes.has(
        ik(
          "tournament_staff_members",
          "tournament_staff_members_tournament_idx"
        )
      )
    ).toBe(true);
  });
  it("fails on incorrect existing table definitions", async () => {
    const s = base();
    add0023(s);
    addCol(
      s,
      "tournament_staff_members",
      "role",
      "varchar(20)",
      "NO",
      "collaborator"
    );
    await expect(repairMissing0023TournamentStaff(conn(s))).rejects.toThrow(
      /unexpected definition/
    );
  });
  it("fails on incorrect existing indexes", async () => {
    const s = base();
    add0023(s);
    addIdx(s, "tournament_staff_members", "tournament_staff_members_user_idx", [
      "tournamentId",
    ]);
    await expect(repairMissing0023TournamentStaff(conn(s))).rejects.toThrow(
      /unexpected definition/
    );
  });
  it("fails on incorrect existing foreign keys", async () => {
    const s = base();
    add0023(s);
    addFk(
      s,
      "tournament_staff_invite_links",
      "tournament_staff_invite_links_acceptedByUserId_users_id_fk",
      "acceptedByUserId",
      "tournaments"
    );
    await expect(repairMissing0023TournamentStaff(conn(s))).rejects.toThrow(
      /unexpected definition/
    );
  });
  it("fails before changes when a prerequisite table is missing", async () => {
    const s = base();
    s.tables.delete("users");
    await expect(repairMissing0023TournamentStaff(conn(s))).rejects.toThrow(
      /users is missing/
    );
    expect(s.sql.some(x => x.startsWith("CREATE TABLE"))).toBe(false);
  });
  it("never writes the migration ledger or creates 0026 artifacts", async () => {
    const s = base();
    await repairMissing0023TournamentStaff(conn(s));
    expect(s.ledgerWrites).toBe(0);
    expect(s.sql.join("\n")).not.toMatch(
      /0026|mapBanId|roundLocked|__drizzle_migrations/
    );
  });
  it("leaves existing 0024\/0025 data and schema untouched", async () => {
    const s = base();
    const before = JSON.stringify([...s.data]);
    await repairMissing0023TournamentStaff(conn(s));
    expect(JSON.stringify([...s.data])).toBe(before);
    expect(s.columns.has(ck("tournament_games", "roundColor"))).toBe(true);
    expect(
      s.indexes.has(ik("tournament_games", "tournament_games_round_group_idx"))
    ).toBe(true);
  });
  it.each([
    "CURRENT_TIMESTAMP",
    "CURRENT_TIMESTAMP()",
    "current_timestamp()",
    "(current_timestamp())",
    Buffer.from("(current_timestamp())"),
  ])("accepts equivalent timestamp default %#", async value => {
    const s = base();
    add0023(s);
    for (const table of [
      "tournament_staff_members",
      "tournament_staff_invite_links",
    ]) {
      setDefault(s, table, "createdAt", value);
      setDefault(s, table, "updatedAt", value);
    }
    await expect(repairMissing0023TournamentStaff(conn(s))).resolves.toEqual({
      createdArtifacts: [],
      databaseName: "app",
    });
  });

  it.each([
    "DEFAULT_GENERATED on update CURRENT_TIMESTAMP",
    "on update CURRENT_TIMESTAMP",
    "on update current_timestamp()",
    "DEFAULT_GENERATED ON UPDATE (current_timestamp())",
    Buffer.from("default_generated   on   update   current_timestamp()"),
  ])("accepts equivalent updatedAt EXTRA %#", async value => {
    const s = base();
    add0023(s);
    for (const table of [
      "tournament_staff_members",
      "tournament_staff_invite_links",
    ])
      setExtra(s, table, "updatedAt", value);
    await expect(repairMissing0023TournamentStaff(conn(s))).resolves.toEqual({
      createdArtifacts: [],
      databaseName: "app",
    });
  });

  it("rejects updatedAt when ON UPDATE behavior is missing", async () => {
    const s = base();
    add0023(s);
    setExtra(s, "tournament_staff_members", "updatedAt", "DEFAULT_GENERATED");
    await expect(repairMissing0023TournamentStaff(conn(s))).rejects.toThrow(
      /updatedAt.*unexpected definition.*extra/s
    );
  });

  it("keeps ordinary string defaults strictly validated", async () => {
    const s = base();
    add0023(s);
    setDefault(s, "tournament_staff_members", "role", "COLLABORATOR");
    await expect(repairMissing0023TournamentStaff(conn(s))).rejects.toThrow(
      /role.*default=.*COLLABORATOR.*expected.*collaborator/is
    );
  });

  it("accepts rerun after tables were created before a previous post-verification failure", async () => {
    const s = base();
    add0023(s, true);
    for (const table of [
      "tournament_staff_members",
      "tournament_staff_invite_links",
    ]) {
      setDefault(s, table, "createdAt", "(current_timestamp())");
      setDefault(s, table, "updatedAt", Buffer.from("current_timestamp()"));
      setExtra(s, table, "updatedAt", "on update current_timestamp()");
    }
    const r = await repairMissing0023TournamentStaff(conn(s));
    expect(r.createdArtifacts).toEqual(
      expect.arrayContaining([
        "foreign key tournament_staff_members.tournament_staff_members_tournamentId_tournaments_id_fk",
        "index tournament_staff_members.tournament_staff_members_tournament_idx",
      ])
    );
    expect(s.sql.some(x => x.startsWith("CREATE TABLE"))).toBe(false);
  });

  it("does not run destructive SQL while repairing missing 0023 artifacts", async () => {
    const s = base();
    await repairMissing0023TournamentStaff(conn(s));
    expect(s.sql.filter(destructiveSql)).toEqual([]);
  });
});
