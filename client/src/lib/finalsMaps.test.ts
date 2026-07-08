import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_COMPETITIVE_MAP_IDS,
  THE_FINALS_MAPS,
  drawUniqueMaps,
} from "./finalsMaps";

describe("default competitive maps", () => {
  it("excludes Seoul and Kyoto from the default competitive pool", () => {
    expect(DEFAULT_COMPETITIVE_MAP_IDS).not.toContain("seoul");
    expect(DEFAULT_COMPETITIVE_MAP_IDS).not.toContain("kyoto");
  });

  it("keeps every other main arena in the default competitive pool", () => {
    const expectedDefaultMapIds = THE_FINALS_MAPS.filter(
      map => map.category === "main" && map.id !== "seoul" && map.id !== "kyoto"
    ).map(map => map.id);

    expect(DEFAULT_COMPETITIVE_MAP_IDS).toEqual(expectedDefaultMapIds);
  });
});

describe("drawUniqueMaps", () => {
  it("draws N unique maps when the pool has at least N maps", () => {
    const result = drawUniqueMaps(THE_FINALS_MAPS, 5);

    expect(result).toHaveLength(5);
    expect(new Set(result.map(map => map.id)).size).toBe(5);
  });

  it("returns an empty result for an empty pool", () => {
    expect(drawUniqueMaps([], 3)).toEqual([]);
  });

  it("caps draw count at the selected pool size", () => {
    const pool = THE_FINALS_MAPS.slice(0, 2);

    expect(drawUniqueMaps(pool, 5)).toHaveLength(2);
  });

  it("uses the Fisher-Yates swap path without duplicating entries", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    const result = drawUniqueMaps(THE_FINALS_MAPS.slice(0, 3), 3);

    expect(result.map(map => map.id)).toEqual([
      "seoul",
      "skyway-stadium",
      "monaco",
    ]);
    vi.restoreAllMocks();
  });
});

describe("default competitive tournament map randomization", () => {
  it("draws from the same default competitive pool used by control-room randomize", () => {
    const [mapId] = drawUniqueMaps(DEFAULT_COMPETITIVE_MAP_IDS, 1);
    expect(DEFAULT_COMPETITIVE_MAP_IDS).toContain(mapId);
    expect(THE_FINALS_MAPS.some(map => map.id === mapId)).toBe(true);
  });
});
