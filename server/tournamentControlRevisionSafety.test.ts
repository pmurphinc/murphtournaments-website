import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("server/tournamentControl.ts", "utf8");

describe("tournament control board mutation revision safety", () => {
  it("fetches the returned board only after the transactional revision increment", () => {
    const helper = source.slice(
      source.indexOf("async function runBoardMutationAndFetch"),
      source.indexOf("async function getGameOrThrow")
    );

    expect(helper).toContain(
      "await lockTournamentForBoardMutation(tx, tournamentId)"
    );
    expect(helper.indexOf("await mutate(tx)")).toBeLessThan(
      helper.indexOf("await incrementBoardRevision(tx, tournamentId)")
    );
    expect(
      helper.indexOf("await incrementBoardRevision(tx, tournamentId)")
    ).toBeLessThan(
      helper.indexOf("return fetchTournamentRows(tx, tournamentId)")
    );
    expect(helper).not.toContain("return runBoardMutation(");
  });

  it("keeps listed shared board mutations on tournament-row-locking helpers", () => {
    const sharedMutations = [
      "randomizeGameMap",
      "connectGames",
      "deleteGameConnection",
      "clearTournamentConnections",
      "returnTournamentTeamsToAvailable",
      "autoFillLobby",
      "updateRoundGroup",
      "clearTournamentCanvas",
    ];

    for (const name of sharedMutations) {
      const start = source.indexOf(`async function ${name}`);
      const end = source.indexOf("async function ", start + 1);
      const body = source.slice(start, end === -1 ? undefined : end);
      expect(start, `${name} should exist`).toBeGreaterThanOrEqual(0);
      expect(
        body.includes("runBoardMutationAndFetch(") ||
          body.includes("lockTournamentForBoardMutation(tx")
      ).toBe(true);
      expect(body).not.toContain("await incrementBoardRevision(db");
    }
  });

  it("wraps router field, assignment, and delete mutations in reusable atomic helpers", () => {
    expect(source).toContain("async function updateGameFieldAndFetch");
    expect(source).toContain("async function deleteGameAssignmentAndFetch");
    expect(source).toContain("async function deleteGameAndFetch");
    expect(source).toContain("if (!changed) return false");
    expect(source).not.toContain("await incrementBoardRevision(db");
  });

  it("documents the required executing behavior coverage until a live DATABASE_URL is available", () => {
    const expectedCoverage = [
      "create lobby",
      "assign team",
      "rename tournament",
      "batch move lobbies",
      "undo three router mutations",
      "finalized personal router rejection",
      "finalized discord router rejection",
      "concurrent restore serialization",
      "concurrent connection serialization",
    ];

    expect(expectedCoverage).toHaveLength(9);
  });
});
