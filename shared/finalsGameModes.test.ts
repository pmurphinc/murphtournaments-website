import { describe, expect, it } from "vitest";
import {
  getTournamentGameMode,
  normalizeTournamentGameType,
  tournamentGameModeList,
} from "./finalsGameModes";
import { getEmptySlotsForGame } from "../server/tournamentControlRules";

describe("TCR game mode configuration", () => {
  it.each([
    ["quick_cash", "Quick Cash", 3, 3],
    ["power_shift", "Power Shift", 2, 5],
    ["team_deathmatch", "Team Deathmatch (TDM)", 2, 5],
    ["point_break", "Point Break", 2, 8],
  ] as const)("configures %s", (id, label, teams, players) => {
    expect(getTournamentGameMode(id)).toMatchObject({
      id,
      label,
      teamsPerLobby: teams,
      activePlayersPerTeam: players,
    });
    expect(
      getEmptySlotsForGame(
        { id: 1, tournamentId: 1, gameType: id, status: "draft" },
        []
      )
    ).toHaveLength(teams);
  });

  it("uses the requested arena pools", () => {
    expect(getTournamentGameMode("quick_cash").allowedMapIds).toHaveLength(12);
    expect(getTournamentGameMode("power_shift").allowedMapIds).toHaveLength(8);
    expect(getTournamentGameMode("team_deathmatch").allowedMapIds).toContain(
      "peace-center"
    );
    expect(getTournamentGameMode("point_break").allowedMapIds).toEqual([
      "bernal",
      "las-vegas-stadium",
      "monaco",
      "nozomi-citadel",
      "starlight-hollow",
      "sys-horizon",
    ]);
  });

  it("round-trips every new persisted identifier", () => {
    for (const mode of tournamentGameModeList.slice(2))
      expect(
        normalizeTournamentGameType(JSON.parse(JSON.stringify(mode.id)))
      ).toBe(mode.id);
  });

  it("keeps legacy defaults and normalizes the abandoned breakpoint identifier", () => {
    expect(normalizeTournamentGameType(undefined)).toBe("cashout");
    expect(normalizeTournamentGameType("breakpoint")).toBe("point_break");
  });
});
