import { describe, expect, it } from "vitest";
import { redactTokenPath, redactUrl } from "./redactTokens";

/**
 * This module exists because the rule was written twice: the bug report
 * pipeline redacted correctly, then Sentry was wired up sending the raw
 * location to a third party. These cases cover both callers.
 */

const TOKEN = "s3cr3t-token-value";

describe("redactTokenPath", () => {
  const families: [string, string][] = [
    [`/bracket/${TOKEN}`, "/bracket/:token"],
    [`/tcr/staff/join/${TOKEN}`, "/tcr/staff/join/:token"],
    [`/TCR/staff/join/${TOKEN}`, "/TCR/staff/join/:token"],
    [`/teams/claim/${TOKEN}`, "/teams/claim/:token"],
    [`/teams/join/${TOKEN}`, "/teams/join/:token"],
    [`/invite/development-division/${TOKEN}`, "/invite/development-division/:token"],
  ];

  it.each(families)("redacts %s", (input, expected) => {
    const result = redactTokenPath(input);
    expect(result).toBe(expected);
    expect(result).not.toContain(TOKEN);
  });

  it("leaves ordinary routes alone", () => {
    for (const path of ["/", "/TCR", "/TCR/templates", "/tournaments/community"]) {
      expect(redactTokenPath(path)).toBe(path);
    }
  });
});

describe("redactUrl", () => {
  it("keeps origin and route, drops the token and the query", () => {
    expect(
      redactUrl(`https://murphtournaments.com/bracket/${TOKEN}?x=${TOKEN}`)
    ).toBe("https://murphtournaments.com/bracket/:token");
    expect(redactUrl("https://murphtournaments.com/TCR?tab=teams")).toBe(
      "https://murphtournaments.com/TCR"
    );
  });

  it("redacts a relative path too", () => {
    expect(redactUrl(`/teams/claim/${TOKEN}?a=b`)).toBe("/teams/claim/:token");
  });

  // A caller that hands this something unexpected must not get the original
  // back, or the redaction is bypassed by passing a malformed value.
  it("never returns an input it could not parse", () => {
    for (const value of ["not a url", "", null, undefined, 42, {}]) {
      const result = redactUrl(value as unknown);
      expect(result === "" || result === "[unparseable url]").toBe(true);
    }
  });

  it("does not leak a token through a value it cannot parse", () => {
    expect(redactUrl(`http://[bad-url/bracket/${TOKEN}`)).not.toContain(TOKEN);
  });
});
