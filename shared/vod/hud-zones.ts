export const VOD_HUD_ZONE_IDS = [
  "scoreboard",
  "objective_hud",
  "kill_feed",
  "player_team_hud",
  "center_event_text",
] as const;

export type VodHudZoneId = (typeof VOD_HUD_ZONE_IDS)[number];
export type VodHudZonePresetId = "player" | "spectator";

export type VodHudZoneRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VodHudZone = {
  id: VodHudZoneId;
  label: string;
  purpose: string;
  rect: VodHudZoneRect;
};

export type VodHudZonePreset = {
  id: VodHudZonePresetId;
  label: string;
  zones: VodHudZone[];
};

const VOD_HUD_ZONE_LABELS: Record<VodHudZoneId, string> = {
  scoreboard: "Scoreboard",
  objective_hud: "Objective HUD",
  kill_feed: "Kill Feed",
  player_team_hud: "Player Team HUD",
  center_event_text: "Center Event Text",
};

const PLAYER_HUD_ZONES = [
  {
    id: "scoreboard",
    purpose: "Upper-left team score and round-state readout candidates.",
    rect: { x: 0.02, y: 0.03, width: 0.28, height: 0.18 },
  },
  {
    id: "objective_hud",
    purpose:
      "Upper-center objective, cashout, timer, and station-state readouts.",
    rect: { x: 0.34, y: 0.02, width: 0.32, height: 0.16 },
  },
  {
    id: "kill_feed",
    purpose: "Upper-right elimination feed and player action announcements.",
    rect: { x: 0.69, y: 0.04, width: 0.29, height: 0.28 },
  },
  {
    id: "player_team_hud",
    purpose:
      "Lower-left player squad status, teammate, health, and revive indicators.",
    rect: { x: 0.02, y: 0.69, width: 0.34, height: 0.27 },
  },
  {
    id: "center_event_text",
    purpose:
      "Center and lower-center event banners for steals, cashouts, wipes, and spawns.",
    rect: { x: 0.28, y: 0.42, width: 0.44, height: 0.24 },
  },
] satisfies Array<Omit<VodHudZone, "label">>;

const SPECTATOR_HUD_ZONES = [
  {
    id: "scoreboard",
    purpose:
      "Spectator upper-left scoreboard and team state readout candidates.",
    rect: { x: 0.02, y: 0.03, width: 0.3, height: 0.18 },
  },
  {
    id: "objective_hud",
    purpose:
      "Spectator upper-center objective, timer, and cashout status readouts.",
    rect: { x: 0.33, y: 0.02, width: 0.34, height: 0.16 },
  },
  {
    id: "kill_feed",
    purpose: "Spectator upper-right elimination feed and action announcements.",
    rect: { x: 0.68, y: 0.04, width: 0.3, height: 0.28 },
  },
  {
    id: "player_team_hud",
    purpose: "Spectator lower-left player/team roster and status readouts.",
    rect: { x: 0.02, y: 0.68, width: 0.34, height: 0.28 },
  },
  {
    id: "center_event_text",
    purpose: "Spectator center and lower-center event banner candidates.",
    rect: { x: 0.28, y: 0.42, width: 0.44, height: 0.24 },
  },
] satisfies Array<Omit<VodHudZone, "label">>;

function withLabels(zones: Array<Omit<VodHudZone, "label">>): VodHudZone[] {
  return zones.map(zone => ({
    ...zone,
    label: VOD_HUD_ZONE_LABELS[zone.id],
  }));
}

export const VOD_HUD_ZONE_PRESETS: Record<
  VodHudZonePresetId,
  VodHudZonePreset
> = {
  player: {
    id: "player",
    label: "Player POV",
    zones: withLabels(PLAYER_HUD_ZONES),
  },
  spectator: {
    id: "spectator",
    label: "Spectator POV",
    zones: withLabels(SPECTATOR_HUD_ZONES),
  },
};

export function getVodHudZonePreset(
  videoPov: VodHudZonePresetId
): VodHudZonePreset {
  return VOD_HUD_ZONE_PRESETS[videoPov];
}

export function formatVodHudZoneLabel(zoneId: VodHudZoneId): string {
  return VOD_HUD_ZONE_LABELS[zoneId];
}
