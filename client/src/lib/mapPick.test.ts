import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("managed team Map Pick", () => {
  const service = readFileSync(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8");
  const router = readFileSync(new URL("../../../server/teamManagementRouter.ts", import.meta.url), "utf8");
  const page = readFileSync(new URL("../pages/TeamManagement.tsx", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../../../drizzle/schema.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../../../drizzle/0034_add_managed_team_map_pick.sql", import.meta.url), "utf8");

  it("uses captain authorization for pick updates and member read access", () => {
    expect(service).toContain("export async function updateManagedTeamMapPick");
    expect(service).toContain("await assertCaptain(db, teamId, userId)");
    expect(page).toContain("team.mapPickId");
    expect(page).toContain("isCaptain={isCaptain}");
  });

  it("accepts competitive maps and null clearing, but rejects arbitrary IDs and ban conflicts", () => {
    expect(service).toContain("DEFAULT_COMPETITIVE_MAP_IDS as readonly string[]");
    expect(service).toContain("Map Pick and Map Ban must be different maps.");
    expect(service).toContain("return { success: true, mapPickId }");
    expect(router).toContain("updateMapPick: discordProcedure");
    expect(router).toContain("mapPickId: z.string().trim().min(1).max(64).nullable()");
  });

  it("persists the nullable field in the forward migration", () => {
    expect(schema).toContain('mapPickId: varchar("mapPickId", { length: 64 })');
    expect(migration.trim()).toBe("ALTER TABLE `managed_teams` ADD `mapPickId` varchar(64);");
  });
});
