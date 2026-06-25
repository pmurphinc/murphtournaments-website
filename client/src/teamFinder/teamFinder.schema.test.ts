import { describe, expect, it } from "vitest";
import {
  createTeamFinderListingInputSchema,
  reportListingInputSchema,
} from "../../../server/teamFinder";

const basePlayer = {
  listingType: "player" as const,
  region: "NA" as const,
  description: "Looking for a competitive team for the Development Division.",
  embarkId: "MurphMain#1234",
  mainClasses: ["Light", "Medium"] as const,
};

const baseTeam = {
  listingType: "team" as const,
  region: "EU" as const,
  description: "Recruiting a Heavy for weekly scrims and tournaments.",
  teamName: "Neon Rebellion",
  rosterCount: 2,
  neededClass: "Heavy",
};

describe("createTeamFinderListingInputSchema", () => {
  it("accepts a valid player listing", () => {
    const result = createTeamFinderListingInputSchema.safeParse(basePlayer);
    expect(result.success).toBe(true);
  });

  it("accepts a valid team listing", () => {
    const result = createTeamFinderListingInputSchema.safeParse(baseTeam);
    expect(result.success).toBe(true);
  });

  it("rejects a player listing with no main classes", () => {
    const result = createTeamFinderListingInputSchema.safeParse({
      ...basePlayer,
      mainClasses: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing embark id for players", () => {
    const { embarkId, ...rest } = basePlayer;
    void embarkId;
    const result = createTeamFinderListingInputSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects when the honeypot field is filled", () => {
    const result = createTeamFinderListingInputSchema.safeParse({
      ...basePlayer,
      website: "http://spam.example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a Twitch URL that does not point to twitch.tv", () => {
    const result = createTeamFinderListingInputSchema.safeParse({
      ...basePlayer,
      twitchUrl: "https://evil.example.com/stream",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid twitch.tv URL", () => {
    const result = createTeamFinderListingInputSchema.safeParse({
      ...basePlayer,
      twitchUrl: "https://twitch.tv/pmurphinc",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-http(s) URL scheme", () => {
    const result = createTeamFinderListingInputSchema.safeParse({
      ...basePlayer,
      youtubeUrl: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an out-of-range roster count for teams", () => {
    const result = createTeamFinderListingInputSchema.safeParse({
      ...baseTeam,
      rosterCount: 99,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty description", () => {
    const result = createTeamFinderListingInputSchema.safeParse({
      ...basePlayer,
      description: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe("reportListingInputSchema", () => {
  it("accepts a valid report", () => {
    const result = reportListingInputSchema.safeParse({
      listingId: 1,
      reason: "spam",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid reason", () => {
    const result = reportListingInputSchema.safeParse({
      listingId: 1,
      reason: "totally-made-up",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a report when the honeypot is filled", () => {
    const result = reportListingInputSchema.safeParse({
      listingId: 1,
      reason: "spam",
      website: "bot",
    });
    expect(result.success).toBe(false);
  });
});
