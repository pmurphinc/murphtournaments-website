import { describe, expect, it } from "vitest";
import {
  getRoundFrameBounds,
  getRoundFrames,
  getRoundFrameTheme,
  roundFrameThemes,
} from "./tournamentControlBoard";

describe("round frame geometry", () => {
  it("calculates padded bounds using minimized and measured heights", () => {
    const games = [
      {
        id: 1,
        gameType: "cashout" as const,
        canvasX: 100,
        canvasY: 120,
        roundGroupId: "r1",
        roundLabel: "Round 1",
      },
      {
        id: 2,
        gameType: "final_round" as const,
        canvasX: 500,
        canvasY: 240,
        roundGroupId: "r1",
        roundLabel: "Round 1",
      },
    ];
    expect(
      getRoundFrameBounds(
        games,
        new Set([2]),
        new Map(),
        new Map([[1, 600]]),
        20
      )
    ).toEqual({
      x: 80,
      y: 100,
      width: 760,
      height: 640,
    });
  });

  it("assigns deterministic distinct themes to visible round frames", () => {
    const frames = getRoundFrames(
      [
        {
          id: 1,
          gameType: "cashout",
          canvasX: 0,
          canvasY: 0,
          roundGroupId: "alpha",
          roundLabel: "Alpha",
        },
        {
          id: 2,
          gameType: "cashout",
          canvasX: 500,
          canvasY: 0,
          roundGroupId: "bravo",
          roundLabel: "Bravo",
        },
      ],
      new Set()
    );

    expect(frames.map(frame => frame.theme)).toEqual([
      getRoundFrameTheme(0),
      getRoundFrameTheme(1),
    ]);
    expect(frames[0]?.theme).not.toEqual(frames[1]?.theme);
    expect(getRoundFrameTheme(Object.keys(roundFrameThemes).length)).toEqual(
      getRoundFrameTheme(0)
    );
  });

  it("updates frame bounds when visual positions move", () => {
    const frames = getRoundFrames(
      [
        {
          id: 1,
          gameType: "cashout",
          canvasX: 0,
          canvasY: 0,
          roundGroupId: "r",
          roundLabel: "Semis",
        },
        {
          id: 2,
          gameType: "cashout",
          canvasX: 400,
          canvasY: 0,
          roundGroupId: "r",
          roundLabel: "Semis",
        },
      ],
      new Set(),
      new Map([[2, { x: 800, y: 100 }]])
    );
    expect(frames[0]).toMatchObject({
      groupId: "r",
      label: "Semis",
      x: -36,
      y: -36,
      width: 1192,
    });
  });
});

describe("group frame helpers", () => {
  it("applies one movement delta only to group members", async () => {
    const mod = await import("./tournamentControlBoard");
    const positions = mod.applyGroupMovementDelta(
      [
        { id: 1, canvasX: 100, canvasY: 100, roundGroupId: "g" },
        { id: 2, canvasX: 220, canvasY: 160, roundGroupId: "g" },
        { id: 3, canvasX: 900, canvasY: 900, roundGroupId: "other" },
      ],
      "g",
      { x: 40, y: -20 }
    );
    expect(positions.get(1)).toEqual({ x: 140, y: 80 });
    expect(positions.get(2)).toEqual({ x: 260, y: 140 });
    expect(positions.has(3)).toBe(false);
    expect((positions.get(2)?.x ?? 0) - (positions.get(1)?.x ?? 0)).toBe(120);
  });

  it("converts pointer movement to zoom-aware canvas deltas", async () => {
    const mod = await import("./tournamentControlBoard");
    expect(
      mod.getCanvasDeltaFromPointerDelta(
        { clientX: 100, clientY: 100 },
        { clientX: 160, clientY: 70 },
        0.5
      )
    ).toEqual({ x: 120, y: -60 });
  });

  it("organizes selected group lobbies deterministically without moving outsiders", async () => {
    const mod = await import("./tournamentControlBoard");
    const positions = mod.organizeGroupLobbyPositions(
      [
        { id: 3, canvasX: 500, canvasY: 500, roundGroupId: "g" },
        { id: 1, canvasX: 100, canvasY: 100, roundGroupId: "g" },
        { id: 2, canvasX: 300, canvasY: 100, roundGroupId: "g" },
        { id: 4, canvasX: 0, canvasY: 0, roundGroupId: "other" },
      ],
      "g",
      { cardWidth: 100, cardHeight: 80, gap: 10, padding: 20, maxColumns: 2 }
    );
    expect(Array.from(positions.keys())).toEqual([1, 2, 3]);
    expect(positions.has(4)).toBe(false);
    expect(
      new Set(Array.from(positions.values()).map(p => `${p.x}:${p.y}`)).size
    ).toBe(3);
  });
});
