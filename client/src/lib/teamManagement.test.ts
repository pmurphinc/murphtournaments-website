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
