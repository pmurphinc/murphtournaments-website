import { describe, expect, it } from "vitest";
import {
  TEAM_FINDER_LISTING_TTL_MS,
  computeTeamFinderExpiry,
  isTeamFinderListingExpired,
  parseMainClasses,
  serializeMainClasses,
} from "@shared/teamFinder";

describe("Team Finder shared helpers", () => {
  describe("computeTeamFinderExpiry", () => {
    it("adds the 30-day TTL to the provided start time", () => {
      const from = new Date("2026-01-01T00:00:00.000Z");
      const expiry = computeTeamFinderExpiry(from);
      expect(expiry.getTime()).toBe(
        from.getTime() + TEAM_FINDER_LISTING_TTL_MS
      );
    });
  });

  describe("isTeamFinderListingExpired", () => {
    const now = new Date("2026-06-01T00:00:00.000Z");

    it("treats an explicit expired status as expired regardless of date", () => {
      const future = new Date(now.getTime() + 1000 * 60 * 60);
      expect(isTeamFinderListingExpired("expired", future, now)).toBe(true);
    });

    it("returns true when the expiry timestamp is in the past", () => {
      const past = new Date(now.getTime() - 1000);
      expect(isTeamFinderListingExpired("active", past, now)).toBe(true);
    });

    it("returns false for an active listing that has not yet expired", () => {
      const future = new Date(now.getTime() + 1000);
      expect(isTeamFinderListingExpired("active", future, now)).toBe(false);
    });

    it("accepts ISO string timestamps", () => {
      const future = new Date(now.getTime() + 1000).toISOString();
      expect(isTeamFinderListingExpired("active", future, now)).toBe(false);
    });

    it("does not throw and reports not-expired on an invalid date", () => {
      expect(isTeamFinderListingExpired("active", "not-a-date", now)).toBe(
        false
      );
    });
  });

  describe("main class serialization", () => {
    it("round-trips a set of classes in canonical order", () => {
      const serialized = serializeMainClasses(["Heavy", "Light"]);
      expect(serialized).toBe("Light,Heavy");
      expect(parseMainClasses(serialized)).toEqual(["Light", "Heavy"]);
    });

    it("ignores unknown or malformed entries when parsing", () => {
      expect(parseMainClasses("Light, Sniper ,Heavy")).toEqual([
        "Light",
        "Heavy",
      ]);
    });

    it("returns an empty array for null/empty input", () => {
      expect(parseMainClasses(null)).toEqual([]);
      expect(parseMainClasses("")).toEqual([]);
    });

    it("dedupes and orders when serializing", () => {
      expect(serializeMainClasses(["Medium", "Medium", "Light"])).toBe(
        "Light,Medium"
      );
    });
  });
});
