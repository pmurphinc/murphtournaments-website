import { describe, expect, it } from "vitest";
import {
  connectorRadius,
  getConnectionEndpoint,
  getConnectorPoint,
  getNodeHeight,
  shouldStartCanvasPan,
} from "../pages/TournamentControlRoom";

const cashout = { gameType: "cashout" as const, canvasX: 100, canvasY: 200 };
const final = { gameType: "final_round" as const, canvasX: 500, canvasY: 75 };

describe("Tournament Control Room connector math", () => {
  it("anchors expanded source and target paths to connector circle perimeters", () => {
    expect(getConnectorPoint(cashout, "bottom", false)).toEqual({ x: 260, y: 200 + getNodeHeight("cashout", false) + connectorRadius });
    expect(getConnectorPoint(final, "top", false)).toEqual({ x: 660, y: 75 - connectorRadius });
  });

  it("anchors minimized source paths to the bottom connector perimeter", () => {
    expect(getConnectorPoint(cashout, "bottom", true)).toEqual({ x: 260, y: 200 + getNodeHeight("cashout", true) + connectorRadius });
  });

  it("anchors minimized target paths to the top connector perimeter", () => {
    expect(getConnectorPoint(final, "top", true)).toEqual({ x: 660, y: 75 - connectorRadius });
  });

  it("uses the same radius for minimized-to-minimized endpoint offsets", () => {
    expect(getConnectionEndpoint({ x: 10, y: 20 }, "bottom")).toEqual({ x: 10, y: 32 });
    expect(getConnectionEndpoint({ x: 10, y: 20 }, "top")).toEqual({ x: 10, y: 8 });
  });
});

describe("Tournament Control Room background pan guard", () => {
  class FakeElement {
    constructor(private match: boolean) {}
    closest() { return this.match ? this : null; }
  }

  it("allows panning from plain canvas background", () => {
    const previous = globalThis.HTMLElement;
    // @ts-expect-error test shim for node environment
    globalThis.HTMLElement = FakeElement;
    expect(shouldStartCanvasPan(new FakeElement(false) as unknown as HTMLElement)).toBe(true);
    globalThis.HTMLElement = previous;
  });

  it("does not pan from lobby nodes, team cards, buttons, or connector ports", () => {
    const previous = globalThis.HTMLElement;
    // @ts-expect-error test shim for node environment
    globalThis.HTMLElement = FakeElement;
    expect(shouldStartCanvasPan(new FakeElement(true) as unknown as HTMLElement)).toBe(false);
    globalThis.HTMLElement = previous;
  });
});
