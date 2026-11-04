import { describe, expect, it } from "vitest";
import {
  DEFAULT_METADATA,
  SITE_NAME,
  injectPageMetadata,
  metadataForPath,
  normalizePath,
} from "./pageMetadata";

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Murph Tournaments</title>
    <link rel="icon" href="/images/favicon-32.png" />
  </head>
  <body><div id="root"></div></body>
</html>`;

describe("page metadata routing", () => {
  it("normalizes query strings, hashes and trailing slashes away", () => {
    expect(normalizePath("/TCR/")).toBe("/TCR");
    expect(normalizePath("/TCR?tab=teams")).toBe("/TCR");
    expect(normalizePath("/TCR#top")).toBe("/TCR");
    expect(normalizePath("TCR")).toBe("/TCR");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
  });

  it("titles the Control Room index in either casing", () => {
    for (const path of ["/TCR", "/tcr", "/TCR/"]) {
      expect(metadataForPath(path).title).toBe(
        `Tournament Control Room | ${SITE_NAME}`
      );
    }
  });

  // The templates and staff-join routes would both be swallowed by the
  // /tcr/:tournamentId pattern if the rules were ever reordered.
  it("prefers the specific TCR routes over the board pattern", () => {
    expect(metadataForPath("/TCR/templates").title).toBe(
      `Control Room Templates | ${SITE_NAME}`
    );
    expect(metadataForPath("/tcr/staff/join/abc123").title).toBe(
      `Staff Invite | ${SITE_NAME}`
    );
    expect(metadataForPath("/TCR/42").title).toBe(`Control Room | ${SITE_NAME}`);
  });

  it("gives the shareable bracket viewer its own preview", () => {
    const meta = metadataForPath("/bracket/some-viewer-token");
    expect(meta.title).toBe(`Tournament Bracket | ${SITE_NAME}`);
    expect(meta.description).toContain("No account needed");
  });

  it("falls back to the site default for an unmapped route", () => {
    expect(metadataForPath("/some/page/that/does/not/exist")).toBe(
      DEFAULT_METADATA
    );
    expect(metadataForPath("/").title).toBe(SITE_NAME);
  });
});

describe("noindex coverage", () => {
  // Each of these URLs is itself the credential: indexing one hands a
  // stranger whatever it unlocks.
  const tokenBearing = [
    "/bracket/tok",
    "/TCR/staff/join/tok",
    "/tcr/staff/join/tok",
    "/teams/claim/tok",
    "/teams/join/tok",
    "/invite/development-division/tok",
    "/TCR/7",
    "/admin/tournaments/control",
  ];

  it.each(tokenBearing)("marks %s noindex", path => {
    expect(metadataForPath(path).noindex).toBe(true);
  });

  const indexable = ["/", "/TCR", "/TCR/templates", "/about", "/teams"];

  it.each(indexable)("leaves %s indexable", path => {
    expect(metadataForPath(path).noindex).toBeUndefined();
  });
});

describe("metadata injection", () => {
  it("replaces the hard-coded title and adds preview tags", () => {
    const html = injectPageMetadata(INDEX_HTML, "/TCR");

    expect(html).toContain(
      `<title>Tournament Control Room | ${SITE_NAME}</title>`
    );
    expect(html).not.toContain("<title>Murph Tournaments</title>");
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    // Everything else in the document survives.
    expect(html).toContain('<link rel="icon" href="/images/favicon-32.png" />');
    expect(html).toContain('<div id="root"></div>');
  });

  it("builds og:url and canonical from the fixed origin, not the request host", () => {
    const html = injectPageMetadata(INDEX_HTML, "/TCR/templates?from=nav");
    expect(html).toContain(
      '<meta property="og:url" content="https://murphtournaments.com/TCR/templates" />'
    );
    expect(html).toContain(
      '<link rel="canonical" href="https://murphtournaments.com/TCR/templates" />'
    );
  });

  it("sends robots noindex instead of a canonical on token-bearing routes", () => {
    const html = injectPageMetadata(INDEX_HTML, "/bracket/tok");
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).not.toContain('rel="canonical"');
  });

  it("escapes quotes and angle brackets so a title cannot break out of an attribute", () => {
    const html = injectPageMetadata(
      '<html><head><title>x</title></head><body></body></html>',
      '/"><script>alert(1)</script>'
    );
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("leaves a document with no title untouched", () => {
    const noTitle = "<html><head></head><body>hi</body></html>";
    expect(injectPageMetadata(noTitle, "/TCR")).toBe(noTitle);
  });
});
