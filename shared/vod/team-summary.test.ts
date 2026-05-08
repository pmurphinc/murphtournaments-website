import { describe, expect, it } from "vitest";
import {
  buildVodTeamSummaries,
  type VodTeamSummary,
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

describe("getVodTeamAttributedEvents", () => {
  it("attributes selected-team events by teamLabel and excludes other teams and non-summary event types", async () => {
    const { getVodTeamAttributedEvents } = await import("./team-summary");
    const events = [
      { id: 1, eventType: "death", timestampSeconds: 10, teamLabel: "Orange" },
      {
        id: 2,
        eventType: "team_wipe",
        timestampSeconds: 20,
        teamLabel: "Blue",
      },
      {
        id: 3,
        eventType: "cashout",
        timestampSeconds: 30,
        teamLabel: "Orange",
      },
      { id: 4, eventType: "tap", timestampSeconds: 40, teamLabel: "Orange" },
      {
        id: 5,
        eventType: "defib",
        timestampSeconds: 50,
        teamLabel: " Orange ",
      },
    ] as const;

    expect(
      getVodTeamAttributedEvents("Orange", [...events]).map(event => event.id)
    ).toEqual([1, 3, 5]);
  });

  it("sorts selected-team timeline events by timestamp and then id", async () => {
    const { getVodTeamAttributedEvents } = await import("./team-summary");
    const events = [
      {
        id: 5,
        eventType: "cashout",
        timestampSeconds: 30,
        teamLabel: "Orange",
      },
      { id: 3, eventType: "death", timestampSeconds: 10, teamLabel: "Orange" },
      { id: 2, eventType: "defib", timestampSeconds: 10, teamLabel: "Orange" },
      { id: 1, eventType: "revive", timestampSeconds: 40, teamLabel: "Orange" },
    ] as const;

    expect(
      getVodTeamAttributedEvents("Orange", [...events]).map(event => event.id)
    ).toEqual([2, 3, 5, 1]);
  });
});

describe("getVodTeamInsightCallouts", () => {
  const summary = (overrides: Partial<VodTeamSummary>): VodTeamSummary => ({
    teamName: "Orange",
    deaths: 0,
    teamWipes: 0,
    teamSpawns: 0,
    cashouts: 0,
    revives: 0,
    defibs: 0,
    firstDeathToWipeAvgSeconds: null,
    ...overrides,
  });

  it("generates a survivability callout for high deaths and low recovery", async () => {
    const { getVodTeamInsightCallouts } = await import("./team-summary");

    expect(
      getVodTeamInsightCallouts(summary({ deaths: 4, revives: 1 }))
    ).toContain(
      "Survivability and reset discipline need attention. This team is losing players without enough recovery events."
    );
  });

  it("generates an objective conversion callout for high cashouts", async () => {
    const { getVodTeamInsightCallouts } = await import("./team-summary");

    expect(getVodTeamInsightCallouts(summary({ cashouts: 2 }))).toContain(
      "Objective conversion is a strength. This team is getting paid when opportunities appear."
    );
  });

  it("generates a collapse-speed callout for short first-death-to-wipe average", async () => {
    const { getVodTeamInsightCallouts } = await import("./team-summary");

    expect(
      getVodTeamInsightCallouts(
        summary({ deaths: 1, teamWipes: 1, firstDeathToWipeAvgSeconds: 12 })
      )
    ).toContain(
      "The team collapses quickly after first death. Focus on spacing, disengage timing, and delaying the wipe."
    );
  });

  it("generates a not-enough-data callout when team-labeled volume is low", async () => {
    const { getVodTeamInsightCallouts } = await import("./team-summary");

    expect(getVodTeamInsightCallouts(summary({ deaths: 1 }))).toEqual([
      "Add more team-labeled events to unlock stronger insights.",
    ]);
  });
});
