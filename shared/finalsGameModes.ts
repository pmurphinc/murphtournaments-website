import type { FinalsMapId } from "./finalsMaps";

export const tournamentGameTypes = [
  "cashout",
  "final_round",
  "quick_cash",
  "power_shift",
  "team_deathmatch",
  "point_break",
] as const;

export type TournamentGameType = (typeof tournamentGameTypes)[number];

export type TournamentGameMode = {
  id: TournamentGameType;
  label: string;
  nodeLabel: string;
  teamsPerLobby: number;
  activePlayersPerTeam: number;
  allowedMapIds: readonly FinalsMapId[];
};

const cashoutMaps = [
  "monaco",
  "skyway-stadium",
  "las-vegas",
  "sys-horizon",
  "fortune-stadium",
  "bernal",
  "las-vegas-stadium",
  "nozomi-citadel",
  "fangwai-city",
] as const satisfies readonly FinalsMapId[];

export const TOURNAMENT_GAME_MODES = {
  cashout: {
    id: "cashout",
    label: "Cashout",
    nodeLabel: "Cashout Lobby",
    teamsPerLobby: 4,
    activePlayersPerTeam: 3,
    allowedMapIds: cashoutMaps,
  },
  final_round: {
    id: "final_round",
    label: "Final Round",
    nodeLabel: "Final Round Match",
    teamsPerLobby: 2,
    activePlayersPerTeam: 3,
    allowedMapIds: cashoutMaps,
  },
  quick_cash: {
    id: "quick_cash",
    label: "Quick Cash",
    nodeLabel: "Quick Cash Lobby",
    teamsPerLobby: 3,
    activePlayersPerTeam: 3,
    allowedMapIds: [
      "bernal",
      "fangwai-city",
      "fortune-stadium",
      "galaxy-estates",
      "kyoto",
      "las-vegas",
      "las-vegas-stadium",
      "monaco",
      "nozomi-citadel",
      "seoul",
      "skyway-stadium",
      "sys-horizon",
    ],
  },
  power_shift: {
    id: "power_shift",
    label: "Power Shift",
    nodeLabel: "Power Shift Match",
    teamsPerLobby: 2,
    activePlayersPerTeam: 5,
    allowedMapIds: [
      "bernal",
      "kyoto",
      "las-vegas-stadium",
      "monaco",
      "nozomi-citadel",
      "seoul",
      "skyway-stadium",
      "sys-horizon",
    ],
  },
  team_deathmatch: {
    id: "team_deathmatch",
    label: "Team Deathmatch (TDM)",
    nodeLabel: "Team Deathmatch Match",
    teamsPerLobby: 2,
    activePlayersPerTeam: 5,
    allowedMapIds: [
      "bernal",
      "fangwai-city",
      "fortune-stadium",
      "galaxy-estates",
      "kyoto",
      "las-vegas-stadium",
      "monaco",
      "nozomi-citadel",
      "peace-center",
      "seoul",
      "skyway-stadium",
      "starlight-hollow",
      "sys-horizon",
    ],
  },
  point_break: {
    id: "point_break",
    label: "Point Break",
    nodeLabel: "Point Break Match",
    teamsPerLobby: 2,
    activePlayersPerTeam: 8,
    allowedMapIds: [
      "bernal",
      "las-vegas-stadium",
      "monaco",
      "nozomi-citadel",
      "starlight-hollow",
      "sys-horizon",
    ],
  },
} as const satisfies Record<TournamentGameType, TournamentGameMode>;

export const tournamentGameModeList = tournamentGameTypes.map(
  gameType => TOURNAMENT_GAME_MODES[gameType]
);

/** Accept the abandoned prototype identifier without exposing it in the UI. */
export function normalizeTournamentGameType(
  value: unknown
): TournamentGameType {
  if (value === "breakpoint") return "point_break";
  return tournamentGameTypes.includes(value as TournamentGameType)
    ? (value as TournamentGameType)
    : "cashout";
}

export function getTournamentGameMode(gameType: TournamentGameType) {
  return TOURNAMENT_GAME_MODES[gameType];
}

export function getModeAdvancingPlacements(
  gameType: TournamentGameType,
  flowType: "winner" | "loser"
) {
  if (gameType === "cashout") return flowType === "winner" ? [1, 2] : [3, 4];
  if (flowType === "winner") return [1];
  return Array.from(
    { length: getTournamentGameMode(gameType).teamsPerLobby - 1 },
    (_, index) => index + 2
  );
}
