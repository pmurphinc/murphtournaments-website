import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertManagedTeamRosterCapacity,
  MANAGED_TEAM_ROSTER_LIMIT,
} from "./teamManagement";

describe("managed team roster capacity", () => {
  it.each([0, 3, 8, 9])(
    "accepts a smaller roster of %i before adding a player",
    count => {
      expect(() => assertManagedTeamRosterCapacity(count)).not.toThrow();
    }
  );

  it("accepts the tenth rostered player", () => {
    expect(MANAGED_TEAM_ROSTER_LIMIT).toBe(10);
    expect(() => assertManagedTeamRosterCapacity(9)).not.toThrow();
  });

  it("rejects an eleventh rostered player with a useful message", () => {
    expect(() => assertManagedTeamRosterCapacity(10)).toThrow(
      "A team can have at most 10 rostered players."
    );
  });

  it("does not derive roster capacity from an active game mode", () => {
    expect(MANAGED_TEAM_ROSTER_LIMIT).toBeGreaterThan(8);
  });

  it("serializes concurrent roster additions and uses a locking current read", () => {
    const source = readFileSync("server/teamManagement.ts", "utf8");
    expect(source).toContain(
      "SELECT id FROM managed_teams WHERE id = ${teamId} FOR UPDATE"
    );
    expect(source).toContain(
      "SELECT id FROM managed_team_members WHERE teamId = ${teamId} FOR UPDATE"
    );
    expect(source).toContain(
      "await assertTeamHasRosterCapacity(tx, invite.teamId)"
    );
    expect(source).toContain(
      "await assertTeamHasRosterCapacity(tx, link.teamId)"
    );
  });

  it("counts the captain membership but not ownership metadata", () => {
    const source = readFileSync("server/teamManagement.ts", "utf8");
    expect(source).toContain(
      '.values({ teamId: team.id, userId, role: "captain" })'
    );
    expect(source).toContain(
      "SELECT id FROM managed_team_members WHERE teamId = ${teamId} FOR UPDATE"
    );
    expect(source).not.toContain("ownerUserId");
  });
});
