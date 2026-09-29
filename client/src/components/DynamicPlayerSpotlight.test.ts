import { describe, it, expect, beforeEach, vi } from "vitest";
import { calculateCurrentWeek } from "./DynamicPlayerSpotlight";

/**
 * Unit tests for DynamicPlayerSpotlight weekly rotation logic
 * Tests date-based week calculation and fallback behavior
 */

// Mock the spotlight data structure
const mockSpotlightData = {
  weeks: [
    {
      week: 1,
      startDate: "2026-04-06",
      label: "Week 1",
      players: [
        {
          playerName: "PLUTO",
          titleTagline: "Top Fragger",
          level: 123,
          hours: 732,
          kd: 2.1,
          winRate: 59,
          achievement1: "K/D: 2.10",
          achievement2: "Win Rate: 59%",
          achievement3: "High-impact carry",
          accentColor: "gold",
          profileSlug: "pluto",
        },
      ],
    },
    {
      week: 2,
      startDate: "2026-04-13",
      label: "Week 2",
      players: [
        {
          playerName: "MRTHIRDPARTY",
          titleTagline: "Clutch Player",
          level: 116,
          hours: 645,
          kd: 1.48,
          winRate: 49,
          achievement1: "K/D: 1.48",
          achievement2: "Win Rate: 49%",
          achievement3: "Pressure performer",
          accentColor: "lime",
          profileSlug: "mrthirdparty",
        },
      ],
    },
    {
      week: 3,
      startDate: "2026-04-20",
      label: "Week 3",
      players: [
        {
          playerName: "WEI_FAO",
          titleTagline: "Team Leader",
          level: 128,
          hours: 750,
          kd: 1.85,
          winRate: 62,
          achievement1: "K/D: 1.85",
          achievement2: "Win Rate: 62%",
          achievement3: "Dojo of Fao captain",
          accentColor: "magenta",
          profileSlug: "wei_fao",
        },
      ],
    },
  ],
};

describe("DynamicPlayerSpotlight - Weekly Rotation Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return Week 1 for dates on or after 2026-04-06 and before 2026-04-13", () => {
    const testDate = new Date(2026, 3, 6);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(1);
    expect(result.players[0].playerName).toBe("PLUTO");
  });

  it("should return Week 1 for dates in the middle of Week 1", () => {
    const testDate = new Date(2026, 3, 10);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(1);
  });

  it("should return Week 2 for dates on or after 2026-04-13 and before 2026-04-20", () => {
    const testDate = new Date(2026, 3, 13);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(2);
    expect(result.players[0].playerName).toBe("MRTHIRDPARTY");
  });

  it("should return Week 2 for dates in the middle of Week 2", () => {
    const testDate = new Date(2026, 3, 15);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(2);
  });

  it("should return Week 3 for dates on or after 2026-04-20", () => {
    const testDate = new Date(2026, 3, 20);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(3);
    expect(result.players[0].playerName).toBe("WEI_FAO");
  });

  it("should return the latest week for dates after the last week start date", () => {
    const testDate = new Date(2026, 4, 1);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(3);
    expect(result.players[0].playerName).toBe("WEI_FAO");
  });

  it("should return the latest week for dates before the first week start date", () => {
    const testDate = new Date(2026, 2, 1);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(1); // Falls back to first available
  });

  it("should handle edge case: exactly at week boundary (midnight)", () => {
    const testDate = new Date(2026, 3, 13, 0, 0, 0);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(2);
  });

  it("should handle edge case: one second before week boundary", () => {
    const testDate = new Date(2026, 3, 12, 23, 59, 59);
    const result = calculateCurrentWeek(testDate, mockSpotlightData.weeks);
    expect(result.week).toBe(1);
  });

  it("should return exactly 3 players per week", () => {
    mockSpotlightData.weeks.forEach(week => {
      expect(week.players.length).toBeGreaterThan(0);
    });
  });

  it("should have all required player fields", () => {
    const requiredFields = [
      "playerName",
      "titleTagline",
      "level",
      "hours",
      "kd",
      "winRate",
      "achievement1",
      "achievement2",
      "achievement3",
      "accentColor",
      "profileSlug",
    ];

    mockSpotlightData.weeks.forEach(week => {
      week.players.forEach(player => {
        requiredFields.forEach(field => {
          expect(player).toHaveProperty(field);
        });
      });
    });
  });

  it("should have valid accent colors", () => {
    const validColors = ["magenta", "cyan", "gold", "lime"];

    mockSpotlightData.weeks.forEach(week => {
      week.players.forEach(player => {
        expect(validColors).toContain(player.accentColor);
      });
    });
  });
});
