import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  buildMapBanLookup,
  formatBannedMapOptionLabel,
  formatMapBanSummary,
  getLobbyMapBans,
  strikeThroughText,
} from "./tcrMapBans";

/** Source assertions have to survive Prettier re-wrapping the JSX. */
const compact = (value: string) => value.replace(/\s+/g, " ");

type Team = { id: number; name: string; mapBanId?: string | null };

const teamsById = (...teams: Team[]) =>
  new Map(teams.map(team => [team.id, team] as const));

describe("getLobbyMapBans", () => {
  it("collects one entry per banned map from the assigned teams", () => {
    const bans = getLobbyMapBans(
      [
        { teamId: 1, slotIndex: 1 },
        { teamId: 2, slotIndex: 2 },
      ],
      teamsById(
        { id: 1, name: "Goo Crew", mapBanId: "monaco" },
        { id: 2, name: "Bank It", mapBanId: "bernal" }
      )
    );
    expect(bans).toEqual([
      { mapId: "monaco", mapName: "Monaco", teamNames: ["Goo Crew"] },
      { mapId: "bernal", mapName: "Bernal", teamNames: ["Bank It"] },
    ]);
  });

  it("merges teams that banned the same map instead of listing it twice", () => {
    const bans = getLobbyMapBans(
      [
        { teamId: 1, slotIndex: 1 },
        { teamId: 2, slotIndex: 2 },
      ],
      teamsById(
        { id: 1, name: "Goo Crew", mapBanId: "monaco" },
        { id: 2, name: "Bank It", mapBanId: "monaco" }
      )
    );
    expect(bans).toHaveLength(1);
    expect(bans[0].teamNames).toEqual(["Goo Crew", "Bank It"]);
  });

  it("orders bans by lobby slot regardless of assignment order", () => {
    const bans = getLobbyMapBans(
      [
        { teamId: 2, slotIndex: 3 },
        { teamId: 1, slotIndex: 1 },
      ],
      teamsById(
        { id: 1, name: "Goo Crew", mapBanId: "monaco" },
        { id: 2, name: "Bank It", mapBanId: "bernal" }
      )
    );
    expect(bans.map(ban => ban.mapId)).toEqual(["monaco", "bernal"]);
  });

  it("ignores teams with no ban and assignments with no matching team", () => {
    expect(
      getLobbyMapBans(
        [
          { teamId: 1, slotIndex: 1 },
          { teamId: 2, slotIndex: 2 },
          { teamId: 99, slotIndex: 3 },
        ],
        teamsById(
          { id: 1, name: "Goo Crew", mapBanId: null },
          { id: 2, name: "Bank It" }
        )
      )
    ).toEqual([]);
  });

  it("falls back to the raw id for a map that is no longer in the pool", () => {
    const bans = getLobbyMapBans(
      [{ teamId: 1, slotIndex: 1 }],
      teamsById({ id: 1, name: "Goo Crew", mapBanId: "retired-map" })
    );
    expect(bans[0]).toMatchObject({
      mapId: "retired-map",
      mapName: "retired-map",
    });
  });
});

describe("map ban labels", () => {
  it("strikes every character so native select options render the ban", () => {
    expect(strikeThroughText("Monaco")).toBe("M̶o̶n̶a̶c̶o̶");
    expect(strikeThroughText("")).toBe("");
  });

  it("names the banning teams in the option label", () => {
    expect(
      formatBannedMapOptionLabel("Monaco", {
        mapId: "monaco",
        mapName: "Monaco",
        teamNames: ["Goo Crew", "Bank It"],
      })
    ).toBe("M̶o̶n̶a̶c̶o̶ — banned by Goo Crew, Bank It");
  });

  it("summarizes every ban for the lobby tooltip", () => {
    expect(
      formatMapBanSummary([
        { mapId: "monaco", mapName: "Monaco", teamNames: ["Goo Crew"] },
        { mapId: "bernal", mapName: "Bernal", teamNames: ["Bank It"] },
      ])
    ).toBe("Monaco (Goo Crew) · Bernal (Bank It)");
  });

  it("looks bans up by map id", () => {
    const lookup = buildMapBanLookup([
      { mapId: "monaco", mapName: "Monaco", teamNames: ["Goo Crew"] },
    ]);
    expect(lookup.get("monaco")?.teamNames).toEqual(["Goo Crew"]);
    expect(lookup.get("bernal")).toBeUndefined();
  });
});

describe("Map bans live on Team Management, not Team Finder", () => {
  const teamManagementSource = readFileSync(
    "client/src/pages/TeamManagement.tsx",
    "utf8"
  );
  const teamFinderSource = readFileSync(
    "client/src/pages/TeamFinder.tsx",
    "utf8"
  );

  it("renders a captain-editable map ban selector on /teams", () => {
    expect(teamManagementSource).toContain("function MapBan(");
    expect(teamManagementSource).toContain(
      "trpc.teamManagement.updateMapBan.useMutation"
    );
    expect(teamManagementSource).toContain(
      "updateMapBan.mutate({ teamId: team.id, mapBanId })"
    );
    expect(teamManagementSource).toContain(
      "Only the captain can change the team map ban."
    );
  });

  it("leaves no map ban surface on the Team Finder board", () => {
    expect(teamFinderSource).not.toContain("updateMapBan");
    expect(teamFinderSource).not.toContain("No Map Ban");
    expect(teamFinderSource).not.toMatch(/map ban/i);
    expect(teamFinderSource).not.toContain("finalsMaps");
  });
});

describe("TCR map selectors surface team bans", () => {
  const inspectorSource = readFileSync(
    "client/src/components/tcr/TcrInspector.tsx",
    "utf8"
  );
  const lobbyNodeSource = readFileSync(
    "client/src/components/tcr/TcrLobbyNode.tsx",
    "utf8"
  );

  it("strikes banned maps in both the inspector and the canvas lobby card", () => {
    for (const source of [inspectorSource, lobbyNodeSource]) {
      expect(compact(source)).toContain("getLobbyMapBans(assignments");
      expect(compact(source)).toContain(
        "ban ? formatBannedMapOptionLabel(map.name, ban) : map.name"
      );
      expect(source).toContain("line-through");
    }
  });

  it("warns when a lobby is already set to a banned map", () => {
    for (const source of [inspectorSource, lobbyNodeSource]) {
      expect(compact(source)).toContain(
        "const selectedMapBan = game.mapId ? mapBansById.get(game.mapId) : undefined;"
      );
    }
  });
});

describe("Tournament rosters log the map ban on entry", () => {
  const schemaSource = readFileSync("drizzle/schema.ts", "utf8");
  const migrationSql = readFileSync(
    "drizzle/0031_add_tournament_team_map_ban.sql",
    "utf8"
  );
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8")
  );
  const controlSource = readFileSync("server/tournamentControl.ts", "utf8");

  it("adds a nullable teams.mapBanId column without destructive statements", () => {
    expect(migrationSql.trim()).toBe(
      "ALTER TABLE `teams` ADD `mapBanId` varchar(64);"
    );
    expect(migrationSql).not.toMatch(/\bDROP\b|\bDELETE\b|\bUPDATE\b/i);
    expect(schemaSource).toContain(
      'mapBanId: varchar("mapBanId", { length: 64 })'
    );
  });

  it("registers migration 0031 in the drizzle journal exactly once", () => {
    const entries = journal.entries.filter(
      (entry: { tag: string }) =>
        entry.tag === "0031_add_tournament_team_map_ban"
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].idx).toBe(31);
  });

  it("snapshots the captain's ban when an approved team joins the tournament", () => {
    expect(controlSource).toContain("mapBanId: row.managedTeam.mapBanId");
  });

  it("reads bans from the roster snapshot with a managed-team fallback", () => {
    expect(
      controlSource.match(
        /COALESCE\(\$\{teams\.mapBanId\}, \$\{managedTeams\.mapBanId\}\)/g
      ) ?? []
    ).toHaveLength(2);
  });

  it("keeps the randomizer from drawing a banned map", () => {
    expect(controlSource).toContain(
      "No eligible maps remain after assigned team map bans."
    );
    expect(controlSource).toContain(
      "const eligibleMapIds = await getEligibleMapIdsForGameRandomization("
    );
  });
});
