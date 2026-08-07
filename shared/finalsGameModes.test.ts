import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  getTournamentGameMode,
  getModeAdvancingPlacements,
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

  it("keeps progression mode-aware without treating head-to-head modes as final rounds", () => {
    expect(getModeAdvancingPlacements("cashout", "winner")).toEqual([1, 2]);
    expect(getModeAdvancingPlacements("cashout", "loser")).toEqual([3, 4]);
    expect(getModeAdvancingPlacements("quick_cash", "winner")).toEqual([1]);
    expect(getModeAdvancingPlacements("quick_cash", "loser")).toEqual([2, 3]);
    for (const gameType of [
      "final_round",
      "power_shift",
      "team_deathmatch",
      "point_break",
    ] as const) {
      expect(getModeAdvancingPlacements(gameType, "winner")).toEqual([1]);
      expect(getModeAdvancingPlacements(gameType, "loser")).toEqual([2]);
    }
  });

  it("registers the one-time migration and normalizes breakpoint before removing compatibility", () => {
    const journal = JSON.parse(
      readFileSync("drizzle/meta/_journal.json", "utf8")
    ) as { entries: Array<{ idx: number; tag: string }> };
    expect(journal.entries.at(-1)).toEqual(
      expect.objectContaining({ idx: 33, tag: "0033_add_tcr_game_modes" })
    );

    const migration = readFileSync(
      "drizzle/0033_add_tcr_game_modes.sql",
      "utf8"
    );
    for (const table of [
      "tournament_games",
      "tournament_control_template_games",
    ]) {
      const widen = migration.indexOf(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`gameType\` enum('cashout','final_round','quick_cash','power_shift','team_deathmatch','point_break','breakpoint') NOT NULL;`
      );
      const normalize = migration.indexOf(
        `UPDATE \`${table}\` SET \`gameType\` = 'point_break' WHERE \`gameType\` = 'breakpoint';`
      );
      const constrain = migration.indexOf(
        `ALTER TABLE \`${table}\` MODIFY COLUMN \`gameType\` enum('cashout','final_round','quick_cash','power_shift','team_deathmatch','point_break') NOT NULL;`
      );
      expect(widen).toBeGreaterThanOrEqual(0);
      expect(normalize).toBeGreaterThan(widen);
      expect(constrain).toBeGreaterThan(normalize);
    }
    const schema = readFileSync("drizzle/schema.ts", "utf8");
    expect(
      schema.match(
        /gameType: mysqlEnum\("gameType", \[\s*"cashout",\s*"final_round",\s*"quick_cash",\s*"power_shift",\s*"team_deathmatch",\s*"point_break",\s*\]\)\.notNull\(\)/g
      )
    ).toHaveLength(2);
  });
});
