import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("Tournament Control Room improvements", () => {
  it("persists final-round seriesBestOf while rejecting BO3/BO5 for cashout in server code", async () => {
    const schema = await readFile(new URL("../../../drizzle/schema.ts", import.meta.url), "utf8");
    const server = await readFile(new URL("../../../server/tournamentControl.ts", import.meta.url), "utf8");
    expect(schema).toContain('seriesBestOf: int("seriesBestOf").default(1).notNull()');
    expect(server).toContain('z.union([z.literal(1), z.literal(3), z.literal(5)])');
    expect(server).toContain('Cashout lobbies cannot use BO3 or BO5');
    expect(server).toContain('setFinalRoundSeriesBestOf');
  });

  it("adds templates without storing private lobby codes or assigned teams", async () => {
    const schema = await readFile(new URL("../../../drizzle/schema.ts", import.meta.url), "utf8");
    const server = await readFile(new URL("../../../server/tournamentControl.ts", import.meta.url), "utf8");
    expect(schema).toContain("tournament_control_templates");
    expect(schema).toContain('visibility: mysqlEnum("visibility", ["private", "public"])');
    expect(schema).toContain("tournament_control_template_games");
    expect(schema).toContain("tournament_control_template_connections");
    const templateSection = schema.slice(schema.indexOf("tournamentControlTemplates"), schema.indexOf("tournamentViewerLinks"));
    expect(templateSection).not.toContain("privateLobbyCode");
    expect(server).toContain("createTournamentFromTemplate");
  });

  it("viewer query returns sanitized fields only", async () => {
    const server = await readFile(new URL("../../../server/tournamentControl.ts", import.meta.url), "utf8");
    const viewerStart = server.indexOf("async function getViewerDataByToken");
    const viewerEnd = server.indexOf("async function saveTemplateFromTournament");
    const viewerCode = server.slice(viewerStart, viewerEnd);
    expect(viewerCode).toContain("teams: data.teams.map(team => ({ id: team.id, name: team.name, frp: team.frp }))");
    expect(viewerCode).toContain("seriesBestOf");
    expect(viewerCode).not.toContain("privateLobbyCode");
    expect(viewerCode).not.toContain("captainDiscordId");
    expect(viewerCode).not.toContain("captainUserId");
  });

  it("manual team claim links are token-hashed, single-use, expiring, and create managed ownership", async () => {
    const schema = await readFile(new URL("../../../drizzle/schema.ts", import.meta.url), "utf8");
    const server = await readFile(new URL("../../../server/tournamentControl.ts", import.meta.url), "utf8");
    expect(schema).toContain("tournament_team_claim_links");
    expect(schema).toContain('status: mysqlEnum("status", ["active", "claimed", "revoked"])');
    expect(schema).toContain('uniqueIndex("tournament_team_claim_links_tokenHash_unique")');
    expect(server).toContain("This team is already managed.");
    expect(server).toContain("This claim link has already been used.");
    expect(server).toContain("This claim link has expired.");
    expect(server).toContain("This claim link has been revoked.");
    expect(server).toContain("await tx.insert(managedTeams).values");
    expect(server).toContain("await tx.insert(managedTeamMembers).values");
    expect(server).toContain("managedTeamId: managedTeam.id");
  });
});
