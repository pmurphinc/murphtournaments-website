import { describe, expect, it } from "vitest";
import {
  calculateTournamentScoreboard,
  isTeamEliminated,
} from "./tournamentControlBoard";

describe("TCR elimination rules", () => {
  it("marks cashout third and fourth eliminated only without loser flow", () => {
    expect(
      isTeamEliminated({
        gameType: "cashout",
        status: "complete",
        placement: 3,
        hasOutgoingLoserConnection: false,
      })
    ).toBe(true);
    expect(
      isTeamEliminated({
        gameType: "cashout",
        status: "complete",
        placement: 4,
        hasOutgoingLoserConnection: false,
      })
    ).toBe(true);
    expect(
      isTeamEliminated({
        gameType: "cashout",
        status: "complete",
        placement: 3,
        hasOutgoingLoserConnection: true,
      })
    ).toBe(false);
    expect(
      isTeamEliminated({
        gameType: "cashout",
        status: "complete",
        placement: 2,
        hasOutgoingLoserConnection: false,
      })
    ).toBe(false);
  });

  it("marks final-round second eliminated only without loser flow", () => {
    expect(
      isTeamEliminated({
        gameType: "final_round",
        status: "complete",
        placement: 2,
        hasOutgoingLoserConnection: false,
      })
    ).toBe(true);
    expect(
      isTeamEliminated({
        gameType: "final_round",
        status: "complete",
        placement: 2,
        hasOutgoingLoserConnection: true,
      })
    ).toBe(false);
    expect(
      isTeamEliminated({
        gameType: "final_round",
        status: "complete",
        placement: 1,
        hasOutgoingLoserConnection: false,
      })
    ).toBe(false);
    expect(
      isTeamEliminated({
        gameType: "final_round",
        status: "live",
        placement: 2,
        hasOutgoingLoserConnection: false,
      })
    ).toBe(false);
    expect(
      isTeamEliminated({
        gameType: "final_round",
        status: "complete",
        placement: null,
        hasOutgoingLoserConnection: false,
      })
    ).toBe(false);
  });
});

describe("TCR scoreboard", () => {
  it("calculates cashout and final-round standings, ignores incomplete/unranked, and includes zero-result teams", () => {
    const rows = calculateTournamentScoreboard(
      [
        { id: 1, name: "The Retros" },
        { id: 2, name: "Alpha" },
        { id: 3, name: "Zero Crew" },
        { id: 4, name: "Bravo" },
      ],
      [
        { id: 10, gameType: "cashout", status: "complete" },
        { id: 11, gameType: "final_round", status: "complete" },
        { id: 12, gameType: "cashout", status: "live" },
      ],
      [
        { gameId: 10, teamId: 1, resultPlacement: 1 },
        { gameId: 10, teamId: 2, resultPlacement: 3 },
        { gameId: 11, teamId: 1, resultPlacement: 2 },
        { gameId: 11, teamId: 4, resultPlacement: 1 },
        { gameId: 12, teamId: 2, resultPlacement: 1 },
        { gameId: 10, teamId: 3, resultPlacement: null },
      ]
    );

    expect(rows).toEqual([
      {
        teamId: 4,
        teamName: "Bravo",
        wins: 1,
        losses: 0,
        cashoutWins: 0,
        cashoutLosses: 0,
        finalRoundWins: 1,
        finalRoundLosses: 0,
      },
      {
        teamId: 1,
        teamName: "The Retros",
        wins: 1,
        losses: 1,
        cashoutWins: 1,
        cashoutLosses: 0,
        finalRoundWins: 0,
        finalRoundLosses: 1,
      },
      {
        teamId: 3,
        teamName: "Zero Crew",
        wins: 0,
        losses: 0,
        cashoutWins: 0,
        cashoutLosses: 0,
        finalRoundWins: 0,
        finalRoundLosses: 0,
      },
      {
        teamId: 2,
        teamName: "Alpha",
        wins: 0,
        losses: 1,
        cashoutWins: 0,
        cashoutLosses: 1,
        finalRoundWins: 0,
        finalRoundLosses: 0,
      },
    ]);
  });
});
