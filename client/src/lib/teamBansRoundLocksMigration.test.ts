import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationSql = readFileSync(
  "drizzle/0026_team_bans_round_locks.sql",
  "utf8"
);

const expectedStatements = [
  "ALTER TABLE `managed_teams` ADD `mapBanId` varchar(64);",
  "ALTER TABLE `tournament_games` ADD `roundLocked` int NOT NULL DEFAULT 0;",
  "ALTER TABLE `tournament_control_template_games` ADD `roundLocked` int NOT NULL DEFAULT 0;",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("Team bans and round locks migration", () => {
  it("formats migration 0026 as three independently executable Drizzle statements", () => {
    const sections = migrationSql
      .split("--> statement-breakpoint")
      .map(section => section.trim())
      .filter(Boolean);

    expect(sections).toHaveLength(3);
    expect(migrationSql.match(/--> statement-breakpoint/g) ?? []).toHaveLength(
      2
    );
    expect(sections).toEqual(expectedStatements);
  });

  it("contains each expected ALTER TABLE statement exactly once", () => {
    for (const statement of expectedStatements) {
      expect(
        migrationSql.match(new RegExp(escapeRegExp(statement), "g")) ?? []
      ).toHaveLength(1);
    }
  });

  it("does not introduce destructive or data-changing statements", () => {
    expect(migrationSql).not.toMatch(/\bDROP\b/i);
    expect(migrationSql).not.toMatch(/\bUPDATE\b/i);
    expect(migrationSql).not.toMatch(/\bDELETE\b/i);
  });
});
