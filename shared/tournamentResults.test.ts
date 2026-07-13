import { describe, expect, it } from "vitest";
import { calculateTournamentScoreboard } from "./tournamentResults";

const teams = [
  { id: 1, name: "Alpha" },
  { id: 2, name: "Bravo" },
  { id: 3, name: "Charlie" },
  { id: 4, name: "Delta" },
];

describe("calculateTournamentScoreboard", () => {
  it("preserves cashout and final-round win/loss rules", () => {
    const rows = calculateTournamentScoreboard(
      teams,
      [
        { id: 10, gameType: "cashout", status: "complete" },
        { id: 11, gameType: "final_round", status: "complete" },
        { id: 12, gameType: "cashout", status: "live" },
      ],
      [
        { gameId: 10, teamId: 1, resultPlacement: 1 },
        { gameId: 10, teamId: 2, resultPlacement: 2 },
        { gameId: 10, teamId: 3, resultPlacement: 3 },
        { gameId: 10, teamId: 4, resultPlacement: 4 },
        { gameId: 11, teamId: 1, resultPlacement: 1 },
        { gameId: 11, teamId: 2, resultPlacement: 2 },
        { gameId: 12, teamId: 3, resultPlacement: 1 },
        { gameId: 11, teamId: 4, resultPlacement: null },
      ]
    );
    const byId = new Map(rows.map(row => [row.teamId, row]));
    expect(byId.get(1)).toMatchObject({
      wins: 2,
      losses: 0,
      cashoutWins: 1,
      cashoutLosses: 0,
      finalRoundWins: 1,
      finalRoundLosses: 0,
    });
    expect(byId.get(2)).toMatchObject({
      wins: 1,
      losses: 1,
      cashoutWins: 1,
      cashoutLosses: 0,
      finalRoundWins: 0,
      finalRoundLosses: 1,
    });
    expect(byId.get(3)).toMatchObject({
      wins: 0,
      losses: 1,
      cashoutWins: 0,
      cashoutLosses: 1,
      finalRoundWins: 0,
      finalRoundLosses: 0,
    });
    expect(byId.get(4)).toMatchObject({
      wins: 0,
      losses: 1,
      cashoutWins: 0,
      cashoutLosses: 1,
      finalRoundWins: 0,
      finalRoundLosses: 0,
    });
    for (const row of rows)
      expect(row.wins + row.losses).toBe(
        row.cashoutWins +
          row.cashoutLosses +
          row.finalRoundWins +
          row.finalRoundLosses
      );
  });
});
