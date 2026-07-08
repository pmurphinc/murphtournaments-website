import { describe, expect, it } from "vitest";
import {
  connectorRadius,
  getConnectionEndpoint,
  getConnectorEndpoints,
  getConnectorPoint,
  getNextAvailableSlot,
  getNodeHeight,
  shouldStartCanvasPan,
} from "../pages/TournamentControlRoom";

const cashout = { gameType: "cashout" as const, canvasX: 100, canvasY: 200 };
const final = { gameType: "final_round" as const, canvasX: 500, canvasY: 75 };

describe("Tournament Control Room slot selection", () => {
  const assignments = [
    { teamId: 10, slotIndex: 1 },
    { teamId: 11, slotIndex: 3 },
  ];

  it("dropping onto an occupied slot selects the next available slot", () => {
    expect(getNextAvailableSlot(assignments, 4, 1, 12)).toBe(2);
  });

  it("dropping onto the lobby body selects the next available slot", () => {
    expect(getNextAvailableSlot(assignments, 4, undefined, 12)).toBe(2);
  });

  it("returns null when the lobby is full", () => {
    expect(getNextAvailableSlot([
      { teamId: 10, slotIndex: 1 },
      { teamId: 11, slotIndex: 2 },
    ], 2, 1, 12)).toBeNull();
  });

  it("does not duplicate a team in the same target lobby", () => {
    expect(getNextAvailableSlot(assignments, 4, 2, 10)).toBeNull();
  });
});

describe("Tournament Control Room connector math", () => {
  it("anchors expanded source and target paths to connector circle perimeters", () => {
    expect(getConnectorPoint(cashout, "bottom", false)).toEqual({ x: 260, y: 200 + getNodeHeight("cashout", false) + connectorRadius });
    expect(getConnectorPoint(final, "top", false)).toEqual({ x: 660, y: 75 - connectorRadius });
  });

  it("anchors minimized source paths to the bottom connector perimeter", () => {
    expect(getConnectorPoint(cashout, "bottom", true)).toEqual({ x: 260, y: 200 + getNodeHeight("cashout", true) + connectorRadius });
  });

  it("uses the same radius for minimized-to-minimized endpoint offsets", () => {
    expect(getConnectionEndpoint({ x: 10, y: 20 }, "bottom")).toEqual({ x: 10, y: 32 });
    expect(getConnectionEndpoint({ x: 10, y: 20 }, "top")).toEqual({ x: 10, y: 8 });
  });

  it.each([
    ["expanded empty lobby", { x: 100, y: 100 }, { x: 100, y: 538 }],
    ["expanded full lobby", { x: 120, y: 140 }, { x: 120, y: 620 }],
    ["lobby with code DM panel height increased", { x: 250, y: 100 }, { x: 250, y: 760 }],
    ["minimized lobby", { x: 320, y: 80 }, { x: 320, y: 212 }],
    ["source above target", { x: 0, y: 0 }, { x: 0, y: 100 }],
    ["source beside target", { x: 0, y: 0 }, { x: 100, y: 0 }],
  ])("attaches endpoint math to circle perimeters for %s", (_label, sourceCenter, targetCenter) => {
    const endpoints = getConnectorEndpoints(sourceCenter, targetCenter);
    expect(Math.hypot(endpoints.source.x - sourceCenter.x, endpoints.source.y - sourceCenter.y)).toBeCloseTo(connectorRadius);
    expect(Math.hypot(endpoints.target.x - targetCenter.x, endpoints.target.y - targetCenter.y)).toBeCloseTo(connectorRadius);
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

  it.each(["lobby node", "team card", "connector port", "button", "input/select/textarea", "menu item"])(
    "does not pan from %s",
    () => {
      const previous = globalThis.HTMLElement;
      // @ts-expect-error test shim for node environment
      globalThis.HTMLElement = FakeElement;
      expect(shouldStartCanvasPan(new FakeElement(true) as unknown as HTMLElement)).toBe(false);
      globalThis.HTMLElement = previous;
    }
  );
});
