import { describe, expect, it } from "vitest";
import {
  buildVodTeamSummaries,
  type VodTeamSummaryEvent,
} from "./team-summary";

const event = (
  eventType: VodTeamSummaryEvent["eventType"],
  timestampSeconds: number,
  teamLabel?: string | null
): VodTeamSummaryEvent => ({ eventType, timestampSeconds, teamLabel });

describe("buildVodTeamSummaries", () => {
  it("counts deaths against the victim team from teamLabel", () => {
    expect(
      buildVodTeamSummaries([
        event("death", 10, "Orange"),
        event("death", 20, "Orange"),
        event("death", 30, "Blue"),
      ])
    ).toEqual([
      expect.objectContaining({ teamName: "Blue", deaths: 1 }),
      expect.objectContaining({ teamName: "Orange", deaths: 2 }),
    ]);
  });

  it("counts team wipes against the wiped team from teamLabel", () => {
    expect(
      buildVodTeamSummaries([
        event("team_wipe", 40, "Orange"),
        event("team_wipe", 50, "Orange"),
        event("team_wipe", 60, "Blue"),
      ])
    ).toEqual([
      expect.objectContaining({ teamName: "Blue", teamWipes: 1 }),
      expect.objectContaining({ teamName: "Orange", teamWipes: 2 }),
    ]);
  });

  it("counts spawns, cashouts, revives, and defibs by teamLabel", () => {
    expect(
      buildVodTeamSummaries([
        event("team_spawn", 1, "Orange"),
        event("cashout", 2, "Orange"),
        event("revive", 3, "Orange"),
        event("defib", 4, "Orange"),
        event("defib", 5, "Orange"),
      ])
    ).toEqual([
      {
        teamName: "Orange",
        deaths: 0,
        teamWipes: 0,
        teamSpawns: 1,
        cashouts: 1,
        revives: 1,
        defibs: 2,
        firstDeathToWipeAvgSeconds: null,
      },
    ]);
  });

  it("ignores events without teamLabel and excludes tap/plug from the compact summary", () => {
    expect(
      buildVodTeamSummaries([
        event("death", 1, null),
        event("team_wipe", 2, ""),
        event("cashout", 3),
        event("tap", 4, "Orange"),
        event("plug", 5, "Orange"),
      ])
    ).toEqual([]);
  });

  it("computes first-death-to-wipe average and resets on wipe or spawn windows", () => {
    const summaries = buildVodTeamSummaries([
      event("death", 40, "Orange"),
      event("death", 45, "Orange"),
      event("team_wipe", 70, "Orange"),
      event("death", 100, "Orange"),
      event("team_spawn", 110, "Orange"),
      event("team_wipe", 130, "Orange"),
      event("death", 200, "Orange"),
      event("team_wipe", 240, "Orange"),
    ]);

    expect(summaries).toEqual([
      expect.objectContaining({
        teamName: "Orange",
        firstDeathToWipeAvgSeconds: 35,
      }),
    ]);
  });

  it("returns null first-death-to-wipe average without valid death-to-wipe pairs", () => {
    expect(
      buildVodTeamSummaries([
        event("team_wipe", 70, "Orange"),
        event("death", 100, "Orange"),
        event("team_spawn", 110, "Orange"),
        event("team_wipe", 130, "Orange"),
      ])
    ).toEqual([
      expect.objectContaining({
        teamName: "Orange",
        firstDeathToWipeAvgSeconds: null,
      }),
    ]);
  });

  it("sorts summaries alphabetically by team name", () => {
    expect(
      buildVodTeamSummaries([
        event("cashout", 1, "Orange"),
        event("cashout", 2, "Blue"),
        event("cashout", 3, "Purple"),
      ]).map(summary => summary.teamName)
    ).toEqual(["Blue", "Orange", "Purple"]);
  });

  it("does not expose an average wipe-to-spawn metric", () => {
    const [summary] = buildVodTeamSummaries([
      event("death", 10, "Orange"),
      event("team_wipe", 20, "Orange"),
      event("team_spawn", 30, "Orange"),
    ]);

    expect(summary).not.toHaveProperty("wipeToSpawnAvgSeconds");
    expect(summary).not.toHaveProperty("averageWipeToSpawnSeconds");
  });
});
