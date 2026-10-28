import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import TcrConnectorLegend from "./TcrConnectorLegend";

const html = renderToStaticMarkup(<TcrConnectorLegend />);

describe("TcrConnectorLegend", () => {
  it("labels both connector flows in text, not color alone", () => {
    expect(html).toContain("Winners advance");
    expect(html).toContain("Losers drop down");
    expect(html).toContain(">W<");
    expect(html).toContain(">L<");
  });

  it("uses the same two colors the board draws connections with", () => {
    // TournamentControlRoom strokes winner connections #FFD700 and loser
    // connections #F8FAFC; the swatches have to match or the key is wrong.
    expect(html).toContain("background-color:#FFD700");
    expect(html).toContain("background-color:#F8FAFC");
  });

  it("is exposed to assistive tech as a labelled region", () => {
    expect(html).toContain('aria-label="Connector legend"');
  });

  it("marks the color swatches decorative so the meaning is read once", () => {
    const ariaHiddenCount = html.split('aria-hidden="true"').length - 1;
    // one swatch + one letter per row, two rows
    expect(ariaHiddenCount).toBe(4);
  });

  it("never intercepts board pointer events", () => {
    // A previous overlay regression (a connector <svg> rendered above the
    // nodes without pointer-events-none) swallowed clicks on the elements
    // underneath it; this overlay sits above the canvas the same way.
    expect(html).toContain("pointer-events-none");
  });
});
