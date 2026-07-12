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
    expect(getRoundFrameTheme(roundFrameThemes.length)).toEqual(
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
