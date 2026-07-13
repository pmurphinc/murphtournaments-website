import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const server = readFileSync("server/tournamentControl.ts", "utf8");
const routes = readFileSync("client/src/App.tsx", "utf8");
const index = readFileSync("client/src/pages/PersonalTcrIndex.tsx", "utf8");
const templates = readFileSync("client/src/pages/TcrTemplates.tsx", "utf8");
const room = readFileSync("client/src/pages/TournamentControlRoom.tsx", "utf8");
const schema = readFileSync("drizzle/schema.ts", "utf8");

describe("personal TCR templates", () => {
  it("lists public templates and current user's templates with lobby counts and creator display data", () => {
    expect(server).toContain("async function listTemplates");
    expect(server).toMatch(
      /tournamentControlTemplates\.visibility\} = 'public'/
    );
    expect(server).toMatch(/createdByUserId\} = \$\{userId\}/);
    expect(server).toContain(
      "lobbyCount: sql<number>`count(${tournamentControlTemplateGames.id})`"
    );
    expect(server).toContain("discordDisplayName: users.discordDisplayName");
  });

  it("enforces public/private use authorization server-side", () => {
    expect(server).toContain("async function getTemplateForUseOrThrow");
    expect(server).toContain(
      'template.visibility !== "public" && template.createdByUserId !== userId'
    );
    expect(server).toContain('code: "NOT_FOUND"');
    expect(server).toContain("const template = await getTemplateForUseOrThrow");
  });

  it("exposes personal mutation procedures for owner-managed templates", () => {
    expect(server).toContain("renameTemplate: personalTcrProcedure");
    expect(server).toContain("setTemplateVisibility: personalTcrProcedure");
    expect(server).toContain("deleteTemplate: personalTcrProcedure");
    expect(server).toContain(
      "saveTemplateFromTournament: personalTcrProcedure"
    );
    expect(server).toContain("visibility: templateVisibilitySchema");
  });

  it("restricts template modification to creator or site admin", () => {
    expect(server).toContain("async function getOwnedTemplateOrThrow");
    expect(server).toContain(
      'user.role !== "admin" && template.createdByUserId !== user.id'
    );
    expect(server).toContain('code: "FORBIDDEN"');
  });

  it("uses existing cascade schema for deleting template children without touching source tournaments", () => {
    expect(schema).toContain(
      'references(() => tournamentControlTemplates.id, { onDelete: "cascade" })'
    );
    expect(schema).toContain(
      'sourceTournamentId: int("sourceTournamentId").references'
    );
    expect(schema).toContain('{ onDelete: "set null" }');
    expect(server).toContain(".delete(tournamentControlTemplates)");
    expect(server).not.toContain("softDelete");
  });

  it("registers static template routes before tournament-id TCR routes", () => {
    expect(routes.indexOf('path={"/TCR/templates"}')).toBeGreaterThan(-1);
    expect(routes.indexOf('path={"/tcr/templates"}')).toBeGreaterThan(-1);
    expect(routes.indexOf('path={"/TCR/templates"}')).toBeLessThan(
      routes.indexOf('path={"/TCR/:tournamentId"}')
    );
    expect(routes.indexOf('path={"/tcr/templates"}')).toBeLessThan(
      routes.indexOf('path={"/tcr/:tournamentId"}')
    );
  });

  it("adds user-facing browse/manage UI and create-from-template dialog", () => {
    expect(index).toContain("<TcrTemplateBrowser compact />");
    expect(index).toContain("Manage Templates");
    expect(templates).toContain("Public Templates");
    expect(templates).toContain("My Templates");
    expect(templates).toContain("Use Template");
    expect(templates).toContain("Delete Template?");
    expect(templates).toContain(
      "navigate(`/TCR/${data.createdTournament.id}`)"
    );
  });

  it("replaces personal save prompt/confirm with a Radix dialog that can save public templates", () => {
    expect(room).not.toContain("window.prompt(");
    expect(room).not.toContain('window.confirm("Make this template public?")');
    expect(room).toContain("open={saveTemplateOpen}");
    expect(room).toMatch(/Public templates can\s+be used by other TCR\s+users/);
    expect(room).toContain("visibility: templateVisibility");
    expect(room).toContain("savePersonalTemplate.mutate(input, options)");
  });
});
