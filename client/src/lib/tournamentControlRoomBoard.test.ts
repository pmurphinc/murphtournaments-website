import { describe, expect, it } from "vitest";
import {
  connectorRadius,
  controlRoomGridSize,
  getCanvasPanScroll,
  getConnectionEndpoint,
  getConnectorEndpoints,
  getConnectorPoint,
  getGameStatusClasses,
  getMidpoint,
  getNextPlacementValue,
  getPointerDistance,
  getNextAvailableSlot,
  getNodeHeight,
  getResolvedDropSlot,
  getViewportPreservingScroll,
  getCenterZoomView,
  getEmptyBoardResetView,
  getFitToContentView,
  minZoom,
  maxZoom,
  getBoundedControlKeyPosition,
  getAvailableTeamsToggleLabel,
  getAdvancingPlacements,
  shouldStartCanvasPan,
  shouldCancelBoardDragsForPinch,
  snapCanvasPointToGrid,
} from "../pages/TournamentControlRoom";

const cashout = { gameType: "cashout" as const, canvasX: 100, canvasY: 200 };
const final = { gameType: "final_round" as const, canvasX: 500, canvasY: 75 };

describe("Tournament Control Room slot selection", () => {
  const assignments = [
    { teamId: 10, slotIndex: 1 },
    { teamId: 11, slotIndex: 3 },
  ];

  it("dropping onto an empty slot resolves that slot", () => {
    expect(getResolvedDropSlot("draft", assignments, 4, 12, 2)).toBe(2);
  });

  it("dropping onto an occupied slot selects the next available slot", () => {
    expect(getResolvedDropSlot("draft", assignments, 4, 12, 1)).toBe(2);
    expect(getNextAvailableSlot(assignments, 4, 1, 12)).toBe(2);
  });

  it("dropping onto the lobby body selects the first available slot", () => {
    expect(getResolvedDropSlot("ready", assignments, 4, 12)).toBe(2);
  });

  it("returns null when the lobby is full", () => {
    expect(
      getResolvedDropSlot(
        "live",
        [
          { teamId: 10, slotIndex: 1 },
          { teamId: 11, slotIndex: 2 },
        ],
        2,
        12,
        1
      )
    ).toBeNull();
  });

  it("ignores completed lobby drops", () => {
    expect(getResolvedDropSlot("complete", assignments, 4, 12, 2)).toBeNull();
  });

  it("does not duplicate a team in the same target lobby", () => {
    expect(getResolvedDropSlot("draft", assignments, 4, 10, 2)).toBeNull();
  });

  it("resolves a cross-lobby move only when the target slot is available", () => {
    expect(getResolvedDropSlot("live", assignments, 4, 12, 4)).toBe(4);
    expect(
      getResolvedDropSlot(
        "live",
        [
          { teamId: 10, slotIndex: 1 },
          { teamId: 11, slotIndex: 2 },
        ],
        2,
        12
      )
    ).toBeNull();
  });
});

describe("Tournament Control Room placement cycling", () => {
  it("cycles Cashout placement from empty through 1st-4th and back to empty", () => {
    const cycle = [null, 1, 2, 3, 4].map(value =>
      getNextPlacementValue(value, 4)
    );

    expect(cycle).toEqual([1, 2, 3, 4, null]);
  });

  it("cycles Final Round placement from empty through 1st-2nd and back to empty", () => {
    const cycle = [null, 1, 2].map(value => getNextPlacementValue(value, 2));

    expect(cycle).toEqual([1, 2, null]);
  });
});

describe("Tournament Control Room connector math", () => {
  it("anchors expanded source and target paths to connector circle perimeters", () => {
    expect(getConnectorPoint(cashout, "bottom", false)).toEqual({
      x: 216,
      y: 200 + getNodeHeight("cashout", false) + connectorRadius,
    });
    expect(getConnectorPoint(final, "top", false)).toEqual({
      x: 660,
      y: 75 - connectorRadius,
    });
  });

  it("separates winner and loser bottom source positions while keeping the receiver centered", () => {
    expect(getConnectorPoint(cashout, "top", false)).toEqual({
      x: 260,
      y: 200 - connectorRadius,
    });
    expect(
      getConnectorPoint(cashout, "bottom", false, undefined, "winner")
    ).toEqual({
      x: 216,
      y: 200 + getNodeHeight("cashout", false) + connectorRadius,
    });
    expect(
      getConnectorPoint(cashout, "bottom", false, undefined, "loser")
    ).toEqual({
      x: 304,
      y: 200 + getNodeHeight("cashout", false) + connectorRadius,
    });
  });

  it("anchors minimized source paths to the bottom connector perimeter", () => {
    expect(getConnectorPoint(cashout, "bottom", true)).toEqual({
      x: 216,
      y: 200 + getNodeHeight("cashout", true) + connectorRadius,
    });
  });

  it("uses the same radius for minimized-to-minimized endpoint offsets", () => {
    expect(getConnectionEndpoint({ x: 10, y: 20 }, "bottom")).toEqual({
      x: 10,
      y: 32,
    });
    expect(getConnectionEndpoint({ x: 10, y: 20 }, "top")).toEqual({
      x: 10,
      y: 8,
    });
  });

  it.each([
    ["expanded empty lobby", { x: 100, y: 100 }, { x: 100, y: 538 }],
    ["expanded full lobby", { x: 120, y: 140 }, { x: 120, y: 620 }],
    [
      "lobby with code DM panel height increased",
      { x: 250, y: 100 },
      { x: 250, y: 760 },
    ],
    ["minimized lobby", { x: 320, y: 80 }, { x: 320, y: 212 }],
    ["source above target", { x: 0, y: 0 }, { x: 0, y: 100 }],
    ["source beside target", { x: 0, y: 0 }, { x: 100, y: 0 }],
  ])(
    "attaches endpoint math to circle perimeters for %s",
    (_label, sourceCenter, targetCenter) => {
      const endpoints = getConnectorEndpoints(sourceCenter, targetCenter);
      expect(
        Math.hypot(
          endpoints.source.x - sourceCenter.x,
          endpoints.source.y - sourceCenter.y
        )
      ).toBeCloseTo(connectorRadius);
      expect(
        Math.hypot(
          endpoints.target.x - targetCenter.x,
          endpoints.target.y - targetCenter.y
        )
      ).toBeCloseTo(connectorRadius);
    }
  );
});

describe("Tournament Control Room advancement placement flow", () => {
  it("keeps winner flow placements as the default", () => {
    expect(getAdvancingPlacements("cashout")).toEqual([1, 2]);
    expect(getAdvancingPlacements("final_round")).toEqual([1]);
  });

  it("returns winner flow placements", () => {
    expect(getAdvancingPlacements("cashout", "winner")).toEqual([1, 2]);
    expect(getAdvancingPlacements("final_round", "winner")).toEqual([1]);
  });

  it("returns loser flow placements", () => {
    expect(getAdvancingPlacements("cashout", "loser")).toEqual([3, 4]);
    expect(getAdvancingPlacements("final_round", "loser")).toEqual([2]);
  });
});

describe("Tournament Control Room grid snapping", () => {
  it("uses the exported 40px board grid by default", () => {
    expect(controlRoomGridSize).toBe(40);
    expect(snapCanvasPointToGrid({ x: 61, y: 79 })).toEqual({ x: 80, y: 80 });
  });

  it("rounds positions to the nearest grid line", () => {
    expect(snapCanvasPointToGrid({ x: 19, y: 20 })).toEqual({ x: 0, y: 40 });
    expect(snapCanvasPointToGrid({ x: 101, y: 119 })).toEqual({
      x: 120,
      y: 120,
    });
  });

  it("clamps snapped coordinates to non-negative values", () => {
    expect(snapCanvasPointToGrid({ x: -21, y: -1 })).toEqual({ x: 0, y: 0 });
  });

  it("supports a custom grid size for helper reuse", () => {
    expect(snapCanvasPointToGrid({ x: 26, y: 74 }, 25)).toEqual({
      x: 25,
      y: 75,
    });
  });
});

describe("Tournament Control Room background pan guard", () => {
  class FakeElement {
    public lastSelector = "";
    constructor(private readonly matchesSelector: boolean) {}
    closest(selector: string) {
      this.lastSelector = selector;
      return this.matchesSelector ? this : null;
    }
  }

  function withFakeHTMLElement<T>(callback: () => T) {
    const previousHTMLElement = globalThis.HTMLElement;
    const previousElement = globalThis.Element;
    globalThis.HTMLElement = FakeElement as unknown as typeof HTMLElement;
    globalThis.Element = FakeElement as unknown as typeof Element;
    try {
      return callback();
    } finally {
      globalThis.HTMLElement = previousHTMLElement;
      globalThis.Element = previousElement;
    }
  }

  it("allows panning from plain canvas background", () => {
    withFakeHTMLElement(() => {
      expect(
        shouldStartCanvasPan(new FakeElement(false) as unknown as HTMLElement)
      ).toBe(true);
    });
  });

  it.each([
    ["lobby nodes", '[data-control-node="true"]'],
    ["team cards", '[data-team-card="true"]'],
    ["connector ports", '[data-connector-port="true"]'],
    ["connection lines", '[data-connection-line="true"]'],
    ["buttons", "button"],
    ["inputs", "input"],
    ["selects", "select"],
    ["textareas", "textarea"],
    ["menu items", '[role="menuitem"]'],
    ["draggable elements", '[draggable="true"]'],
  ])("does not pan from %s", (_label, selectorFragment) => {
    withFakeHTMLElement(() => {
      const element = new FakeElement(true);
      expect(shouldStartCanvasPan(element as unknown as HTMLElement)).toBe(
        false
      );
      expect(element.lastSelector).toContain(selectorFragment);
    });
  });

  it("calculates scroll offsets from pointer deltas", () => {
    expect(
      getCanvasPanScroll(
        { clientX: 100, clientY: 200, scrollLeft: 40, scrollTop: 90 },
        85,
        260
      )
    ).toEqual({
      scrollLeft: 55,
      scrollTop: 30,
    });
  });

  it("requests board drag cancellation as soon as a pinch can start", () => {
    expect(shouldCancelBoardDragsForPinch(0)).toBe(false);
    expect(shouldCancelBoardDragsForPinch(1)).toBe(false);
    expect(shouldCancelBoardDragsForPinch(2)).toBe(true);
    expect(shouldCancelBoardDragsForPinch(3)).toBe(true);
  });
});

describe("Tournament Control Room pinch zoom math", () => {
  it("calculates two-pointer distance and midpoint", () => {
    const first = { clientX: 10, clientY: 20 };
    const second = { clientX: 40, clientY: 60 };

    expect(getPointerDistance(first, second)).toBe(50);
    expect(getMidpoint(first, second)).toEqual({ x: 25, y: 40 });
  });

  it("keeps the focal canvas point under the same viewport point while zooming", () => {
    expect(
      getViewportPreservingScroll(
        { x: 300, y: 200 },
        { x: 250, y: 180 },
        { left: 50, top: 30 },
        1.5
      )
    ).toEqual({
      scrollLeft: 250,
      scrollTop: 150,
    });
  });
});

describe("Tournament Control Room zoom controls", () => {
  it("zooms button clicks around the viewport center while preserving scroll focus", () => {
    expect(
      getCenterZoomView(
        { width: 800, height: 600 },
        { scrollLeft: 200, scrollTop: 100 },
        1,
        1.25
      )
    ).toEqual({
      zoom: 1.25,
      scrollLeft: 350,
      scrollTop: 200,
    });
  });

  it("clamps fit-to-view zoom between the board zoom limits", () => {
    const fitted = getFitToContentView(
      [
        { id: 1, gameType: "cashout", canvasX: 100, canvasY: 120 },
        { id: 2, gameType: "final_round", canvasX: 1200, canvasY: 900 },
      ],
      new Set<number>(),
      { width: 640, height: 480 },
      64
    );

    expect(fitted.zoom).toBeGreaterThanOrEqual(minZoom);
    expect(fitted.zoom).toBeLessThanOrEqual(maxZoom);
  });

  it("uses minimized node heights for fit-to-view content bounds", () => {
    const expanded = getFitToContentView(
      [{ id: 1, gameType: "cashout", canvasX: 100, canvasY: 100 }],
      new Set<number>(),
      { width: 900, height: 700 },
      80
    );
    const minimized = getFitToContentView(
      [{ id: 1, gameType: "cashout", canvasX: 100, canvasY: 100 }],
      new Set([1]),
      { width: 900, height: 700 },
      80
    );

    expect(minimized.zoom).toBeGreaterThanOrEqual(expanded.zoom);
  });

  it("resets empty boards to 100 percent near the usable top-left", () => {
    expect(getEmptyBoardResetView()).toEqual({
      zoom: 1,
      scrollLeft: 0,
      scrollTop: 0,
    });
    expect(
      getFitToContentView([], new Set<number>(), { width: 800, height: 600 })
    ).toEqual(getEmptyBoardResetView());
  });
});

describe("Tournament Control Room control key positioning", () => {
  it("keeps a draggable control key inside viewport padding", () => {
    expect(
      getBoundedControlKeyPosition(
        { x: 900, y: -20 },
        { width: 800, height: 600 },
        { width: 240, height: 180 },
        12
      )
    ).toEqual({ x: 548, y: 12 });
  });
});

describe("Tournament Control Room status colors", () => {
  it.each([
    ["draft" as const, "zinc"],
    ["ready" as const, "yellow"],
    ["live" as const, "emerald"],
    ["complete" as const, "red"],
  ])("maps %s to stoplight classes", (status, expectedColor) => {
    const classes = getGameStatusClasses(status);
    expect(classes.nodeBorder).toContain(expectedColor);
    expect(classes.statusPill).toContain(expectedColor);
  });
});

describe("Tournament Control Room mobile team panel labels", () => {
  it("formats the compact available-team toggle with a count", () => {
    expect(getAvailableTeamsToggleLabel(12)).toBe("Available Teams (12)");
    expect(getAvailableTeamsToggleLabel(0)).toBe("Available Teams (0)");
  });
});
