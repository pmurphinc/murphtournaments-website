import { describe, expect, it } from "vitest";
import { isDiscordAuthenticatedUser, validateDiscordState } from "./_core/discordOAuth";
import { deriveTeamFinderListingContent } from "./teamFinder";

describe("Team Finder Discord gating helpers", () => {
  it("requires a Discord login method and discord openId", () => {
    expect(isDiscordAuthenticatedUser({ openId: "discord:123456789", loginMethod: "discord" })).toBe(true);
    expect(isDiscordAuthenticatedUser({ openId: "generic-123", loginMethod: "discord" })).toBe(false);
    expect(isDiscordAuthenticatedUser({ openId: "discord:123456789", loginMethod: "google" })).toBe(false);
    expect(isDiscordAuthenticatedUser(null)).toBe(false);
  });

  it("validates OAuth state without accepting missing or mismatched values", () => {
    expect(validateDiscordState("abc123", "abc123")).toBe(true);
    expect(validateDiscordState("abc123", "abc124")).toBe(false);
    expect(validateDiscordState(undefined, "abc123")).toBe(false);
    expect(validateDiscordState("abc123", undefined)).toBe(false);
  });
});

describe("Team Finder listing content", () => {
  it("derives LFT titles and a useful default Discord contact description", () => {
    expect(deriveTeamFinderListingContent({ listingType: "lft", platform: "PC", region: "NA", availability: "Weeknights", preferredRole: "Light", notes: null }, "pmurph")).toEqual({
      title: "LFT · PC · NA",
      description: "Player looking for a team on PC in NA. Available weeknights and prefers Light. Message @pmurph to coordinate.",
      contact: "Discord: @pmurph",
    });
  });

  it("derives LFP titles and preserves optional notes", () => {
    expect(deriveTeamFinderListingContent({ listingType: "lfp", platform: "Crossplay", region: "EU", availability: "Flexible", preferredRole: "Flex", notes: "Need one sub for Sunday." }, "captain")).toMatchObject({
      title: "LFP · Crossplay · EU",
      description: "Need one sub for Sunday.",
    });
  });
});
