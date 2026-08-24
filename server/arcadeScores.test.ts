import { describe, expect, it } from "vitest";
import {
  allowedArcadeOrigin,
  normalizeArcadeInitials,
  parseArcadeScoreInput,
} from "./arcadeScores";

describe("Breach Runner Arcade public leaderboard", () => {
  it("normalizes classic three-character initials", () => {
    expect(normalizeArcadeInitials(" p9m ")).toBe("P9M");
    expect(normalizeArcadeInitials("PM")).toBeNull();
    expect(normalizeArcadeInitials("P-M")).toBeNull();
  });

  it("accepts only complete non-Practice victory score payloads", () => {
    expect(
      parseArcadeScoreInput({
        runId: "f05a2d8f-5cc5-4da8-b75b-2139407379f9",
        initials: "pm9",
        score: 40_380,
        ship: "Wing",
        difficulty: "hard",
        durationSeconds: 167,
      })
    ).toEqual({
      runId: "f05a2d8f-5cc5-4da8-b75b-2139407379f9",
      initials: "PM9",
      score: 40_380,
      ship: "Wing",
      difficulty: "hard",
      durationSeconds: 167,
    });
    expect(
      parseArcadeScoreInput({
        runId: "f05a2d8f-5cc5-4da8-b75b-2139407379f9",
        initials: "PM9",
        score: 100,
        ship: "Wing",
        difficulty: "practice",
        durationSeconds: 10,
      })
    ).toBeNull();
  });

  it("allows the production arcade origins without credentials", () => {
    expect(
      allowedArcadeOrigin("https://breachrunner.murphtournaments.com")
    ).toBe("https://breachrunner.murphtournaments.com");
    expect(allowedArcadeOrigin("https://example.com")).toBeNull();
  });
});
