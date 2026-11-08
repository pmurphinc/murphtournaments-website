import { describe, expect, it } from "vitest";
import { cleanPatchNoteContent } from "./patchNoteContent";

/**
 * Patch notes arrive from more than one source. The cleaner was written for
 * wiki markup and stripped only a few HTML tags, so Update 12.1.0 — which
 * came through as HTML — rendered "<h2> CHAT & DISPLAY NAMES </h2>" as
 * visible text on the live patch notes page.
 *
 * The cleaner runs on read, so fixing it fixes every stored note without a
 * re-scrape.
 */

describe("HTML in scraped patch notes", () => {
  // Copied from what the live API actually returned for 12.1.0.
  const realExample =
    "<h2> CHAT & DISPLAY NAMES </h2>\nWith the release of PRIME TIME, our new moderation tools have been hard at work.";

  it("renders the heading as text, not as a tag", () => {
    const cleaned = cleanPatchNoteContent(realExample);
    expect(cleaned).toContain("CHAT & DISPLAY NAMES");
    expect(cleaned).not.toContain("<h2>");
    expect(cleaned).not.toContain("</h2>");
  });

  it("strips every heading level and the common block tags", () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const cleaned = cleanPatchNoteContent(
        `<h${level}>Heading</h${level}>\nBody`
      );
      expect(cleaned).toContain("Heading");
      expect(cleaned).not.toContain(`<h${level}`);
    }
    const cleaned = cleanPatchNoteContent(
      "<p>First</p><div>Second</div><strong>Third</strong>"
    );
    expect(cleaned).toContain("First");
    expect(cleaned).toContain("Second");
    expect(cleaned).toContain("Third");
    expect(cleaned).not.toMatch(/<\/?(?:p|div|strong)>/);
  });

  it("turns list items into the same bullet the wiki lists use", () => {
    const cleaned = cleanPatchNoteContent("<ul><li>One</li><li>Two</li></ul>");
    expect(cleaned).toContain("• One");
    expect(cleaned).toContain("• Two");
    expect(cleaned).not.toContain("<li>");
  });

  /**
   * The reason the tag list is explicit rather than /<[^>]+>/: patch notes
   * are full of numbers, and a blanket rule would delete everything between
   * a "less than" and the next ">" in the document.
   */
  it("leaves comparisons in body text alone", () => {
    const cleaned = cleanPatchNoteContent(
      "Damage below <100 now applies, and values >200 are capped."
    );
    expect(cleaned).toContain("<100");
    expect(cleaned).toContain(">200");
  });

  it("still handles the wiki markup it always did", () => {
    expect(cleanPatchNoteContent("== Weapons ==\n* Nerfed")).toContain(
      "Weapons"
    );
    expect(cleanPatchNoteContent("* Nerfed")).toContain("• Nerfed");
    expect(cleanPatchNoteContent("Line<br>Break")).toContain("Line\nBreak");
  });
});
