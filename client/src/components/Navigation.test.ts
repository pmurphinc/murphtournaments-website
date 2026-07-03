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


describe("Mobile navigation dropdown styling", () => {
  const source = readFileSync(new URL("./Navigation.tsx", import.meta.url), "utf8");

  it("keeps the mobile menu hidden at the xl desktop breakpoint", () => {
    expect(source).toContain("xl:hidden");
  });

  it("uses an opaque compact right-aligned panel without backdrop blur", () => {
    expect(source).toContain("absolute right-4 top-16 w-[min(20rem,calc(100vw-2rem))]");
    expect(source).toContain("bg-[#0a0e27]");
    expect(source).not.toContain("backdrop-blur");
  });
});
