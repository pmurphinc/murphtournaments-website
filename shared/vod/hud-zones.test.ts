import { describe, expect, it } from "vitest";
import { getVodHudZonePreset, type VodHudZonePresetId } from "./hud-zones";

const CENTER_EVENT_TEXT_RECT = {
  x: 0.28,
  y: 0.42,
  width: 0.44,
  height: 0.24,
};

function getZone(presetId: VodHudZonePresetId, zoneId: string) {
  const zone = getVodHudZonePreset(presetId).zones.find(
    candidate => candidate.id === zoneId
  );

  if (!zone) {
    throw new Error(`${presetId} preset is missing ${zoneId}.`);
  }

  return zone;
}

describe("VOD HUD zone presets", () => {
  it.each(["player", "spectator"] as const)(
    "keeps every %s zone inside normalized frame bounds",
    presetId => {
      for (const zone of getVodHudZonePreset(presetId).zones) {
        expect(zone.rect.x).toBeGreaterThanOrEqual(0);
        expect(zone.rect.y).toBeGreaterThanOrEqual(0);
        expect(zone.rect.width).toBeGreaterThan(0);
        expect(zone.rect.height).toBeGreaterThan(0);
        expect(zone.rect.x + zone.rect.width).toBeLessThanOrEqual(1);
        expect(zone.rect.y + zone.rect.height).toBeLessThanOrEqual(1);
      }
    }
  );

  it.each(["player", "spectator"] as const)(
    "anchors the %s kill feed near the top-right corner",
    presetId => {
      const killFeed = getZone(presetId, "kill_feed");

      expect(killFeed.rect.x).toBeGreaterThanOrEqual(0.7);
      expect(killFeed.rect.y).toBeLessThanOrEqual(0.02);
      expect(killFeed.rect.x + killFeed.rect.width).toBeGreaterThanOrEqual(
        0.98
      );
      expect(killFeed.rect.height).toBeGreaterThanOrEqual(0.33);
    }
  );

  it.each(["player", "spectator"] as const)(
    "keeps the %s scoreboard tall enough for visible team rows",
    presetId => {
      expect(
        getZone(presetId, "scoreboard").rect.height
      ).toBeGreaterThanOrEqual(0.24);
    }
  );

  it("keeps the player POV team HUD high enough and tightly scoped", () => {
    const playerTeamHud = getZone("player", "player_team_hud");

    expect(playerTeamHud.rect.y).toBeLessThanOrEqual(0.58);
    expect(playerTeamHud.rect.width).toBeLessThanOrEqual(0.3);
    expect(playerTeamHud.rect.height).toBeGreaterThanOrEqual(0.38);
    expect(
      playerTeamHud.rect.y + playerTeamHud.rect.height
    ).toBeLessThanOrEqual(1);
  });

  it("keeps the spectator POV team HUD high enough and tightly scoped", () => {
    const playerTeamHud = getZone("spectator", "player_team_hud");

    expect(playerTeamHud.rect.y).toBeLessThanOrEqual(0.57);
    expect(playerTeamHud.rect.width).toBeLessThanOrEqual(0.3);
    expect(playerTeamHud.rect.height).toBeGreaterThanOrEqual(0.38);
    expect(
      playerTeamHud.rect.y + playerTeamHud.rect.height
    ).toBeLessThanOrEqual(1);
  });

  it.each(["player", "spectator"] as const)(
    "leaves the %s center event text crop unchanged",
    presetId => {
      expect(getZone(presetId, "center_event_text").rect).toEqual(
        CENTER_EVENT_TEXT_RECT
      );
    }
  );
});
