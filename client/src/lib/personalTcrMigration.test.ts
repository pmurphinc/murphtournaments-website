import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getSafeTournamentControlErrorMessage, tournamentControlUnavailableMessage } from "./tcrError";

const migrationSql = readFileSync("drizzle/0022_add_personal_tcr.sql", "utf8");
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as { entries: Array<{ tag: string }> };
const snapshot = JSON.parse(readFileSync("drizzle/meta/0022_snapshot.json", "utf8")) as { tables: Record<string, { columns: Record<string, unknown>; indexes?: Record<string, unknown> }> };
const schemaSource = readFileSync("drizzle/schema.ts", "utf8");

describe("Personal TCR migration integrity", () => {
  it("registers the Personal TCR migration exactly once in the Drizzle journal", () => {
    expect(journal.entries.filter(entry => entry.tag === "0022_add_personal_tcr")).toHaveLength(1);
  });

  it("does not duplicate Personal TCR DDL across migrations", () => {
    const allMigrationSql = [
      "visibility enum('private','public') NOT NULL DEFAULT 'private' AFTER registrationOpen",
      "publicSlug varchar(120)",
      "CREATE TABLE tournament_private_invite_links",
      "CREATE TABLE tournament_lobby_code_deliveries",
    ];

    for (const needle of allMigrationSql) {
      expect((migrationSql.match(new RegExp(needle.replace(/[()]/g, "\\$&"), "g")) ?? []).length).toBe(1);
    }
  });

  it("contains the Personal TCR columns, indexes, unique constraints, and tables", () => {
    expect(migrationSql).toContain("ADD COLUMN visibility enum('private','public') NOT NULL DEFAULT 'private'");
    expect(migrationSql).toContain("ADD COLUMN publicSlug varchar(120) DEFAULT NULL");
    expect(migrationSql).toContain("ADD COLUMN publishedAt timestamp NULL DEFAULT NULL");
    expect(migrationSql).toContain("ADD COLUMN maxTeams int DEFAULT NULL");
    expect(migrationSql).toContain("CREATE UNIQUE INDEX tournaments_publicSlug_unique ON tournaments (publicSlug)");
    expect(migrationSql).toContain("CREATE INDEX tournaments_visibility_published_idx ON tournaments (visibility, publishedAt)");
    expect(migrationSql).toContain("CREATE INDEX tournaments_owner_visibility_idx ON tournaments (ownerUserId, visibility)");
    expect(migrationSql).toContain("CONSTRAINT tournament_private_invite_links_tournament_fk FOREIGN KEY (tournamentId) REFERENCES tournaments(id) ON DELETE CASCADE");
    expect(migrationSql).toContain("CONSTRAINT tournament_lobby_code_deliveries_game_fk FOREIGN KEY (gameId) REFERENCES tournament_games(id) ON DELETE CASCADE");
  });

  it("keeps schema and snapshot metadata aligned with Personal TCR fields", () => {
    for (const columnName of ["visibility", "publicSlug", "publishedAt", "maxTeams"]) {
      expect(snapshot.tables.tournaments.columns).toHaveProperty(columnName);
      expect(schemaSource).toContain(`${columnName}:`);
    }
    expect(snapshot.tables).toHaveProperty("tournament_private_invite_links");
    expect(snapshot.tables).toHaveProperty("tournament_lobby_code_deliveries");
    expect(schemaSource).toContain('uniqueIndex("tournaments_publicSlug_unique")');
    expect(schemaSource).toContain('index("tournaments_visibility_published_idx")');
    expect(schemaSource).toContain('index("tournaments_owner_visibility_idx")');
  });
});

describe("TCR unavailable presentation", () => {
  it("hides raw SQL and database-driver details from public TCR error states", () => {
    const rawError = "Unknown column 'tournaments.visibility' in 'field list': select `id`, `visibility` from `tournaments`";
    const safeMessage = getSafeTournamentControlErrorMessage(rawError);
    expect(safeMessage).toBe(tournamentControlUnavailableMessage);
    expect(safeMessage).not.toMatch(/select|visibility|unknown column/i);
  });

  it("preserves useful authorization messages", () => {
    expect(getSafeTournamentControlErrorMessage("Tournament Control role required.")).toBe("Tournament Control role required.");
  });
});
