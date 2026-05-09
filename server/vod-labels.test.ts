import { describe, expect, it } from "vitest";
import {
  getVodEventLabelSuggestions,
  getVodTeamLabelWarnings,
  normalizeVodLabelKey,
  type VodEventLabelSource,
} from "../shared/vod/labels";

describe("VOD label helpers", () => {
  it("normalizes label keys by trimming, lowercasing, and collapsing whitespace", () => {
    expect(normalizeVodLabelKey("  Orange   Team  ")).toBe("orange team");
  });

  it("returns unique team, actor, and target suggestions while ignoring blank labels", () => {
    const events: VodEventLabelSource[] = [
      {
        actorLabel: "Alice",
        targetLabel: "Cashout A",
        teamLabel: "Orange",
      },
      {
        actorLabel: " alice ",
        targetLabel: "",
        teamLabel: null,
      },
      {
        actorLabel: "Bob",
        targetLabel: "Vault",
        teamLabel: "Blue",
      },
      {
        actorLabel: null,
        targetLabel: "Cashout A",
        teamLabel: " ",
      },
    ];

    expect(getVodEventLabelSuggestions(events)).toEqual({
      teams: ["Blue", "Orange"],
      actors: ["Alice", "Bob"],
      targets: ["Cashout A", "Vault"],
    });
  });

  it("uses the most common display casing for suggestions and a first-seen tie break", () => {
    const events: VodEventLabelSource[] = [
      { teamLabel: "Orange", actorLabel: "June", targetLabel: "Vault" },
      { teamLabel: "orange", actorLabel: "june", targetLabel: "vault" },
      { teamLabel: "orange", actorLabel: "June", targetLabel: "Vault" },
      { teamLabel: "Blue", actorLabel: "Ada", targetLabel: "Cashout" },
    ];

    expect(getVodEventLabelSuggestions(events)).toEqual({
      teams: ["Blue", "orange"],
      actors: ["Ada", "June"],
      targets: ["Cashout", "Vault"],
    });
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
      { teamLabel: "Zeta", actorLabel: "Zed", targetLabel: "Vault B" },
      { teamLabel: "Alpha", actorLabel: "Ann", targetLabel: "Cashout A" },
      { teamLabel: "alpha", actorLabel: "ann", targetLabel: "cashout a" },
    ];

    expect(getVodEventLabelSuggestions(events)).toEqual({
      teams: ["Alpha", "Zeta"],
      actors: ["Ann", "Zed"],
      targets: ["Cashout A", "Vault B"],
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
