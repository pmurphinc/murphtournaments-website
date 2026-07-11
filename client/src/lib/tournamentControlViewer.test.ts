import { describe, expect, it } from "vitest";
import {
  getConnectorPoint,
  getFitToContentView,
  getNodeHeight,
} from "./tournamentControlBoard";
import {
  getViewerConnectionEndpoints,
  getViewerConnectorNodeDescriptors,
  getViewerLocalPosition,
  getViewerVisualPosition,
  resetViewerLayoutState,
  type NodeDragState,
} from "../pages/TournamentControlViewer";

describe("Tournament Control Viewer local board state", () => {
  const game = {
    id: 1,
    gameType: "cashout" as const,
    canvasX: 100,
    canvasY: 120,
  };
  const target = {
    id: 2,
    gameType: "final_round" as const,
    canvasX: 700,
    canvasY: 900,
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

  it("uses the active drag position before a locally saved position", () => {
    const local = new Map([[1, { x: 500, y: 600 }]]);
    const drag: NodeDragState = {
      gameId: 1,
      offsetX: 10,
      offsetY: 20,
      x: 800,
      y: 900,
    };
    expect(getViewerVisualPosition(game, local, drag)).toEqual({
      x: 800,
      y: 900,
    });
  });

  it("uses a locally saved position before the official server position when no drag is active", () => {
    const local = new Map([[1, { x: 500, y: 600 }]]);
    expect(getViewerVisualPosition(game, local, null)).toEqual({
      x: 500,
      y: 600,
    });
  });

  it("uses the official server position without an active drag or local override", () => {
    expect(getViewerVisualPosition(game, new Map(), null)).toEqual({
      x: 100,
      y: 120,
    });
  });

  it("updates connection geometry immediately when the active drag position changes", () => {
    const firstDrag: NodeDragState = {
      gameId: 1,
      offsetX: 0,
      offsetY: 0,
      x: 300,
      y: 400,
    };
    const secondDrag: NodeDragState = {
      ...firstDrag,
      x: 420,
      y: 520,
    };
    const first = getViewerConnectionEndpoints(
      game,
      target,
      "winner",
      new Set(),
      new Map(),
      firstDrag
    );
    const second = getViewerConnectionEndpoints(
      game,
      target,
      "winner",
      new Set(),
      new Map(),
      secondDrag
    );
    expect(second.source).not.toEqual(first.source);
    expect(second.target).not.toEqual(first.target);
  });

  it("uses the winner output location for winner connections", () => {
    const endpoints = getViewerConnectionEndpoints(
      game,
      target,
      "winner",
      new Set(),
      new Map(),
      null
    );
    const winnerPoint = getConnectorPoint(
      game,
      "bottom",
      false,
      { x: game.canvasX, y: game.canvasY },
      "winner"
    );
    const loserPoint = getConnectorPoint(
      game,
      "bottom",
      false,
      { x: game.canvasX, y: game.canvasY },
      "loser"
    );
    expect(Math.abs(endpoints.source.x - winnerPoint.x)).toBeLessThan(
      Math.abs(endpoints.source.x - loserPoint.x)
    );
  });

  it("uses the loser output location for loser connections", () => {
    const endpoints = getViewerConnectionEndpoints(
      game,
      target,
      "loser",
      new Set(),
      new Map(),
      null
    );
    const winnerPoint = getConnectorPoint(
      game,
      "bottom",
      false,
      { x: game.canvasX, y: game.canvasY },
      "winner"
    );
    const loserPoint = getConnectorPoint(
      game,
      "bottom",
      false,
      { x: game.canvasX, y: game.canvasY },
      "loser"
    );
    expect(Math.abs(endpoints.source.x - loserPoint.x)).toBeLessThan(
      Math.abs(endpoints.source.x - winnerPoint.x)
    );
  });

  it("uses the minimized lobby connector height for minimized geometry", () => {
    const endpoints = getViewerConnectionEndpoints(
      game,
      target,
      "winner",
      new Set([1]),
      new Map([[1, { x: 500, y: 600 }]]),
      null
    );
    const minimizedPoint = getConnectorPoint(
      game,
      "bottom",
      true,
      { x: 500, y: 600 },
      "winner"
    );
    const expandedPoint = getConnectorPoint(
      game,
      "bottom",
      false,
      { x: 500, y: 600 },
      "winner"
    );
    expect(minimizedPoint.y).toBe(600 + getNodeHeight("cashout", true) + 12);
    expect(Math.abs(endpoints.source.y - minimizedPoint.y)).toBeLessThan(
      Math.abs(endpoints.source.y - expandedPoint.y)
    );
  });

  it("describes viewer connector nodes as presentation-only with no mutation affordance", () => {
    expect(getViewerConnectorNodeDescriptors()).toEqual([
      { port: "top", label: "Receives advancing team", interactive: false },
      { port: "winner", label: "Winner advances", interactive: false },
      { port: "loser", label: "Loser advances", interactive: false },
    ]);
  });
});
