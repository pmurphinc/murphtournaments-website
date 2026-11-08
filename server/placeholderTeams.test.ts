import { describe, expect, it } from "vitest";
import {
  PERSONAL_TCR_LIMITS,
  nextPlaceholderTeamNames,
} from "./tournamentControl";

/**
 * Seating a lobby of placeholder teams in one click. The numbering is the
 * part that can go quietly wrong: a batch that restarts at 1, or that
 * picks a name somebody already typed, fails the unique-name check and
 * takes the whole batch down with it.
 */

describe("placeholder team names", () => {
  it("starts at 1 on an empty board", () => {
    expect(nextPlaceholderTeamNames([], 4)).toEqual([
      "Team 1",
      "Team 2",
      "Team 3",
      "Team 4",
    ]);
  });

  it("continues from the highest number already there", () => {
    expect(
      nextPlaceholderTeamNames(["Team 1", "Team 2", "Team 3", "Team 4"], 4)
    ).toEqual(["Team 5", "Team 6", "Team 7", "Team 8"]);
  });

  // Teams get deleted mid-setup, and the next batch should not reuse a
  // number that is still visible further down the board.
  it("counts from the highest, not the count", () => {
    expect(nextPlaceholderTeamNames(["Team 1", "Team 9"], 2)).toEqual([
      "Team 10",
      "Team 11",
    ]);
  });

  it("works around a name somebody typed by hand", () => {
    const names = nextPlaceholderTeamNames(["Team 2"], 3);
    expect(names).not.toContain("Team 2");
    expect(new Set(names).size).toBe(3);
  });

  it("ignores case and padding when deciding what is taken", () => {
    const names = nextPlaceholderTeamNames(["  tEaM 3  "], 1);
    expect(names).toEqual(["Team 4"]);
  });

  it("leaves real team names alone", () => {
    expect(nextPlaceholderTeamNames(["Alpha Squad", "Team Rocket"], 2)).toEqual(
      ["Team 1", "Team 2"]
    );
  });

  it("never repeats a name inside one batch", () => {
    const names = nextPlaceholderTeamNames([], 8);
    expect(new Set(names).size).toBe(8);
  });

  it("can fill a board to the ceiling in one call", () => {
    const names = nextPlaceholderTeamNames(
      [],
      PERSONAL_TCR_LIMITS.teamsPerTournament
    );
    expect(names).toHaveLength(PERSONAL_TCR_LIMITS.teamsPerTournament);
    expect(names[names.length - 1]).toBe(
      `Team ${PERSONAL_TCR_LIMITS.teamsPerTournament}`
    );
  });
});

describe("the batch is one server call", () => {
  /**
   * Looping createTeam on the client would produce one board revision and
   * one undo entry per team, so undoing "add 8 teams" would take eight
   * presses. The handler inserts them inside a single board mutation.
   */
  it("inserts inside one board mutation and reports what it added", async () => {
    const source = await import("node:fs").then(fs =>
      fs.readFileSync(
        new URL("./tournamentControl.ts", import.meta.url),
        "utf8"
      )
    );
    const handler = source.slice(
      source.indexOf("async function createPlaceholderTeamsAndFetch"),
      source.indexOf("async function setTournamentRegistrationOpenAndFetch")
    );
    expect(handler).toContain("runBoardMutationAndFetch");
    expect(handler).toContain("createdTeamCount");
    // Adds what fits rather than refusing the whole batch.
    expect(handler).toContain("Math.min(input.count, room)");
    // Admins are exempt from the ceiling here as they are everywhere else.
    expect(handler).toContain('input.user?.role === "admin"');
  });
});
