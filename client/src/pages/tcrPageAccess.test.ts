import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Access contracts for the TCR pages that had no tests of their own.
 *
 * These read the source rather than rendering: the pages pull in tRPC, auth
 * and the dialog primitives, and a render harness for them would test the
 * harness as much as the page. What that buys is narrow and worth stating —
 * these catch a gate being added, removed or inverted, which is the change
 * most likely to be made by accident and least likely to be noticed. They
 * do not prove the pages render, and they are no substitute for signing in
 * and using them.
 */

const read = (name: string) =>
  readFileSync(new URL(`./${name}`, import.meta.url), "utf8");

const viewer = read("TournamentControlViewer.tsx");
const templates = read("TcrTemplates.tsx");
const adminIndex = read("TournamentControlIndex.tsx");
const personalIndex = read("PersonalTcrIndex.tsx");

describe("public bracket viewer", () => {
  /**
   * The viewer is the page a tournament's audience opens from a shared
   * link, and most of them will never have an account. An auth gate here
   * would break every shared bracket at once, and would look like a
   * reasonable change in isolation.
   */
  it("stays reachable without an account", () => {
    expect(viewer).not.toContain("useAuth");
    expect(viewer).not.toContain('loginMethod !== "discord"');
    expect(viewer).not.toContain("Sign in with Discord");
  });
});

describe("owner-facing TCR pages", () => {
  const gated: [string, string][] = [
    ["TcrTemplates", templates],
    ["TournamentControlIndex", adminIndex],
    ["PersonalTcrIndex", personalIndex],
  ];

  it.each(gated)("%s requires a Discord sign-in", (_name, source) => {
    expect(source).toContain("useAuth");
    expect(source).toContain('loginMethod !== "discord"');
  });

  it("PersonalTcrIndex explains itself before gating", () => {
    expect(personalIndex).toContain("<TcrSignedOutLanding />");
  });
});

describe("error messages shown to users", () => {
  /**
   * Server errors from the control-room routers can carry detail about
   * tournaments the viewer does not own, so the pages route them through a
   * helper rather than rendering `error.message` directly.
   */
  const viaHelper: [string, string][] = [
    ["TcrTemplates", templates],
    ["PersonalTcrIndex", personalIndex],
  ];

  it.each(viaHelper)("%s does not render raw server errors", (_n, source) => {
    expect(source).toContain("getSafeTournamentControlErrorMessage");
  });
});
