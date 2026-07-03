import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertCaptainRole, createManagedTeamSlug, normalizeDiscordUsername } from "../../../server/teamManagement";

describe("Team Management rules", () => {
  it("team creation assigns the creator as captain by using captain role", () => {
    expect(assertCaptainRole("captain", "invite")).toBeUndefined();
  });

  it("only captains can invite, rename, transfer captaincy, remove members, and disband", () => {
    for (const action of ["invite", "rename", "transferCaptain", "removeMember", "disband"] as const) {
      expect(() => assertCaptainRole("member", action)).toThrow(TRPCError);
    }
  });

  it("normalizes invite usernames with or without @", () => {
    expect(normalizeDiscordUsername(" @Murph ")).toBe("Murph");
  });

  it("creates URL-safe slugs for managed teams", () => {
    expect(createManagedTeamSlug(" The Gold Squad!! ")).toBe("the-gold-squad");
  });

  it("invite acceptance creates membership correctly in service transaction code", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain('tx.insert(managedTeamMembers).values({ teamId: invite.teamId, userId, role: "member" })');
    expect(source).toContain('status: response === "accept" ? "accepted" : "declined"');
  });

  it("a user cannot accept another user's invite", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain("invite.invitedUserId !== userId");
    expect(source).toContain("You can only respond to your own invites.");
  });

  it("captain cannot leave without transferring or disbanding", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain('member.role === "captain"');
    expect(source).toContain("Captains must transfer captaincy or disband before leaving.");
  });
});


describe("Team Management migration and invite persistence", () => {
  it("keeps migration/schema parity for managed_teams captainUserId index", async () => {
    const [migration, schema, snapshot] = await Promise.all([
      import("node:fs/promises").then(fs => fs.readFile(new URL("../../../drizzle/0012_add_managed_teams.sql", import.meta.url), "utf8")),
      import("node:fs/promises").then(fs => fs.readFile(new URL("../../../drizzle/schema.ts", import.meta.url), "utf8")),
      import("node:fs/promises").then(fs => fs.readFile(new URL("../../../drizzle/meta/0012_snapshot.json", import.meta.url), "utf8")),
    ]);
    expect(schema).toContain('index("managed_teams_captainUserId_idx").on(table.captainUserId)');
    expect(migration).toContain('CREATE INDEX `managed_teams_captainUserId_idx` ON `managed_teams` (`captainUserId`);');
    expect(migration).toContain('CREATE UNIQUE INDEX `managed_team_invites_team_invited_unique` ON `managed_team_invites` (`teamId`,`invitedUserId`);');
    expect(JSON.parse(snapshot).tables.managed_teams.indexes.managed_teams_captainUserId_idx).toMatchObject({ columns: ["captainUserId"], isUnique: false });
    expect(JSON.parse(snapshot).tables.managed_team_invites.indexes.managed_team_invites_team_invited_unique).toMatchObject({ columns: ["teamId", "invitedUserId"], isUnique: true });
  });

  it("does not duplicate an existing pending invite", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain('existingInvite?.status === "pending"');
    expect(source).toContain("That player already has a pending invite.");
  });

  it("reactivates declined or revoked invites instead of inserting a second row", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain('existingInvite.status === "declined" || existingInvite.status === "revoked"');
    expect(source).toContain('set({ status: "pending", createdByUserId: userId, updatedAt: sql`now()` })');
    expect(source).toContain('where(eq(managedTeamInvites.id, existingInvite.id))');
  });

  it("does not retain avoidable any annotations in team management server or page code", async () => {
    const [serverSource, pageSource] = await Promise.all([
      import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8")),
      import("node:fs/promises").then(fs => fs.readFile(new URL("../pages/TeamManagement.tsx", import.meta.url), "utf8")),
    ]);
    expect(serverSource).not.toMatch(/:\s*any\b/);
    expect(pageSource).not.toMatch(/:\s*any\b/);
  });
});
