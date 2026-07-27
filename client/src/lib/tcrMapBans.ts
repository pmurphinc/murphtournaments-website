import { THE_FINALS_MAPS } from "@/lib/finalsMaps";

/**
 * Map bans a lobby has to respect, derived from the teams assigned to it.
 *
 * The ban itself is logged on the tournament roster row when a managed team
 * enters the tournament, so it stays stable for the life of the event even if
 * the captain changes their ban afterwards.
 */
export type LobbyMapBan = {
  mapId: string;
  mapName: string;
  /** Every assigned team that banned this map, in assignment order. */
  teamNames: string[];
};

type MapBanTeam = { id: number; name: string; mapBanId?: string | null };
type MapBanAssignment = { teamId: number; slotIndex?: number };

const mapNamesById: ReadonlyMap<string, string> = new Map(
  THE_FINALS_MAPS.map(map => [map.id, map.name])
);

/** U+0336 renders a line through the preceding character in plain text. */
const COMBINING_LONG_STROKE_OVERLAY = "̶";

/**
 * Native `<option>` elements ignore `text-decoration` in most browsers, so the
 * strike has to live in the text itself for the ban to actually be visible.
 */
export function strikeThroughText(value: string) {
  return Array.from(value)
    .map(character => `${character}${COMBINING_LONG_STROKE_OVERLAY}`)
    .join("");
}

export function getLobbyMapBans(
  assignments: readonly MapBanAssignment[],
  teamsById: ReadonlyMap<number, MapBanTeam>
): LobbyMapBan[] {
  const bans = new Map<string, LobbyMapBan>();
  const ordered = [...assignments].sort(
    (a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0)
  );
  for (const assignment of ordered) {
    const team = teamsById.get(assignment.teamId);
    const mapId = team?.mapBanId;
    if (!team || !mapId) continue;
    const existing = bans.get(mapId);
    if (existing) {
      if (!existing.teamNames.includes(team.name))
        existing.teamNames.push(team.name);
      continue;
    }
    bans.set(mapId, {
      mapId,
      mapName: mapNamesById.get(mapId) ?? mapId,
      teamNames: [team.name],
    });
  }
  return Array.from(bans.values());
}

export function buildMapBanLookup(bans: readonly LobbyMapBan[]) {
  return new Map(bans.map(ban => [ban.mapId, ban] as const));
}

/** Label used for a banned map inside a `<select>`. */
export function formatBannedMapOptionLabel(mapName: string, ban: LobbyMapBan) {
  return `${strikeThroughText(mapName)} — banned by ${ban.teamNames.join(", ")}`;
}

export function formatMapBanSummary(bans: readonly LobbyMapBan[]) {
  return bans
    .map(ban => `${ban.mapName} (${ban.teamNames.join(", ")})`)
    .join(" · ");
}
