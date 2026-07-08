import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { managedTeamInvites, managedTeamMembers, managedTeams, tournamentTeamSubmissions, tournaments, users } from "../drizzle/schema";
import { assertManagedTeamSubmissionAllowed } from "./tournamentTeamSubmissions";

export type TeamManagementAction = "rename" | "invite" | "transferCaptain" | "removeMember" | "disband" | "manage this team";
type TeamManagementDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type TeamManagementTransaction = Parameters<Parameters<TeamManagementDb["transaction"]>[0]>[0];
type TeamManagementExecutor = TeamManagementDb | TeamManagementTransaction;
type ManagedTeamMemberRole = "captain" | "member";

export function normalizeDiscordUsername(username: string) {
  return username.trim().replace(/^@+/, "");
}

export function createManagedTeamSlug(name: string) {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  return base || "team";
}

export function assertCaptainRole(role: ManagedTeamMemberRole | undefined, action: TeamManagementAction) {
  if (role !== "captain") throw new TRPCError({ code: "FORBIDDEN", message: `Only captains can ${action}.` });
}

export function canReactivateManagedTeamInvite(status: "pending" | "accepted" | "declined" | "revoked") {
  return status === "accepted" || status === "declined" || status === "revoked";
}

async function dbOrThrow(): Promise<TeamManagementDb> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

async function getMember(db: TeamManagementExecutor, teamId: number, userId: number) {
  const [member] = await db.select().from(managedTeamMembers).where(and(eq(managedTeamMembers.teamId, teamId), eq(managedTeamMembers.userId, userId))).limit(1);
  return member;
}

async function assertCaptain(db: TeamManagementExecutor, teamId: number, userId: number) {
  const member = await getMember(db, teamId, userId);
  assertCaptainRole(member?.role, "manage this team");
}

export async function listMyTeamManagement(userId: number) {
  const db = await dbOrThrow();
  const memberships = await db.select({ team: managedTeams, member: managedTeamMembers }).from(managedTeamMembers).innerJoin(managedTeams, eq(managedTeamMembers.teamId, managedTeams.id)).where(eq(managedTeamMembers.userId, userId));
  const teamIds = memberships.map(row => row.team.id);
  const roster = teamIds.length ? await db.select({ member: managedTeamMembers, user: users }).from(managedTeamMembers).innerJoin(users, eq(managedTeamMembers.userId, users.id)).where(inArray(managedTeamMembers.teamId, teamIds)) : [];
  const invites = teamIds.length ? await db.select({ invite: managedTeamInvites, user: users }).from(managedTeamInvites).innerJoin(users, eq(managedTeamInvites.invitedUserId, users.id)).where(and(inArray(managedTeamInvites.teamId, teamIds), eq(managedTeamInvites.status, "pending"))) : [];
  const receivedInvites = await db.select({ invite: managedTeamInvites, team: managedTeams, createdBy: users }).from(managedTeamInvites).innerJoin(managedTeams, eq(managedTeamInvites.teamId, managedTeams.id)).innerJoin(users, eq(managedTeamInvites.createdByUserId, users.id)).where(and(eq(managedTeamInvites.invitedUserId, userId), eq(managedTeamInvites.status, "pending")));
  return {
    teams: memberships.map(row => ({
      ...row.team,
      role: row.member.role,
      roster: roster.filter(r => r.member.teamId === row.team.id).map(r => ({ ...r.member, user: r.user })),
      pendingInvites: invites.filter(i => i.invite.teamId === row.team.id).map(i => ({ ...i.invite, invitedUser: i.user })),
    })),
    receivedInvites: receivedInvites.map(row => ({ ...row.invite, team: row.team, createdBy: row.createdBy })),
  };
}

export async function createManagedTeam(userId: number, name: string) {
  const db = await dbOrThrow();
  const cleanName = name.trim();
  const baseSlug = createManagedTeamSlug(cleanName);
  return db.transaction(async tx => {
    let slug = baseSlug;
    for (let i = 2; ; i++) {
      const existing = await tx.select({ id: managedTeams.id }).from(managedTeams).where(eq(managedTeams.slug, slug)).limit(1);
      if (!existing.length) break;
      slug = `${baseSlug}-${i}`.slice(0, 80);
    }
    await tx.insert(managedTeams).values({ name: cleanName, slug, captainUserId: userId });
    const [team] = await tx.select().from(managedTeams).where(eq(managedTeams.slug, slug)).limit(1);
    await tx.insert(managedTeamMembers).values({ teamId: team.id, userId, role: "captain" });
    return team;
  });
}

export async function renameManagedTeam(userId: number, teamId: number, name: string) {
  const db = await dbOrThrow(); await assertCaptain(db, teamId, userId);
  await db.update(managedTeams).set({ name: name.trim() }).where(eq(managedTeams.id, teamId));
  return { success: true } as const;
}

export async function disbandManagedTeam(userId: number, teamId: number, confirmation: string) {
  if (confirmation !== "DISBAND") throw new TRPCError({ code: "BAD_REQUEST", message: "Disband confirmation is required." });
  const db = await dbOrThrow(); await assertCaptain(db, teamId, userId);
  await db.delete(managedTeams).where(eq(managedTeams.id, teamId));
  return { success: true } as const;
}

export async function inviteManagedTeamByDiscordUsername(userId: number, teamId: number, discordUsername: string) {
  const db = await dbOrThrow(); await assertCaptain(db, teamId, userId);
  const username = normalizeDiscordUsername(discordUsername);
  const [invited] = await db.select().from(users).where(eq(users.discordUsername, username)).limit(1);
  if (!invited) throw new TRPCError({ code: "NOT_FOUND", message: "That Discord user needs to sign in to Murph Tournaments once before they can be invited." });
  const member = await getMember(db, teamId, invited.id);
  if (member) throw new TRPCError({ code: "CONFLICT", message: "That player is already on this team." });
  const [existingInvite] = await db.select().from(managedTeamInvites).where(and(eq(managedTeamInvites.teamId, teamId), eq(managedTeamInvites.invitedUserId, invited.id))).limit(1);
  if (existingInvite?.status === "pending") throw new TRPCError({ code: "CONFLICT", message: "That player already has a pending invite." });
  if (existingInvite && canReactivateManagedTeamInvite(existingInvite.status)) {
    await db.update(managedTeamInvites).set({ status: "pending", createdByUserId: userId, updatedAt: sql`now()` }).where(eq(managedTeamInvites.id, existingInvite.id));
    return { success: true, reactivated: true } as const;
  }
  if (existingInvite) throw new TRPCError({ code: "CONFLICT", message: "That player already has an invite history for this team." });
  await db.insert(managedTeamInvites).values({ teamId, invitedUserId: invited.id, createdByUserId: userId, status: "pending" });
  return { success: true, reactivated: false } as const;
}

export async function respondToManagedTeamInvite(userId: number, inviteId: number, response: "accept" | "decline") {
  const db = await dbOrThrow();
  return db.transaction(async tx => {
    const [invite] = await tx.select().from(managedTeamInvites).where(eq(managedTeamInvites.id, inviteId)).limit(1);
    if (!invite || invite.status !== "pending") throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
    if (invite.invitedUserId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "You can only respond to your own invites." });
    if (response === "accept") await tx.insert(managedTeamMembers).values({ teamId: invite.teamId, userId, role: "member" });
    await tx.update(managedTeamInvites).set({ status: response === "accept" ? "accepted" : "declined" }).where(eq(managedTeamInvites.id, inviteId));
    return { success: true } as const;
  });
}

export async function cancelManagedTeamInvite(userId: number, inviteId: number) {
  const db = await dbOrThrow(); const [invite] = await db.select().from(managedTeamInvites).where(eq(managedTeamInvites.id, inviteId)).limit(1);
  if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." }); await assertCaptain(db, invite.teamId, userId);
  await db.update(managedTeamInvites).set({ status: "revoked" }).where(eq(managedTeamInvites.id, inviteId)); return { success: true } as const;
}

export async function removeManagedTeamMember(userId: number, teamId: number, memberUserId: number) {
  if (userId === memberUserId) throw new TRPCError({ code: "BAD_REQUEST", message: "Captain cannot remove themselves this way." });
  const db = await dbOrThrow(); await assertCaptain(db, teamId, userId);
  await db.delete(managedTeamMembers).where(and(eq(managedTeamMembers.teamId, teamId), eq(managedTeamMembers.userId, memberUserId), ne(managedTeamMembers.role, "captain")));
  return { success: true } as const;
}

export async function transferManagedTeamCaptain(userId: number, teamId: number, newCaptainUserId: number) {
  const db = await dbOrThrow(); await assertCaptain(db, teamId, userId);
  const target = await getMember(db, teamId, newCaptainUserId); if (!target) throw new TRPCError({ code: "BAD_REQUEST", message: "Captain can only be transferred to a roster member." });
  return db.transaction(async tx => { await tx.update(managedTeams).set({ captainUserId: newCaptainUserId }).where(eq(managedTeams.id, teamId)); await tx.update(managedTeamMembers).set({ role: "member" }).where(and(eq(managedTeamMembers.teamId, teamId), eq(managedTeamMembers.userId, userId))); await tx.update(managedTeamMembers).set({ role: "captain" }).where(and(eq(managedTeamMembers.teamId, teamId), eq(managedTeamMembers.userId, newCaptainUserId))); return { success: true } as const; });
}

export async function leaveManagedTeam(userId: number, teamId: number) {
  const db = await dbOrThrow(); const member = await getMember(db, teamId, userId);
  if (!member) throw new TRPCError({ code: "NOT_FOUND", message: "Membership not found." });
  if (member.role === "captain") throw new TRPCError({ code: "FORBIDDEN", message: "Captains must transfer captaincy or disband before leaving." });
  await db.delete(managedTeamMembers).where(and(eq(managedTeamMembers.teamId, teamId), eq(managedTeamMembers.userId, userId))); return { success: true } as const;
}

export async function listAvailableTournamentsForMyTeams(userId: number) {
  const db = await dbOrThrow();
  const memberships = await db.select({ team: managedTeams, member: managedTeamMembers }).from(managedTeamMembers).innerJoin(managedTeams, eq(managedTeamMembers.teamId, managedTeams.id)).where(eq(managedTeamMembers.userId, userId));
  const teamIds = memberships.map(row => row.team.id);
  const openTournaments = await db.select().from(tournaments).where(eq(tournaments.registrationOpen, 1));
  const submissions = teamIds.length ? await db.select({ submission: tournamentTeamSubmissions, tournament: tournaments }).from(tournamentTeamSubmissions).innerJoin(tournaments, eq(tournamentTeamSubmissions.tournamentId, tournaments.id)).where(inArray(tournamentTeamSubmissions.managedTeamId, teamIds)) : [];
  return {
    tournaments: openTournaments,
    teams: memberships.map(row => ({
      ...row.team,
      role: row.member.role,
      submissions: submissions.filter(submission => submission.submission.managedTeamId === row.team.id).map(submission => ({ ...submission.submission, tournament: submission.tournament })),
    })),
  };
}

export async function submitManagedTeamToTournament(userId: number, teamId: number, tournamentId: number) {
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).limit(1);
  if (!tournament) throw new TRPCError({ code: "NOT_FOUND", message: "Tournament not found." });
  const [existing] = await db.select().from(tournamentTeamSubmissions).where(and(eq(tournamentTeamSubmissions.tournamentId, tournamentId), eq(tournamentTeamSubmissions.managedTeamId, teamId))).limit(1);
  assertManagedTeamSubmissionAllowed({ isCaptain: true, registrationOpen: tournament.registrationOpen === 1, hasExistingSubmission: !!existing });
  await db.insert(tournamentTeamSubmissions).values({ tournamentId, managedTeamId: teamId, submittedByUserId: userId, status: "pending" });
  return { success: true } as const;
}
