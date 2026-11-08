import { describe, expect, it } from "vitest";
import { parsePatchNoteText } from "./patchNoteText";

/**
 * Update 12.1.0 showed readers the literal text
 * "[https://docs.google.com/forms/.../viewform this form]" with no way to
 * click it. The cleaner strips wiki `[[internal]]` links but never touched
 * the single-bracket external form, and the page rendered content as text.
 */

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfL71ebsDhgn0/viewform";

describe("wiki external links", () => {
  it("makes the label the link, not the raw URL", () => {
    const segments = parsePatchNoteText(
      `please fill out [${FORM_URL} this form], so the name can be reviewed.`
    );
    expect(segments).toEqual([
      { type: "text", value: "please fill out " },
      { type: "link", href: FORM_URL, label: "this form" },
      { type: "text", value: ", so the name can be reviewed." },
    ]);
  });

  it("falls back to the URL when the link has no label", () => {
    const [segment] = parsePatchNoteText(`[${FORM_URL}]`);
    expect(segment).toEqual({
      type: "link",
      href: FORM_URL,
      label: FORM_URL,
    });
  });
});

describe("bare URLs", () => {
  it("links them", () => {
    const segments = parsePatchNoteText(`See ${FORM_URL} for details`);
    expect(segments[1]).toEqual({
      type: "link",
      href: FORM_URL,
      label: FORM_URL,
    });
  });

  it("leaves sentence punctuation out of the href", () => {
    const segments = parsePatchNoteText(`Read ${FORM_URL}.`);
    const link = segments.find(s => s.type === "link");
    expect(link).toEqual({ type: "link", href: FORM_URL, label: FORM_URL });
    expect(segments[segments.length - 1]).toEqual({
      type: "text",
      value: ".",
    });
  });
});

describe("what must never become a link", () => {
  /**
   * This text is scraped from a third-party site and goes straight into an
   * href, so the scheme allowlist is the whole defence.
   */
  it("ignores schemes other than http and https", () => {
    for (const hostile of [
      "[javascript:alert(1) click me]",
      "[data:text/html;base64,PHN2Zz4= click me]",
      "javascript:alert(1)",
      "[file:///etc/passwd open]",
    ]) {
      const segments = parsePatchNoteText(hostile);
      expect(segments.every(segment => segment.type === "text")).toBe(true);
    }
  });

  it("returns plain text unchanged", () => {
    expect(parsePatchNoteText("No links here at all.")).toEqual([
      { type: "text", value: "No links here at all." },
    ]);
    expect(parsePatchNoteText("")).toEqual([]);
  });

  it("does not treat an ordinary bracketed aside as a link", () => {
    expect(parsePatchNoteText("Damage [see table] reduced")).toEqual([
      { type: "text", value: "Damage [see table] reduced" },
    ]);
  });
});
