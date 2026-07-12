import { describe, expect, it } from "vitest";
import { isPersonalTcrPath, normalizeTcrPathname } from "./tcrRouteMode";

describe("TCR route mode helpers", () => {
  it("normalizes trailing slashes and query fragments", () => {
    expect(normalizeTcrPathname("/TCR/123/?tab=teams#top")).toBe("/TCR/123");
  });

  it.each(["/TCR/123", "/tcr/123", "/TCR/123/"])(
    "classifies %s as personal TCR",
    path => {
      expect(isPersonalTcrPath(path, 123)).toBe(true);
    }
  );

  it("does not classify admin tournament-control routes as personal TCR", () => {
    expect(isPersonalTcrPath("/admin/tournaments/123/control", 123)).toBe(
      false
    );
  });

  it.each(["/TCR/123/extra", "/TCR", "/not-tcr/123", "/TCR/456"])(
    "does not classify unrelated route %s as personal TCR",
    path => {
      expect(isPersonalTcrPath(path, 123)).toBe(false);
    }
  );
});
