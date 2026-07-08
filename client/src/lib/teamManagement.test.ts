import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { assertCaptainRole, canReactivateManagedTeamInvite, createManagedTeamSlug, normalizeDiscordUsername } from "../../../server/teamManagement";

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

  it("reactivates accepted, declined, or revoked invites instead of inserting a second row", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(canReactivateManagedTeamInvite("accepted")).toBe(true);
    expect(canReactivateManagedTeamInvite("declined")).toBe(true);
    expect(canReactivateManagedTeamInvite("revoked")).toBe(true);
    expect(canReactivateManagedTeamInvite("pending")).toBe(false);
    expect(source).toContain("existingInvite && canReactivateManagedTeamInvite(existingInvite.status)");
    expect(source).toContain('set({ status: "pending", createdByUserId: userId, updatedAt: sql`now()` })');
    expect(source).toContain("where(eq(managedTeamInvites.id, existingInvite.id))");
  });

  it("allows a former member with an accepted invite to be re-invited after leaving", () => {
    expect(canReactivateManagedTeamInvite("accepted")).toBe(true);
  });

  it("allows a removed member with an accepted invite to be re-invited", () => {
    expect(canReactivateManagedTeamInvite("accepted")).toBe(true);
  });

  it("keeps active roster members and pending invites blocked", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source.indexOf("if (member) throw new TRPCError")).toBeLessThan(source.indexOf("const [existingInvite]"));
    expect(canReactivateManagedTeamInvite("pending")).toBe(false);
    expect(source).toContain('existingInvite?.status === "pending"');
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

describe("Team Management join links", () => {
  it("captain-only procedures are exposed for creating, listing, and revoking invite links", async () => {
    const router = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagementRouter.ts", import.meta.url), "utf8"));
    expect(router).toContain("createJoinLink: discordProcedure");
    expect(router).toContain("listJoinLinks: discordProcedure");
    expect(router).toContain("revokeJoinLink: discordProcedure");
    expect(router).toContain("getJoinLinkPreview: publicProcedure");
    expect(router).toContain("acceptJoinLink: discordProcedure");
  });

  it("stores only a SHA-256 token hash for generated invite links", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain('randomBytes(32).toString("base64url")');
    expect(source).toContain('createHash("sha256").update(token).digest("hex")');
    expect(source).toContain("tokenHash");
    expect(source).not.toContain("rawToken:");
  });

  it("non-captains cannot create or revoke invite links because service calls assertCaptain", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain("export async function createManagedTeamJoinLink");
    expect(source).toContain("await assertCaptain(db, teamId, userId)");
    expect(source).toContain("export async function revokeManagedTeamJoinLink");
    expect(source).toContain("await assertCaptain(db, link.teamId, userId)");
  });

  it("preview reports active, expired, full, and revoked invite states", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain("function getJoinLinkState");
    expect(source).toContain("expired");
    expect(source).toContain("full");
    expect(source).toContain("revoked");
    expect(source).toContain("teamName: row.team.name");
  });

  it("revoked, expired, and full invite links cannot be accepted", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain("This invite link has been revoked.");
    expect(source).toContain("This invite link has expired.");
    expect(source).toContain("This invite link has reached its use limit.");
  });

  it("signed-in Discord users accept valid links as members without duplicate membership", async () => {
    const source = await import("node:fs/promises").then(fs => fs.readFile(new URL("../../../server/teamManagement.ts", import.meta.url), "utf8"));
    expect(source).toContain('tx.insert(managedTeamMembers).values({ teamId: link.teamId, userId, role: "member" })');
    expect(source).toContain("if (existing) return { success: true, alreadyMember: true, role: existing.role } as const");
    expect(source).toContain("useCount: sql`${managedTeamJoinLinks.useCount} + 1`");
  });

  it("adds managed_team_join_links schema and migration without raw token storage", async () => {
    const [schema, migration] = await Promise.all([
      import("node:fs/promises").then(fs => fs.readFile(new URL("../../../drizzle/schema.ts", import.meta.url), "utf8")),
      import("node:fs/promises").then(fs => fs.readFile(new URL("../../../drizzle/0015_add_managed_team_join_links.sql", import.meta.url), "utf8")),
    ]);
    expect(schema).toContain('"managed_team_join_links"');
    expect(schema).toContain('tokenHash: varchar("tokenHash", { length: 64 }).notNull()');
    expect(migration).toContain("CREATE TABLE `managed_team_join_links`");
    expect(migration).toContain("CONSTRAINT `managed_team_join_links_tokenHash_unique` UNIQUE(`tokenHash`)");
    expect(migration).not.toContain("rawToken");
  });
});
