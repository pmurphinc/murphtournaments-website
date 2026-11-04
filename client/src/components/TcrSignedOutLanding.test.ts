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
  it("lists TCR in the public navigation, not only the account menu", () => {
    expect(navigation).toContain('{ label: "Run Your Own", href: "/TCR" }');
    // The signed-in account-menu link stays where it was.
    expect(navigation).toContain('<Link href="/TCR">TCR</Link>');
  });
});
