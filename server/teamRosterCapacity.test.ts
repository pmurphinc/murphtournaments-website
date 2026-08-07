import { describe, expect, it } from "vitest";
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
});
