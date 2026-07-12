import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { addColumnIfMissing, addIndexIfMissing } from "../../../server/db";

const migrationSql = readFileSync(
  "drizzle/0024_add_tournament_round_groups.sql",
  "utf8"
);
const journal = JSON.parse(
  readFileSync("drizzle/meta/_journal.json", "utf8")
) as {
  entries: Array<{ idx: number; tag: string }>;
};

type MockDb = Parameters<typeof addColumnIfMissing>[0];

function createMockDb(existing: boolean) {
  const statements: unknown[] = [];
  let calls = 0;
  const db = {
    execute: async (query: unknown) => {
      statements.push(query);
      calls += 1;
      if (calls === 1) return existing ? [[{ found: 1 }]] : [[]];
      return [[]];
    },
  } as unknown as MockDb;
  return { db, statements };
}

describe("Tournament round-group migration", () => {
  it("registers migration 0024 exactly once in the Drizzle journal", () => {
    expect(
      journal.entries.filter(
        entry => entry.tag === "0024_add_tournament_round_groups"
      )
    ).toHaveLength(1);
    expect(
      journal.entries.find(
        entry => entry.tag === "0024_add_tournament_round_groups"
      )
    ).toMatchObject({ idx: 24 });
  });

  it("adds all round fields and the round-group index", () => {
    for (const ddl of [
      "ADD COLUMN `roundGroupId` varchar(64)",
      "ADD COLUMN `roundLabel` varchar(80)",
      "CREATE INDEX `tournament_games_round_group_idx`",
      "ON `tournament_games` (`tournamentId`, `roundGroupId`)",
      "ALTER TABLE `tournament_control_template_games`",
    ]) {
      expect(migrationSql).toContain(ddl);
    }
  });

  it("keeps startup column compatibility checks idempotent", async () => {
    const { db, statements } = createMockDb(true);
    await addColumnIfMissing(
      db,
      "tournament_games",
      "roundGroupId",
      "varchar(64)"
    );
    expect(statements).toHaveLength(1);
  });

  it("keeps startup index compatibility checks idempotent", async () => {
    const { db, statements } = createMockDb(true);
    await addIndexIfMissing(
      db,
      "tournament_games",
      "tournament_games_round_group_idx",
      "(`tournamentId`, `roundGroupId`)"
    );
    expect(statements).toHaveLength(1);
  });
});
