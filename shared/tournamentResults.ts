import {
  getTournamentGameMode,
  type TournamentGameType,
} from "./finalsGameModes";

export type TournamentResultGameType = TournamentGameType;
export type TournamentResultGameStatus =
  | "draft"
  | "ready"
  | "live"
  | "complete";

export type TournamentResultTeam = { id: number; name: string };
export type TournamentResultGame = {
  id: number;
  gameType: TournamentResultGameType;
  status: TournamentResultGameStatus;
};
export type TournamentResultAssignment = {
  gameId: number;
  teamId: number;
  resultPlacement?: number | null;
};

export type TournamentRecordBreakdown = {
  wins: number;
  losses: number;
  cashoutWins: number;
  cashoutLosses: number;
  finalRoundWins: number;
  finalRoundLosses: number;
};

export type TournamentScoreboardRow = TournamentRecordBreakdown & {
  teamId: number;
  teamName: string;
};

export function getValidPlacementsForGameType(
  gameType: TournamentResultGameType
) {
  return Array.from(
    { length: getTournamentGameMode(gameType).teamsPerLobby },
    (_, index) => index + 1
  );
}

export function calculateTournamentScoreboard(
  teams: readonly TournamentResultTeam[],
  games: readonly TournamentResultGame[],
  assignments: readonly TournamentResultAssignment[]
): TournamentScoreboardRow[] {
  const gamesById = new Map(games.map(game => [game.id, game] as const));
  const rows = new Map<number, TournamentScoreboardRow>(
    teams.map(
      team =>
        [
          team.id,
          {
            teamId: team.id,
            teamName: team.name,
            wins: 0,
            losses: 0,
            cashoutWins: 0,
            cashoutLosses: 0,
            finalRoundWins: 0,
            finalRoundLosses: 0,
          },
        ] as const
    )
  );
  for (const assignment of assignments) {
    const game = gamesById.get(assignment.gameId);
    const row = rows.get(assignment.teamId);
    if (
      !game ||
      !row ||
      game.status !== "complete" ||
      assignment.resultPlacement == null
    )
      continue;
    if (game.gameType === "cashout") {
      if (
        assignment.resultPlacement === 1 ||
        assignment.resultPlacement === 2
      ) {
        row.wins += 1;
        row.cashoutWins += 1;
      }
      if (
        assignment.resultPlacement === 3 ||
        assignment.resultPlacement === 4
      ) {
        row.losses += 1;
        row.cashoutLosses += 1;
      }
    } else {
      if (assignment.resultPlacement === 1) {
        row.wins += 1;
        if (game.gameType === "final_round") row.finalRoundWins += 1;
      }
      if (assignment.resultPlacement === 2) {
        row.losses += 1;
        if (game.gameType === "final_round") row.finalRoundLosses += 1;
      }
    }
  }
  return Array.from(rows.values()).sort(
    (a, b) =>
      b.wins - a.wins ||
      a.losses - b.losses ||
      a.teamName.localeCompare(b.teamName)
  );
}
