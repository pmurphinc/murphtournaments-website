import { describe, expect, it } from "vitest";
import { canViewHiddenTeamFinderListings } from "@shared/teamFinderVisibility";

describe("Team Finder moderation visibility", () => {
  it("allows admins to request hidden listings", () => {
    expect(canViewHiddenTeamFinderListings("admin")).toBe(true);
  });

  it("does not allow non-admin or anonymous visitors to request hidden listings", () => {
    expect(canViewHiddenTeamFinderListings("user")).toBe(false);
    expect(canViewHiddenTeamFinderListings(null)).toBe(false);
    expect(canViewHiddenTeamFinderListings(undefined)).toBe(false);
  });
});
