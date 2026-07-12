import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPETITIVE_MAP_IDS,
  DEFAULT_COMPETITIVE_EXCLUDED_MAP_IDS,
  THE_FINALS_MAPS,
} from "./finalsMaps";
import {
  storedMapIdSchema,
  userSelectedMapIdSchema,
} from "../../../server/tournamentControl";

describe("TCR map validation", () => {
  it("accepts normal user-selected maps only from the competitive pool or null", () => {
    for (const mapId of DEFAULT_COMPETITIVE_MAP_IDS) {
      expect(userSelectedMapIdSchema.safeParse(mapId).success).toBe(true);
    }
    expect(userSelectedMapIdSchema.safeParse(null).success).toBe(true);

    for (const mapId of DEFAULT_COMPETITIVE_EXCLUDED_MAP_IDS) {
      expect(userSelectedMapIdSchema.safeParse(mapId).success).toBe(false);
    }
    expect(userSelectedMapIdSchema.safeParse("practice-range").success).toBe(
      false
    );
    expect(userSelectedMapIdSchema.safeParse("not-a-map").success).toBe(false);
  });

  it("accepts legacy stored and snapshot maps from the complete Finals map list", () => {
    for (const map of THE_FINALS_MAPS) {
      expect(storedMapIdSchema.safeParse(map.id).success).toBe(true);
    }
    expect(storedMapIdSchema.safeParse(null).success).toBe(true);
    expect(storedMapIdSchema.safeParse("not-a-map").success).toBe(false);
  });

  it("keeps excluded historical maps out of the competitive selector pool", () => {
    expect(DEFAULT_COMPETITIVE_MAP_IDS).not.toEqual(
      expect.arrayContaining([...DEFAULT_COMPETITIVE_EXCLUDED_MAP_IDS])
    );
    expect(
      THE_FINALS_MAPS.filter(map =>
        DEFAULT_COMPETITIVE_MAP_IDS.includes(map.id)
      ).map(map => map.id)
    ).toEqual(DEFAULT_COMPETITIVE_MAP_IDS);
  });
});
