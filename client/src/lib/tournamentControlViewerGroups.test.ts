import { describe, expect, it } from "vitest";
import {
  getViewerGroupDragPositions,
  getViewerGroupStartPositions,
} from "../pages/TournamentControlViewer";

const games = [
  { id: 1, canvasX: 100, canvasY: 120, roundGroupId: "round-1" },
  { id: 2, canvasX: 500, canvasY: 200, roundGroupId: "round-1" },
  { id: 3, canvasX: 900, canvasY: 300, roundGroupId: "round-2" },
];

describe("viewer group movement", () => {
  it("starts from local lobby positions and includes only the selected group", () => {
    const local = new Map([[1, { x: 240, y: 360 }]]);
    const positions = getViewerGroupStartPositions(games, local, "round-1");
    expect([...positions]).toEqual([
      [1, { x: 240, y: 360 }],
      [2, { x: 500, y: 200 }],
    ]);
    expect(local.size).toBe(1);
    expect(games[0].canvasX).toBe(100);
  });

  it.each([0.1, 0.5, 1, 1.5])(
    "moves every group member by the pointer's screen distance at %s zoom",
    zoom => {
      const startPositions = getViewerGroupStartPositions(
        games,
        new Map(),
        "round-1"
      );
      const moved = getViewerGroupDragPositions(
        { clientX: 20, clientY: 30, startPositions },
        { clientX: 120, clientY: 90 },
        zoom
      );
      for (const [id, initial] of startPositions) {
        const position = moved.get(id)!;
        expect(
          Math.abs((position.x - initial.x) * zoom - 100)
        ).toBeLessThanOrEqual(zoom / 2);
        expect(
          Math.abs((position.y - initial.y) * zoom - 60)
        ).toBeLessThanOrEqual(zoom / 2);
      }
      expect(startPositions.get(1)).toEqual({ x: 100, y: 120 });
      expect(moved.has(3)).toBe(false);
    }
  );

  it("stops at the canvas edge without squeezing lobbies together", () => {
    const moved = getViewerGroupDragPositions(
      {
        clientX: 200,
        clientY: 200,
        startPositions: getViewerGroupStartPositions(
          games,
          new Map(),
          "round-1"
        ),
      },
      { clientX: -1000, clientY: -1000 },
      0.5
    );
    expect(moved.get(1)).toEqual({ x: 0, y: 0 });
    expect(moved.get(2)).toEqual({ x: 400, y: 80 });
  });

  it("preserves other local groups when merging movement and survives data refreshes", () => {
    const local = new Map([[3, { x: 1500, y: 500 }]]);
    const moved = getViewerGroupDragPositions(
      {
        clientX: 0,
        clientY: 0,
        startPositions: getViewerGroupStartPositions(games, local, "round-1"),
      },
      { clientX: 100, clientY: 100 },
      1
    );
    const next = new Map([...local, ...moved]);
    expect(next.get(3)).toEqual({ x: 1500, y: 500 });
    expect(
      getViewerGroupStartPositions(
        games.map(game => ({ ...game })),
        next,
        "round-1"
      ).get(1)
    ).toEqual({ x: 200, y: 220 });
  });
});
