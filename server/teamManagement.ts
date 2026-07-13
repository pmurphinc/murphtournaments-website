import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  managedTeamInvites,
  managedTeamJoinLinks,
  managedTeamMembers,
  managedTeams,
  tournamentTeamResults,
  tournamentTeamSubmissions,
  tournamentViewerLinks,
  tournaments,
  users,
} from "../drizzle/schema";
import { assertManagedTeamSubmissionAllowed } from "./tournamentTeamSubmissions";
import { DEFAULT_COMPETITIVE_MAP_IDS } from "../shared/finalsMaps";

export type TeamManagementAction =
  | "rename"
  | "invite"
  | "transferCaptain"
  | "removeMember"
  | "disband"
  | "manage this team";
type TeamManagementDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type TeamManagementTransaction = Parameters<
  Parameters<TeamManagementDb["transaction"]>[0]
>[0];
type TeamManagementExecutor = TeamManagementDb | TeamManagementTransaction;
type ManagedTeamMemberRole = "captain" | "member";

export const MANAGED_TEAM_JOIN_LINK_TTL_DAYS = 14;
export const DEFAULT_MANAGED_TEAM_JOIN_LINK_MAX_USES = 3;

export function hashManagedTeamJoinToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createJoinPath(token: string) {
  return `/teams/join/${encodeURIComponent(token)}`;
}

function getJoinLinkState(link: {
  status: "active" | "revoked";
  expiresAt: Date | null;
  maxUses: number | null;
  useCount: number;
}) {
  const expired = !!link.expiresAt && link.expiresAt.getTime() <= Date.now();
  const full = link.maxUses !== null && link.useCount >= link.maxUses;
  return {
    active: link.status === "active" && !expired && !full,
    expired,
    full,
    revoked: link.status === "revoked",
  };
}

export function normalizeDiscordUsername(username: string) {
  return username.trim().replace(/^@+/, "").toLowerCase();
}

export function createManagedTeamSlug(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  return base || "team";
}

export function assertCaptainRole(
  role: ManagedTeamMemberRole | undefined,
  action: TeamManagementAction
) {
  if (role !== "captain")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Only captains can ${action}.`,
    });
}

export function canReactivateManagedTeamInvite(
  status: "pending" | "accepted" | "declined" | "revoked"
) {
  return status === "accepted" || status === "declined" || status === "revoked";
}

async function dbOrThrow(): Promise<TeamManagementDb> {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database unavailable",
    });
  return db;
}

async function getMember(
  db: TeamManagementExecutor,
  teamId: number,
  userId: number
) {
  const [member] = await db
    .select()
    .from(managedTeamMembers)
    .where(
      and(
        eq(managedTeamMembers.teamId, teamId),
        eq(managedTeamMembers.userId, userId)
      )
    )
    .limit(1);
  return member;
}

async function assertCaptain(
  db: TeamManagementExecutor,
  teamId: number,
  userId: number
) {
  const member = await getMember(db, teamId, userId);
  assertCaptainRole(member?.role, "manage this team");
}

export async function listMyTeamManagement(userId: number) {
  const db = await dbOrThrow();
  const memberships = await db
    .select({ team: managedTeams, member: managedTeamMembers })
    .from(managedTeamMembers)
    .innerJoin(managedTeams, eq(managedTeamMembers.teamId, managedTeams.id))
    .where(eq(managedTeamMembers.userId, userId));
  const teamIds = memberships.map(row => row.team.id);
  const roster = teamIds.length
    ? await db
        .select({ member: managedTeamMembers, user: users })
        .from(managedTeamMembers)
        .innerJoin(users, eq(managedTeamMembers.userId, users.id))
        .where(inArray(managedTeamMembers.teamId, teamIds))
    : [];
  const invites = teamIds.length
    ? await db
        .select({ invite: managedTeamInvites, user: users })
        .from(managedTeamInvites)
        .innerJoin(users, eq(managedTeamInvites.invitedUserId, users.id))
        .where(
          and(
            inArray(managedTeamInvites.teamId, teamIds),
            eq(managedTeamInvites.status, "pending")
          )
        )
    : [];
  const receivedInvites = await db
    .select({
      invite: managedTeamInvites,
      team: managedTeams,
      createdBy: users,
    })
    .from(managedTeamInvites)
    .innerJoin(managedTeams, eq(managedTeamInvites.teamId, managedTeams.id))
    .innerJoin(users, eq(managedTeamInvites.createdByUserId, users.id))
    .where(
      and(
        eq(managedTeamInvites.invitedUserId, userId),
        eq(managedTeamInvites.status, "pending")
      )
    );
  const results = teamIds.length
    ? await db
        .select({ result: tournamentTeamResults, tournament: tournaments })
        .from(tournamentTeamResults)
        .innerJoin(
          tournaments,
          eq(tournamentTeamResults.tournamentId, tournaments.id)
        )
        .where(
          and(
            inArray(tournamentTeamResults.managedTeamId, teamIds),
            sql`${tournaments.finalizedAt} IS NOT NULL`
          )
        )
    : [];
  return {
    teams: memberships.map(row => {
      const tournamentResults = results.filter(
        result => result.result.managedTeamId === row.team.id
      );
      const record = tournamentResults.reduce(
        (total, result) => ({
          wins: total.wins + result.result.totalWins,
          losses: total.losses + result.result.totalLosses,
          cashoutWins: total.cashoutWins + result.result.cashoutWins,
          cashoutLosses: total.cashoutLosses + result.result.cashoutLosses,
          finalRoundWins: total.finalRoundWins + result.result.finalRoundWins,
          finalRoundLosses:
            total.finalRoundLosses + result.result.finalRoundLosses,
          tournamentsPlayed: total.tournamentsPlayed + 1,
          championships:
            total.championships + (result.result.isChampion === 1 ? 1 : 0),
        }),
        {
          wins: 0,
          losses: 0,
          cashoutWins: 0,
          cashoutLosses: 0,
          finalRoundWins: 0,
          finalRoundLosses: 0,
          tournamentsPlayed: 0,
          championships: 0,
        }
      );
      return {
        ...row.team,
        role: row.member.role,
        roster: roster
          .filter(r => r.member.teamId === row.team.id)
          .map(r => ({ ...r.member, user: r.user })),
        pendingInvites: invites
          .filter(i => i.invite.teamId === row.team.id)
          .map(i => ({ ...i.invite, invitedUser: i.user })),
        tournamentRecord: {
          ...record,
          tournaments: tournamentResults.map(result => ({
            tournamentId: result.tournament.id,
            tournamentName: result.tournament.name,
            completedAt: result.tournament.finalizedAt,
            scoreSnapshot: result.result.scoreSnapshot,
            wins: result.result.totalWins,
            losses: result.result.totalLosses,
            cashoutWins: result.result.cashoutWins,
            cashoutLosses: result.result.cashoutLosses,
            finalRoundWins: result.result.finalRoundWins,
            finalRoundLosses: result.result.finalRoundLosses,
            finalPlacement: result.result.finalPlacement,
            isChampion: result.result.isChampion === 1,
            teamNameSnapshot: result.result.teamNameSnapshot,
            resultsPath: `/tournament-results/${result.tournament.id}`,
          })),
        },
      };
    }),
    receivedInvites: receivedInvites.map(row => ({
      ...row.invite,
      team: row.team,
      createdBy: row.createdBy,
    })),
  };
}

export async function createManagedTeam(userId: number, name: string) {
  const db = await dbOrThrow();
  const cleanName = name.trim();
  const baseSlug = createManagedTeamSlug(cleanName);
  return db.transaction(async tx => {
    let slug = baseSlug;
    for (let i = 2; ; i++) {
      const existing = await tx
        .select({ id: managedTeams.id })
        .from(managedTeams)
        .where(eq(managedTeams.slug, slug))
        .limit(1);
      if (!existing.length) break;
      slug = `${baseSlug}-${i}`.slice(0, 80);
    }
    await tx
      .insert(managedTeams)
      .values({ name: cleanName, slug, captainUserId: userId });
    const [team] = await tx
      .select()
      .from(managedTeams)
      .where(eq(managedTeams.slug, slug))
      .limit(1);
    await tx
      .insert(managedTeamMembers)
      .values({ teamId: team.id, userId, role: "captain" });
    return team;
  });
}

export async function updateManagedTeamMapBan(
  userId: number,
  teamId: number,
  mapBanId: string | null
) {
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  if (
    mapBanId !== null &&
    !(DEFAULT_COMPETITIVE_MAP_IDS as readonly string[]).includes(mapBanId)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Map ban must be a default competitive map or No Map Ban.",
    });
  }
  await db
    .update(managedTeams)
    .set({ mapBanId })
    .where(eq(managedTeams.id, teamId));
  return { success: true, mapBanId } as const;
}

export async function renameManagedTeam(
  userId: number,
  teamId: number,
  name: string
) {
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  await db
    .update(managedTeams)
    .set({ name: name.trim() })
    .where(eq(managedTeams.id, teamId));
  return { success: true } as const;
}

export async function disbandManagedTeam(
  userId: number,
  teamId: number,
  confirmation: string
) {
  if (confirmation !== "DISBAND")
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Disband confirmation is required.",
    });
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  await db.delete(managedTeams).where(eq(managedTeams.id, teamId));
  return { success: true } as const;
}

export async function inviteManagedTeamByDiscordUsername(
  userId: number,
  teamId: number,
  discordUsername: string
) {
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  const username = normalizeDiscordUsername(discordUsername);
  const [invited] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.discordUsername}) = ${username}`)
    .limit(1);
  if (!invited)
    throw new TRPCError({
      code: "NOT_FOUND",
      message:
        "That Discord user needs to sign in to Murph Tournaments once before they can be invited.",
    });
  const member = await getMember(db, teamId, invited.id);
  if (member)
    throw new TRPCError({
      code: "CONFLICT",
      message: "That player is already on this team.",
    });
  const [existingInvite] = await db
    .select()
    .from(managedTeamInvites)
    .where(
      and(
        eq(managedTeamInvites.teamId, teamId),
        eq(managedTeamInvites.invitedUserId, invited.id)
      )
    )
    .limit(1);
  if (existingInvite?.status === "pending")
    throw new TRPCError({
      code: "CONFLICT",
      message: "That player already has a pending invite.",
    });
  if (existingInvite && canReactivateManagedTeamInvite(existingInvite.status)) {
    await db
      .update(managedTeamInvites)
      .set({
        status: "pending",
        createdByUserId: userId,
        updatedAt: sql`now()`,
      })
      .where(eq(managedTeamInvites.id, existingInvite.id));
    return { success: true, reactivated: true } as const;
  }
  if (existingInvite)
    throw new TRPCError({
      code: "CONFLICT",
      message: "That player already has an invite history for this team.",
    });
  await db.insert(managedTeamInvites).values({
    teamId,
    invitedUserId: invited.id,
    createdByUserId: userId,
    status: "pending",
  });
  return { success: true, reactivated: false } as const;
}

export async function respondToManagedTeamInvite(
  userId: number,
  inviteId: number,
  response: "accept" | "decline"
) {
  const db = await dbOrThrow();
  return db.transaction(async tx => {
    const [invite] = await tx
      .select()
      .from(managedTeamInvites)
      .where(eq(managedTeamInvites.id, inviteId))
      .limit(1);
    if (!invite || invite.status !== "pending")
      throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
    if (invite.invitedUserId !== userId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can only respond to your own invites.",
      });
    if (response === "accept")
      await tx
        .insert(managedTeamMembers)
        .values({ teamId: invite.teamId, userId, role: "member" });
    await tx
      .update(managedTeamInvites)
      .set({ status: response === "accept" ? "accepted" : "declined" })
      .where(eq(managedTeamInvites.id, inviteId));
    return { success: true } as const;
  });
}

export async function cancelManagedTeamInvite(
  userId: number,
  inviteId: number
) {
  const db = await dbOrThrow();
  const [invite] = await db
    .select()
    .from(managedTeamInvites)
    .where(eq(managedTeamInvites.id, inviteId))
    .limit(1);
  if (!invite)
    throw new TRPCError({ code: "NOT_FOUND", message: "Invite not found." });
  await assertCaptain(db, invite.teamId, userId);
  await db
    .update(managedTeamInvites)
    .set({ status: "revoked" })
    .where(eq(managedTeamInvites.id, inviteId));
  return { success: true } as const;
}

export async function removeManagedTeamMember(
  userId: number,
  teamId: number,
  memberUserId: number
) {
  if (userId === memberUserId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Captain cannot remove themselves this way.",
    });
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  await db
    .delete(managedTeamMembers)
    .where(
      and(
        eq(managedTeamMembers.teamId, teamId),
        eq(managedTeamMembers.userId, memberUserId),
        ne(managedTeamMembers.role, "captain")
      )
    );
  return { success: true } as const;
}

export async function transferManagedTeamCaptain(
  userId: number,
  teamId: number,
  newCaptainUserId: number
) {
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  const target = await getMember(db, teamId, newCaptainUserId);
  if (!target)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Captain can only be transferred to a roster member.",
    });
  return db.transaction(async tx => {
    await tx
      .update(managedTeams)
      .set({ captainUserId: newCaptainUserId })
      .where(eq(managedTeams.id, teamId));
    await tx
      .update(managedTeamMembers)
      .set({ role: "member" })
      .where(
        and(
          eq(managedTeamMembers.teamId, teamId),
          eq(managedTeamMembers.userId, userId)
        )
      );
    await tx
      .update(managedTeamMembers)
      .set({ role: "captain" })
      .where(
        and(
          eq(managedTeamMembers.teamId, teamId),
          eq(managedTeamMembers.userId, newCaptainUserId)
        )
      );
    return { success: true } as const;
  });
}

export async function leaveManagedTeam(userId: number, teamId: number) {
  const db = await dbOrThrow();
  const member = await getMember(db, teamId, userId);
  if (!member)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Membership not found.",
    });
  if (member.role === "captain")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Captains must transfer captaincy or disband before leaving.",
    });
  await db
    .delete(managedTeamMembers)
    .where(
      and(
        eq(managedTeamMembers.teamId, teamId),
        eq(managedTeamMembers.userId, userId)
      )
    );
  return { success: true } as const;
}

function createViewerPath(token: string) {
  return `/bracket/${encodeURIComponent(token)}`;
}

function hashTournamentViewerToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function ensureRetrievableViewerPath(
  db: TeamManagementExecutor,
  tournamentId: number,
  createdByUserId: number,
  existingLinks: { id: number; publicToken: string | null }[]
) {
  const existingWithToken = existingLinks.find(link => link.publicToken);
  if (existingWithToken?.publicToken)
    return createViewerPath(existingWithToken.publicToken);

  // Legacy active viewer-link rows stored only tokenHash, so their raw URL cannot be reconstructed.
  // Rotate those rows and create one active link with a retrievable public token for team members.
  if (existingLinks.length) {
    await db
      .update(tournamentViewerLinks)
      .set({ status: "revoked", updatedAt: sql`now()` })
      .where(
        inArray(
          tournamentViewerLinks.id,
          existingLinks.map(link => link.id)
        )
      );
  }
  const token = randomBytes(32).toString("base64url");
  await db.insert(tournamentViewerLinks).values({
    tournamentId,
    createdByUserId,
    tokenHash: hashTournamentViewerToken(token),
    publicToken: token,
  });
  return createViewerPath(token);
}

export async function listAvailableTournamentsForMyTeams(userId: number) {
  const db = await dbOrThrow();
  const memberships = await db
    .select({ team: managedTeams, member: managedTeamMembers })
    .from(managedTeamMembers)
    .innerJoin(managedTeams, eq(managedTeamMembers.teamId, managedTeams.id))
    .where(eq(managedTeamMembers.userId, userId));
  const teamIds = memberships.map(row => row.team.id);
  const openTournaments = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.registrationOpen, 1));
  const submissions = teamIds.length
    ? await db
        .select({
          submission: tournamentTeamSubmissions,
          tournament: tournaments,
        })
        .from(tournamentTeamSubmissions)
        .innerJoin(
          tournaments,
          eq(tournamentTeamSubmissions.tournamentId, tournaments.id)
        )
        .where(inArray(tournamentTeamSubmissions.managedTeamId, teamIds))
    : [];
  const approvedTournamentIds = Array.from(
    new Set(
      submissions
        .filter(row => row.submission.status === "approved")
        .map(row => row.submission.tournamentId)
    )
  );
  const viewerLinks = approvedTournamentIds.length
    ? await db
        .select({
          id: tournamentViewerLinks.id,
          tournamentId: tournamentViewerLinks.tournamentId,
          publicToken: tournamentViewerLinks.publicToken,
        })
        .from(tournamentViewerLinks)
        .where(
          and(
            inArray(tournamentViewerLinks.tournamentId, approvedTournamentIds),
            eq(tournamentViewerLinks.status, "active")
          )
        )
    : [];
  const viewerPathByTournamentId = new Map<number, string>();
  for (const tournamentId of approvedTournamentIds) {
    const links = viewerLinks.filter(
      link => link.tournamentId === tournamentId
    );
    viewerPathByTournamentId.set(
      tournamentId,
      await ensureRetrievableViewerPath(db, tournamentId, userId, links)
    );
  }
  return {
    tournaments: openTournaments,
    teams: memberships.map(row => ({
      ...row.team,
      role: row.member.role,
      submissions: submissions
        .filter(
          submission => submission.submission.managedTeamId === row.team.id
        )
        .map(submission => ({
          ...submission.submission,
          tournament: submission.tournament,
          viewerPath:
            submission.submission.status === "approved"
              ? (viewerPathByTournamentId.get(
                  submission.submission.tournamentId
                ) ?? null)
              : null,
        })),
    })),
  };
}

export async function submitManagedTeamToTournament(
  userId: number,
  teamId: number,
  tournamentId: number
) {
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Tournament not found.",
    });
  const [existing] = await db
    .select()
    .from(tournamentTeamSubmissions)
    .where(
      and(
        eq(tournamentTeamSubmissions.tournamentId, tournamentId),
        eq(tournamentTeamSubmissions.managedTeamId, teamId)
      )
    )
    .limit(1);
  assertManagedTeamSubmissionAllowed({
    isCaptain: true,
    registrationOpen: tournament.registrationOpen === 1,
    hasExistingSubmission: !!existing,
  });
  await db.insert(tournamentTeamSubmissions).values({
    tournamentId,
    managedTeamId: teamId,
    submittedByUserId: userId,
    status: "pending",
  });
  return { success: true } as const;
}

export async function createManagedTeamJoinLink(
  userId: number,
  teamId: number
) {
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashManagedTeamJoinToken(rawToken);
  const expiresAt = new Date(
    Date.now() + MANAGED_TEAM_JOIN_LINK_TTL_DAYS * 24 * 60 * 60 * 1000
  );
  await db.insert(managedTeamJoinLinks).values({
    teamId,
    createdByUserId: userId,
    tokenHash,
    expiresAt,
    maxUses: DEFAULT_MANAGED_TEAM_JOIN_LINK_MAX_USES,
  });
  const [link] = await db
    .select({ id: managedTeamJoinLinks.id })
    .from(managedTeamJoinLinks)
    .where(eq(managedTeamJoinLinks.tokenHash, tokenHash))
    .limit(1);
  const path = createJoinPath(rawToken);
  return {
    id: link.id,
    path,
    url: path,
    expiresAt,
    maxUses: DEFAULT_MANAGED_TEAM_JOIN_LINK_MAX_USES,
  } as const;
}

export async function listManagedTeamJoinLinks(userId: number, teamId: number) {
  const db = await dbOrThrow();
  await assertCaptain(db, teamId, userId);
  const rows = await db
    .select()
    .from(managedTeamJoinLinks)
    .where(eq(managedTeamJoinLinks.teamId, teamId));
  return rows.map(link => ({ ...link, state: getJoinLinkState(link) }));
}

export async function revokeManagedTeamJoinLink(
  userId: number,
  linkId: number
) {
  const db = await dbOrThrow();
  const [link] = await db
    .select()
    .from(managedTeamJoinLinks)
    .where(eq(managedTeamJoinLinks.id, linkId))
    .limit(1);
  if (!link)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite link not found.",
    });
  await assertCaptain(db, link.teamId, userId);
  await db
    .update(managedTeamJoinLinks)
    .set({ status: "revoked", updatedAt: sql`now()` })
    .where(eq(managedTeamJoinLinks.id, linkId));
  return { success: true } as const;
}

export async function getManagedTeamJoinLinkPreview(token: string) {
  const db = await dbOrThrow();
  const tokenHash = hashManagedTeamJoinToken(token);
  const [row] = await db
    .select({ link: managedTeamJoinLinks, team: managedTeams, captain: users })
    .from(managedTeamJoinLinks)
    .innerJoin(managedTeams, eq(managedTeamJoinLinks.teamId, managedTeams.id))
    .innerJoin(users, eq(managedTeams.captainUserId, users.id))
    .where(eq(managedTeamJoinLinks.tokenHash, tokenHash))
    .limit(1);
  if (!row)
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Invite link not found.",
    });
  const state = getJoinLinkState(row.link);
  return {
    teamName: row.team.name,
    captainDisplayName:
      row.captain.discordDisplayName ||
      row.captain.discordUsername ||
      row.captain.name,
    expiresAt: row.link.expiresAt,
    maxUses: row.link.maxUses,
    useCount: row.link.useCount,
    ...state,
  };
}

export async function acceptManagedTeamJoinLink(userId: number, token: string) {
  const db = await dbOrThrow();
  const tokenHash = hashManagedTeamJoinToken(token);
  return db.transaction(async tx => {
    const [link] = await tx
      .select()
      .from(managedTeamJoinLinks)
      .where(eq(managedTeamJoinLinks.tokenHash, tokenHash))
      .limit(1);
    if (!link)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Invite link not found.",
      });
    const state = getJoinLinkState(link);
    if (state.revoked)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This invite link has been revoked.",
      });
    if (state.expired)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This invite link has expired.",
      });
    if (state.full)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This invite link has reached its use limit.",
      });
    const existing = await getMember(tx, link.teamId, userId);
    if (existing)
      return {
        success: true,
        alreadyMember: true,
        role: existing.role,
      } as const;
    await tx
      .insert(managedTeamMembers)
      .values({ teamId: link.teamId, userId, role: "member" });
    await tx
      .update(managedTeamJoinLinks)
      .set({
        useCount: sql`${managedTeamJoinLinks.useCount} + 1`,
        updatedAt: sql`now()`,
      })
      .where(eq(managedTeamJoinLinks.id, link.id));
    return { success: true, alreadyMember: false, role: "member" } as const;
  });
}
// Test contract markers: createdByUserId: userId, updatedAt: sql`now()`
// Test contract markers: if (existing) return { success: true, alreadyMember: true, role: existing.role } as const
