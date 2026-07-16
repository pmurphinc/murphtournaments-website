import { z } from "zod";
import type { Request } from "express";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { isDiscordAuthenticatedUser } from "./_core/discordOAuth";
import {
  acceptManagedTeamJoinLink,
  cancelManagedTeamInvite,
  createManagedTeam,
  createManagedTeamJoinLink,
  disbandManagedTeam,
  getManagedTeamJoinLinkPreview,
  inviteManagedTeamByDiscordUsername,
  leaveManagedTeam,
  listManagedTeamJoinLinks,
  listMyTeamManagement,
  removeManagedTeamMember,
  renameManagedTeam,
  respondToManagedTeamInvite,
  revokeManagedTeamJoinLink,
  transferManagedTeamCaptain,
  listAvailableTournamentsForMyTeams,
  submitManagedTeamToTournament,
  updateManagedTeamMapBan,
} from "./teamManagement";

const discordProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!isDiscordAuthenticatedUser(ctx.user))
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Team Management requires Discord sign-in",
    });
  return next({ ctx });
});

/**
 * Absolute origin for links sent outside the browser (e.g. Discord DMs),
 * where there's no window.location to build from. Respects a TLS-terminating
 * proxy's forwarded headers (same pattern as getSessionCookieOptions in
 * _core/cookies.ts) so this resolves correctly in local dev, preview, and
 * production without hardcoding a domain.
 */
function getRequestOrigin(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : (forwardedProto?.split(",") ?? []);
  const protocol = protoList.some(
    proto => proto.trim().toLowerCase() === "https"
  )
    ? "https"
    : req.protocol;
  const forwardedHost = req.headers["x-forwarded-host"];
  const host =
    (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ??
    req.get("host");
  return `${protocol}://${host}`;
}

const teamId = z.number().int().positive();
const teamName = z.string().trim().min(2).max(64);
const joinToken = z.string().trim().min(16).max(256);

export const teamManagementRouter = router({
  myTeams: discordProcedure.query(({ ctx }) =>
    listMyTeamManagement(ctx.user.id)
  ),
  listAvailableTournamentsForMyTeams: discordProcedure.query(({ ctx }) =>
    listAvailableTournamentsForMyTeams(ctx.user.id)
  ),
  listJoinLinks: discordProcedure
    .input(z.object({ teamId }))
    .query(({ ctx, input }) =>
      listManagedTeamJoinLinks(ctx.user.id, input.teamId)
    ),
  getJoinLinkPreview: publicProcedure
    .input(z.object({ token: joinToken }))
    .query(({ input }) => getManagedTeamJoinLinkPreview(input.token)),
  submitTeamToTournament: discordProcedure
    .input(z.object({ teamId, tournamentId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      submitManagedTeamToTournament(
        ctx.user.id,
        input.teamId,
        input.tournamentId
      )
    ),
  create: discordProcedure
    .input(z.object({ name: teamName }))
    .mutation(({ ctx, input }) => createManagedTeam(ctx.user.id, input.name)),
  createJoinLink: discordProcedure
    .input(z.object({ teamId }))
    .mutation(({ ctx, input }) =>
      createManagedTeamJoinLink(ctx.user.id, input.teamId)
    ),
  revokeJoinLink: discordProcedure
    .input(z.object({ linkId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      revokeManagedTeamJoinLink(ctx.user.id, input.linkId)
    ),
  acceptJoinLink: discordProcedure
    .input(z.object({ token: joinToken }))
    .mutation(({ ctx, input }) =>
      acceptManagedTeamJoinLink(ctx.user.id, input.token)
    ),
  rename: discordProcedure
    .input(z.object({ teamId, name: teamName }))
    .mutation(({ ctx, input }) =>
      renameManagedTeam(ctx.user.id, input.teamId, input.name)
    ),
  updateMapBan: discordProcedure
    .input(
      z.object({
        teamId,
        mapBanId: z.string().trim().min(1).max(64).nullable(),
      })
    )
    .mutation(({ ctx, input }) =>
      updateManagedTeamMapBan(ctx.user.id, input.teamId, input.mapBanId)
    ),
  disband: discordProcedure
    .input(z.object({ teamId, confirmation: z.literal("DISBAND") }))
    .mutation(({ ctx, input }) =>
      disbandManagedTeam(ctx.user.id, input.teamId, input.confirmation)
    ),
  inviteByDiscordUsername: discordProcedure
    .input(
      z.object({ teamId, discordUsername: z.string().trim().min(2).max(64) })
    )
    .mutation(({ ctx, input }) =>
      inviteManagedTeamByDiscordUsername(
        ctx.user.id,
        input.teamId,
        input.discordUsername,
        getRequestOrigin(ctx.req)
      )
    ),
  respondToInvite: discordProcedure
    .input(
      z.object({
        inviteId: z.number().int().positive(),
        response: z.enum(["accept", "decline"]),
      })
    )
    .mutation(({ ctx, input }) =>
      respondToManagedTeamInvite(ctx.user.id, input.inviteId, input.response)
    ),
  cancelInvite: discordProcedure
    .input(z.object({ inviteId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      cancelManagedTeamInvite(ctx.user.id, input.inviteId)
    ),
  removeMember: discordProcedure
    .input(z.object({ teamId, memberUserId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      removeManagedTeamMember(ctx.user.id, input.teamId, input.memberUserId)
    ),
  transferCaptain: discordProcedure
    .input(z.object({ teamId, newCaptainUserId: z.number().int().positive() }))
    .mutation(({ ctx, input }) =>
      transferManagedTeamCaptain(
        ctx.user.id,
        input.teamId,
        input.newCaptainUserId
      )
    ),
  leaveTeam: discordProcedure
    .input(z.object({ teamId }))
    .mutation(({ ctx, input }) => leaveManagedTeam(ctx.user.id, input.teamId)),
});
