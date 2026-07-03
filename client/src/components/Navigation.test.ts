import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Discord avatar header control", () => {
  const source = readFileSync(new URL("./Navigation.tsx", import.meta.url), "utf8");

  it("does not lose its minimum size at responsive breakpoints", () => {
    expect(source).toContain("h-10 min-h-10 min-w-10 flex-none shrink-0");
    expect(source).toContain("h-8 w-8 min-w-8 flex-none shrink-0");
    expect(source).toContain("2xl:inline");
  });

  it("uses xl navigation breakpoint so avatar and hamburger do not overlap", () => {
    expect(source).toContain("hidden xl:flex");
    expect(source).toContain("xl:hidden");
  });

  it("links Team Management while keeping Tournament Signups disabled", () => {
    expect(source).toContain('href="/teams"');
    expect(source).toContain("Tournament Signups");
    expect(source).toContain("Coming soon");
  });
});
