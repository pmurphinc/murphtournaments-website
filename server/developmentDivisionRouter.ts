import { z } from "zod";
import {
  adminProcedure,
  discordAuthenticatedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  claimDevelopmentDivisionInvite,
  createDevelopmentDivisionInvite,
  DEFAULT_DEVELOPMENT_DIVISION_INVITE_DAYS,
  DEFAULT_DEVELOPMENT_DIVISION_INVITE_MAX_USES,
  listDevelopmentDivisionInvites,
  previewDevelopmentDivisionInvite,
  revokeDevelopmentDivisionInvite,
} from "./developmentDivisionInvites";

const inviteToken = z.string().trim().min(16).max(256);

export const developmentDivisionRouter = router({
  previewInvite: publicProcedure
    .input(z.object({ token: inviteToken }))
    .query(({ input }) => previewDevelopmentDivisionInvite(input.token)),
  claimInvite: discordAuthenticatedProcedure
    .input(z.object({ token: inviteToken }))
    .mutation(({ ctx, input }) =>
      claimDevelopmentDivisionInvite(ctx.user.id, input.token)
    ),
  listInvites: adminProcedure.query(() => listDevelopmentDivisionInvites()),
  createInvite: adminProcedure
    .input(
      z.object({
        expiresInDays: z
          .number()
          .int()
          .min(1)
          .max(365)
          .nullable()
          .default(DEFAULT_DEVELOPMENT_DIVISION_INVITE_DAYS),
        maxUses: z
          .number()
          .int()
          .min(1)
          .max(500)
          .nullable()
          .default(DEFAULT_DEVELOPMENT_DIVISION_INVITE_MAX_USES),
      })
    )
    .mutation(({ ctx, input }) =>
      createDevelopmentDivisionInvite({
        createdByUserId: ctx.user.id,
        expiresInDays: input.expiresInDays,
        maxUses: input.maxUses,
      })
    ),
  revokeInvite: adminProcedure
    .input(z.object({ inviteId: z.number().int().positive() }))
    .mutation(({ input }) => revokeDevelopmentDivisionInvite(input.inviteId)),
});
