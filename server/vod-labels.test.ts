import { describe, expect, it } from "vitest";
import {
  DEFAULT_THE_FINALS_TEAM_LABELS,
  buildVodTeamLabelOptions,
  getVodEventLabelSuggestions,
  getVodTeamLabelWarnings,
  normalizeVodLabelKey,
  type VodEventLabelSource,
} from "../shared/vod/labels";

describe("VOD label helpers", () => {
  it("normalizes label keys by trimming, lowercasing, and collapsing whitespace", () => {
    expect(normalizeVodLabelKey("  Orange   Team  ")).toBe("orange team");
  });

  it("keeps team, player actor, and target suggestions in separate pools", () => {
    const events: VodEventLabelSource[] = [
      {
        eventType: "death",
        actorLabel: "Alice",
        targetLabel: "Charlie",
        teamLabel: "The Live Wires",
      },
      {
        eventType: "revive",
        actorLabel: " alice ",
        targetLabel: "",
        teamLabel: null,
      },
      {
        eventType: "tap",
        actorLabel: "Bob",
        targetLabel: "1",
        teamLabel: "The High Notes",
      },
      {
        eventType: "cashout",
        actorLabel: null,
        targetLabel: "A",
        teamLabel: " ",
      },
      {
        eventType: "plug",
        actorLabel: "The High Notes",
        targetLabel: "B",
        teamLabel: null,
      },
    ];

    const suggestions = getVodEventLabelSuggestions(events);

    expect(suggestions.teams).toEqual(
      expect.arrayContaining([
        "The High Notes",
        "The Live Wires",
        ...DEFAULT_THE_FINALS_TEAM_LABELS,
      ])
    );
    expect(suggestions.actors).toEqual(["Alice", "Bob"]);
    expect(suggestions.targets).toEqual(["Charlie"]);
    expect(suggestions.actors).not.toContain("The High Notes");
    expect(suggestions.actors).not.toContain("The Live Wires");
    expect(suggestions.targets).not.toContain("The Live Wires");
    expect(suggestions.targets).not.toContain("A");
    expect(suggestions.targets).not.toContain("B");
    expect(suggestions.targets).not.toContain("1");
  });

  it("uses the most common display casing for suggestions and a first-seen tie break", () => {
    const events: VodEventLabelSource[] = [
      {
        eventType: "death",
        teamLabel: "Orange",
        actorLabel: "June",
        targetLabel: "Vault",
      },
      {
        eventType: "revive",
        teamLabel: "orange",
        actorLabel: "june",
        targetLabel: "vault",
      },
      {
        eventType: "defib",
        teamLabel: "orange",
        actorLabel: "June",
        targetLabel: "Vault",
      },
      {
        eventType: "plug",
        teamLabel: "Blue",
        actorLabel: "Ada",
        targetLabel: "A",
      },
    ];

    expect(getVodEventLabelSuggestions(events)).toEqual({
      teams: expect.arrayContaining(["Blue", "orange"]),
      actors: ["Ada", "June"],
      targets: ["Vault"],
    });
  });

  it("uses THE FINALS default team labels only for team suggestions", () => {
    const suggestions = getVodEventLabelSuggestions([
      {
        eventType: "death",
        actorLabel: "Eliminator",
        targetLabel: "Target",
        teamLabel: "Custom Team",
      },
    ]);

    for (const teamLabel of DEFAULT_THE_FINALS_TEAM_LABELS) {
      expect(suggestions.teams).toContain(teamLabel);
      expect(suggestions.actors).not.toContain(teamLabel);
      expect(suggestions.targets).not.toContain(teamLabel);
    }
  });

  it("excludes team_wipe and steal_flip actor labels from player actor suggestions", () => {
    const suggestions = getVodEventLabelSuggestions([
      { eventType: "team_wipe", actorLabel: "The Live Wires" },
      { eventType: "steal_flip", actorLabel: "Should Not Suggest" },
      { eventType: "death", actorLabel: "Death Player" },
      { eventType: "revive", actorLabel: "Revive Player" },
      { eventType: "defib", actorLabel: "Defib Player" },
      { eventType: "tap", actorLabel: "Tap Player" },
      { eventType: "plug", actorLabel: "Plug Player" },
    ]);

    expect(suggestions.actors).toEqual([
      "Death Player",
      "Defib Player",
      "Plug Player",
      "Revive Player",
      "Tap Player",
    ]);
    expect(suggestions.actors).not.toContain("The Live Wires");
    expect(suggestions.actors).not.toContain("Should Not Suggest");
  });

  it("does not promote actor or target labels into team suggestions unless saved as teamLabel", () => {
    const suggestions = getVodEventLabelSuggestions([
      {
        eventType: "death",
        actorLabel: "Player One",
        targetLabel: "A",
        teamLabel: "The Vogues",
      },
      {
        eventType: "cashout",
        teamLabel: "Player One",
      },
    ]);

    expect(suggestions.teams).toContain("Player One");
    expect(suggestions.teams).not.toContain("A");
  });

  it("builds team selector options from default teams and preserves current legacy values", () => {
    expect(buildVodTeamLabelOptions()).toEqual([
      ...DEFAULT_THE_FINALS_TEAM_LABELS,
    ]);

    expect(
      buildVodTeamLabelOptions([
        "Legacy Orange",
        "The Live Wires",
        " Player One ",
        "",
        null,
        undefined,
      ])
    ).toEqual([
      ...DEFAULT_THE_FINALS_TEAM_LABELS,
      "Legacy Orange",
      " Player One ",
    ]);
  });

  it("detects casing and spacing variants as team label warnings", () => {
    const events: VodEventLabelSource[] = [
      { teamLabel: "Orange" },
      { teamLabel: "orange" },
      { teamLabel: " Orange " },
      { teamLabel: "Blue" },
      { teamLabel: "blue" },
      { teamLabel: null },
      { teamLabel: "" },
    ];

    expect(getVodTeamLabelWarnings(events)).toEqual([
      {
        normalizedKey: "blue",
        totalCount: 2,
        variants: [
          { label: "blue", count: 1 },
          { label: "Blue", count: 1 },
        ],
      },
      {
        normalizedKey: "orange",
        totalCount: 3,
        variants: [
          { label: " Orange ", count: 1 },
          { label: "orange", count: 1 },
          { label: "Orange", count: 1 },
        ],
      },
    ]);
  });

  it("sorts suggestions and warnings deterministically", () => {
    const events: VodEventLabelSource[] = [
      {
        eventType: "death",
        teamLabel: "Zeta",
        actorLabel: "Zed",
        targetLabel: "Zed Target",
      },
      {
        eventType: "defib",
        teamLabel: "Alpha",
        actorLabel: "Ann",
        targetLabel: "Ann Target",
      },
      {
        eventType: "revive",
        teamLabel: "alpha",
        actorLabel: "ann",
        targetLabel: "ann target",
      },
    ];

    expect(getVodEventLabelSuggestions(events)).toMatchObject({
      teams: expect.arrayContaining(["Alpha", "Zeta"]),
      actors: ["Ann", "Zed"],
      targets: ["Ann Target", "Zed Target"],
    });
    expect(
      getVodTeamLabelWarnings(events).map(warning => warning.normalizedKey)
    ).toEqual(["alpha"]);
  });

  it("does not warn when team labels are already consistent", () => {
    expect(
      getVodTeamLabelWarnings([
        { teamLabel: "Orange" },
        { teamLabel: "Orange" },
        { teamLabel: "Blue" },
      ])
    ).toEqual([]);
  });
});
