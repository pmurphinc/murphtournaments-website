import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const landing = readFileSync(
  new URL("./TcrSignedOutLanding.tsx", import.meta.url),
  "utf8"
);
const navigation = readFileSync(
  new URL("./Navigation.tsx", import.meta.url),
  "utf8"
);
const index = readFileSync(
  new URL("../pages/PersonalTcrIndex.tsx", import.meta.url),
  "utf8"
);

/**
 * JSX wraps prose across lines wherever Prettier decides to, so assert
 * against collapsed whitespace: otherwise a reformat that changes nothing
 * visible fails the test.
 */
const prose = landing.replace(/\s+/g, " ");

describe("signed-out TCR landing", () => {
  it("replaces the bare sign-in wall on the TCR index", () => {
    expect(index).toContain("<TcrSignedOutLanding />");
    // The old card asked for a sign-in without ever saying what TCR was.
    expect(index).not.toContain("Discord sign-in required");
    expect(index).not.toContain(
      "Sign in with Discord to create and manage your Tournament Control Rooms."
    );
  });

  it("names the product and says what it does before asking for anything", () => {
    expect(prose).toContain("Tournament Control Room");
    expect(prose).toContain("Run your own THE FINALS tournament");
    // The phrase "Sign in with Discord" also appears inside step 01, so
    // anchor the ordering on the call-to-action block itself.
    const explainsAt = prose.indexOf("Run your own THE FINALS tournament");
    const ctaAt = prose.indexOf("Ready to run one?");
    expect(explainsAt).toBeGreaterThan(-1);
    expect(ctaAt).toBeGreaterThan(explainsAt);
  });

  it("tells viewers they do not need an account", () => {
    expect(prose).toContain("Just here to watch?");
    expect(prose).toContain("no account, no sign-in");
  });

  // Templates are behind personalTcrProcedure, so linking a signed-out
  // visitor there would just be a second login wall.
  it("does not send a signed-out visitor to another gated page", () => {
    expect(landing).not.toContain('href="/TCR/templates"');
    expect(landing).not.toContain('href="/tcr/templates"');
  });

  it("quotes the real server-side ceilings", () => {
    expect(landing).toContain("teams per tournament");
    expect(landing).toContain("matches per bracket");
    expect(landing).toContain("tournaments at a time");
  });
});

describe("public discoverability", () => {
  const home = readFileSync(
    new URL("../pages/Home.tsx", import.meta.url),
    "utf8"
  );

  /**
   * It was first added as a child of the Tournaments dropdown, which made
   * it reachable without making it visible — the owner looked at the live
   * site and saw no link at all. A top-level entry is the whole point.
   */
  it("lists TCR at the top level of the nav, not inside a dropdown", () => {
    // Top-level NAV_ITEMS entries sit at two spaces of indentation; a
    // dropdown child sits at six. Asserting the indentation is cruder than
    // parsing but it says exactly what went wrong last time.
    expect(navigation).toContain(
      '\n  { label: "Control Room", href: "/TCR" },'
    );
    expect(navigation).not.toContain(
      '\n      { label: "Control Room", href: "/TCR" },'
    );
    // The signed-in account-menu link stays where it was.
    expect(navigation).toContain('<Link href="/TCR">TCR</Link>');
  });

  /**
   * The Control Room section sits below the fold, so the hero needs its own
   * way in: "nothing on the front page" was the other half of the report.
   */
  it("offers a way in from the hero, above the fold", () => {
    // <Hero /> is self-closing, so the hero is everything before the first
    // <section>. Slicing to a non-existent </Hero> silently gave an empty
    // string and a test that could never pass.
    const firstSection = home.indexOf("<section");
    expect(firstSection).toBeGreaterThan(-1);
    const hero = home.slice(0, firstSection);
    expect(hero).toContain('href="/TCR"');
    expect(hero).toContain("Run a Tournament");
  });
});
