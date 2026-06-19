import { describe, expect, it, vi } from "vitest";
import { THE_FINALS_MAPS, drawUniqueMaps } from "./finalsMaps";

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
