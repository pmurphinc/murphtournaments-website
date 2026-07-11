import { describe, expect, it } from "vitest";
import {
  getConnectorEndpoints,
  getConnectorPoint,
  getFitToContentView,
} from "./tournamentControlBoard";
import {
  getViewerLocalPosition,
  resetViewerLayoutState,
} from "../pages/TournamentControlViewer";

describe("Tournament Control Viewer local board state", () => {
  const game = {
    id: 1,
    gameType: "cashout" as const,
    canvasX: 100,
    canvasY: 120,
  };

  it("keeps local viewer positions separate from official server positions", () => {
    const local = new Map([[1, { x: 500, y: 600 }]]);
    expect(getViewerLocalPosition(game, local)).toEqual({ x: 500, y: 600 });
    expect(game).toMatchObject({ canvasX: 100, canvasY: 120 });
  });

  it("resetting local viewer positions restores official positions and clears minimization", () => {
    const reset = resetViewerLayoutState();
    expect(getViewerLocalPosition(game, reset.localPositions)).toEqual({
      x: 100,
      y: 120,
    });
    expect(reset.minimized.size).toBe(0);
  });

  it("fits to content using minimized viewer lobby heights", () => {
    const expanded = getFitToContentView(
      [game],
      new Set<number>(),
      { width: 900, height: 700 },
      80
    );
    const minimized = getFitToContentView(
      [game],
      new Set([1]),
      { width: 900, height: 700 },
      80
    );
    expect(minimized.zoom).toBeGreaterThanOrEqual(expanded.zoom);
  });

  it("connector geometry uses locally overridden positions and minimized node heights", () => {
    const source = getConnectorPoint(game, "bottom", true, { x: 500, y: 600 });
    const target = getConnectorPoint({ ...game, id: 2 }, "top", false, {
      x: 700,
      y: 900,
    });
    const endpoints = getConnectorEndpoints(source, target);
    expect(source.x).toBe(616);
    expect(source.y).toBe(744);
    expect(endpoints.source).not.toEqual(source);
  });
});
