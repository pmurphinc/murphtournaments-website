import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_COMPETITIVE_MAP_IDS, THE_FINALS_MAPS } from "./finalsMaps";

describe("TCR competitive map filtering", () => {
  it("renders every competitive-pool map and excludes archive-only maps", () => {
    const source = readFileSync(
      "client/src/pages/TournamentControlRoom.tsx",
      "utf8"
    );
    expect(source).toContain("competitiveTcrMaps = THE_FINALS_MAPS.filter");
    expect(source).toContain("DEFAULT_COMPETITIVE_MAP_IDS.includes(map.id)");
    const competitive = THE_FINALS_MAPS.filter(map =>
      DEFAULT_COMPETITIVE_MAP_IDS.includes(map.id)
    );
    expect(competitive.map(map => map.id)).toEqual(DEFAULT_COMPETITIVE_MAP_IDS);
    expect(
      THE_FINALS_MAPS.filter(
        map => !DEFAULT_COMPETITIVE_MAP_IDS.includes(map.id)
      ).some(map => map.category === "compact" || map.category === "training")
    ).toBe(true);
  });

  it("keeps randomization and server validation limited to the competitive pool", () => {
    const server = readFileSync("server/tournamentControl.ts", "utf8");
    expect(server).toContain(
      "const validMapIds = new Set<string>(DEFAULT_COMPETITIVE_MAP_IDS)"
    );
    expect(server).toContain("validMapIds.has(value)");
    expect(server).toContain("drawUniqueMaps(DEFAULT_COMPETITIVE_MAP_IDS, 1)");
  });

  it("preserves legacy saved maps as a non-crashing option", () => {
    const source = readFileSync(
      "client/src/pages/TournamentControlRoom.tsx",
      "utf8"
    );
    expect(source).toContain("Legacy map:");
    expect(source).toContain("!competitiveTcrMapIds.has(game.mapId)");
  });
});

describe("TCR staff invite security wiring", () => {
  it("uses hashed, expiring, single-use staff invite links", () => {
    const schema = readFileSync("drizzle/schema.ts", "utf8");
    const server = readFileSync("server/tournamentControl.ts", "utf8");
    expect(schema).toContain("tournament_staff_members");
    expect(schema).toContain("tournament_staff_invite_links");
    expect(schema).toContain('tokenHash: varchar("tokenHash", { length: 64 })');
    expect(schema).toContain('expiresAt: timestamp("expiresAt").notNull()');
    expect(server).toContain('randomBytes(32).toString("base64url")');
    expect(server).toContain("tokenHash: hashToken(token)");
    expect(server).toContain('status: "accepted"');
    expect(server).not.toContain("rawToken");
  });

  it("allows collaborators to manage TCR while keeping staff invites owner-only", () => {
    const server = readFileSync("server/tournamentControl.ts", "utf8");
    expect(server).toContain("getManageableTournamentOrThrow");
    expect(server).toContain("hasTournamentStaffMembership");
    expect(server).toContain(
      "await getOwnedTournamentOrThrow(db, tournamentId, user)"
    );
    expect(server).toContain(
      "Tournament owners cannot accept their own staff invite"
    );
  });
});
