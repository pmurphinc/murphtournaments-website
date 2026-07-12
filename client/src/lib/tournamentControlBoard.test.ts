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

  it("selects group members, replaces selection, and preserves outsiders", async () => {
    const mod = await import("./tournamentControlBoard");
    const games = [
      { id: 1, roundGroupId: "alpha" },
      { id: 2, roundGroupId: "alpha" },
      { id: 3, roundGroupId: "bravo" },
      { id: 4, roundGroupId: null },
    ];

    const alphaIds = mod.getRoundGroupGameIds(games, "alpha");
    const bravoIds = mod.getRoundGroupGameIds(games, "bravo");
    expect(alphaIds).toEqual([1, 2]);

    const alphaSelection = mod.getNextRoundGroupSelection(
      new Set([4]),
      alphaIds,
      false
    );
    expect(Array.from(alphaSelection).sort()).toEqual([1, 2]);
    expect(alphaSelection.has(4)).toBe(false);
    expect(mod.isRoundGroupSelected(alphaSelection, alphaIds)).toBe(true);
    expect(mod.isRoundGroupSelected(alphaSelection, bravoIds)).toBe(false);

    const additiveSelection = mod.getNextRoundGroupSelection(
      alphaSelection,
      bravoIds,
      true
    );
    expect(Array.from(additiveSelection).sort()).toEqual([1, 2, 3]);

    const replacedSelection = mod.getNextRoundGroupSelection(
      additiveSelection,
      bravoIds,
      false
    );
    expect(Array.from(replacedSelection)).toEqual([3]);
  });

  it("toggles an already-selected group during additive group selection", async () => {
    const mod = await import("./tournamentControlBoard");
    const next = mod.getNextRoundGroupSelection(
      new Set([1, 2, 9]),
      [1, 2],
      true
    );
    expect(Array.from(next)).toEqual([9]);
  });
});

describe("group header pointer lifecycle helpers", () => {
  it("uses release coordinates for final member positions only", async () => {
    const mod = await import("./tournamentControlBoard");
    const finalPositions = mod.getGroupDragPositionsFromStart(
      {
        clientX: 10,
        clientY: 20,
        startPositions: new Map([
          [1, { x: 100, y: 100 }],
          [2, { x: 240, y: 160 }],
        ]),
      },
      { clientX: 70, clientY: 5 },
      0.5
    );

    expect(Array.from(finalPositions.keys())).toEqual([1, 2]);
    expect(finalPositions.get(1)).toEqual({ x: 220, y: 70 });
    expect(finalPositions.get(2)).toEqual({ x: 360, y: 130 });
  });

  it("does not move until the drag threshold is exceeded", async () => {
    const mod = await import("./tournamentControlBoard");
    expect(
      mod.hasPointerExceededDragThreshold(
        { clientX: 100, clientY: 100 },
        { clientX: 101, clientY: 101 }
      )
    ).toBe(false);
    expect(
      mod.hasPointerExceededDragThreshold(
        { clientX: 100, clientY: 100 },
        { clientX: 112, clientY: 100 }
      )
    ).toBe(true);
  });
});

describe("measured connector geometry", () => {
  it("translates a measured connector center by the lobby visual movement delta", async () => {
    const mod = await import("./tournamentControlBoard");
    expect(
      mod.getTranslatedMeasuredPortCenter(
        {
          center: { x: 160, y: 240 },
          measuredNodePosition: { x: 100, y: 200 },
        },
        { x: 135, y: 150 }
      )
    ).toEqual({ x: 195, y: 190 });
  });

  it("moves only the source endpoint when only the source lobby moves", async () => {
    const mod = await import("./tournamentControlBoard");
    const source = {
      center: { x: 200, y: 300 },
      measuredNodePosition: { x: 100, y: 100 },
    };
    const target = {
      center: { x: 500, y: 120 },
      measuredNodePosition: { x: 420, y: 80 },
    };
    expect(
      mod.getTranslatedMeasuredPortCenter(source, { x: 140, y: 125 })
    ).toEqual({ x: 240, y: 325 });
    expect(
      mod.getTranslatedMeasuredPortCenter(target, { x: 420, y: 80 })
    ).toEqual({ x: 500, y: 120 });
  });

  it("moves only the target endpoint when only the target lobby moves", async () => {
    const mod = await import("./tournamentControlBoard");
    const source = {
      center: { x: 200, y: 300 },
      measuredNodePosition: { x: 100, y: 100 },
    };
    const target = {
      center: { x: 500, y: 120 },
      measuredNodePosition: { x: 420, y: 80 },
    };
    expect(
      mod.getTranslatedMeasuredPortCenter(source, { x: 100, y: 100 })
    ).toEqual({ x: 200, y: 300 });
    expect(
      mod.getTranslatedMeasuredPortCenter(target, { x: 380, y: 140 })
    ).toEqual({ x: 460, y: 180 });
  });

  it("translates both endpoints by the same group movement delta", async () => {
    const mod = await import("./tournamentControlBoard");
    const delta = { x: 70, y: -30 };
    const source = {
      center: { x: 200, y: 300 },
      measuredNodePosition: { x: 100, y: 100 },
    };
    const target = {
      center: { x: 500, y: 120 },
      measuredNodePosition: { x: 420, y: 80 },
    };
    expect(
      mod.getTranslatedMeasuredPortCenter(source, {
        x: 100 + delta.x,
        y: 100 + delta.y,
      })
    ).toEqual({ x: 270, y: 270 });
    expect(
      mod.getTranslatedMeasuredPortCenter(target, {
        x: 420 + delta.x,
        y: 80 + delta.y,
      })
    ).toEqual({ x: 570, y: 90 });
  });

  it("keeps measured connector translation in logical canvas coordinates without zoom scaling", async () => {
    const mod = await import("./tournamentControlBoard");
    expect(
      mod.getTranslatedMeasuredPortCenter(
        { center: { x: 100, y: 100 }, measuredNodePosition: { x: 40, y: 40 } },
        { x: 50, y: 55 }
      )
    ).toEqual({ x: 110, y: 115 });
  });

  it("uses optimistic group movement positions before persistence completes", async () => {
    const mod = await import("./tournamentControlBoard");
    const optimistic = mod.applyGroupMovementDelta(
      [
        { id: 1, canvasX: 100, canvasY: 100, roundGroupId: "g" },
        { id: 2, canvasX: 500, canvasY: 120, roundGroupId: "other" },
      ],
      "g",
      { x: 80, y: 40 }
    );
    const source = {
      center: { x: 260, y: 538 },
      measuredNodePosition: { x: 100, y: 100 },
    };
    const target = {
      center: { x: 660, y: 120 },
      measuredNodePosition: { x: 500, y: 120 },
    };
    expect(
      mod.getTranslatedMeasuredPortCenter(
        source,
        optimistic.get(1) ?? { x: 100, y: 100 }
      )
    ).toEqual({ x: 340, y: 578 });
    expect(
      mod.getTranslatedMeasuredPortCenter(target, { x: 500, y: 120 })
    ).toEqual({ x: 660, y: 120 });
  });
});

describe("zoom preference helpers", () => {
  it("restores valid zoom, defaults missing and invalid values, and clamps bounds", async () => {
    const mod = await import("./tournamentControlBoard");
    expect(mod.getInitialZoomPreference(1.25)).toBe(1.25);
    expect(mod.getInitialZoomPreference(undefined)).toBe(mod.defaultZoom);
    expect(mod.getInitialZoomPreference("1.25")).toBe(mod.defaultZoom);
    expect(mod.getInitialZoomPreference({ zoom: 1.25 })).toBe(mod.defaultZoom);
    expect(mod.getInitialZoomPreference(Number.NaN)).toBe(mod.defaultZoom);
    expect(mod.getInitialZoomPreference(Number.POSITIVE_INFINITY)).toBe(
      mod.defaultZoom
    );
    expect(mod.getInitialZoomPreference(null)).toBe(mod.defaultZoom);
    expect(mod.getInitialZoomPreference(mod.minZoom - 1)).toBe(mod.minZoom);
    expect(mod.getInitialZoomPreference(mod.maxZoom + 1)).toBe(mod.maxZoom);
  });
});
