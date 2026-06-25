import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  adminListingActionInputSchema,
  createTeamFinderListing,
  createTeamFinderListingInputSchema,
  createTeamFinderReport,
  deleteTeamFinderListing,
  getTeamFinderListingById,
  listMyTeamFinderListings,
  listTeamFinderListings,
  listTeamFinderListingsInputSchema,
  listTeamFinderReports,
  listingIdInputSchema,
  renewTeamFinderListing,
  reportListingInputSchema,
  reviewReportInputSchema,
  reviewTeamFinderReport,
  setListingHidden,
  setListingStatusInputSchema,
  setTeamFinderListingStatus,
  updateTeamFinderListing,
  updateTeamFinderListingInputSchema,
  type ListingMutationContext,
} from "./teamFinder";

export const TEAM_FINDER_DISCORD_REQUIRED_MESSAGE =
  "Sign in with Discord to use Team Finder.";

/**
 * Translate the plain Errors thrown by the feature module into tRPC errors so
 * the client receives meaningful messages and status codes.
 */
function toTrpcError(error: unknown): never {
  const message =
    error instanceof Error ? error.message : "Team Finder request failed.";

  if (message.includes("not found")) {
    throw new TRPCError({ code: "NOT_FOUND", message });
  }
  if (message.includes("permission")) {
    throw new TRPCError({ code: "FORBIDDEN", message });
  }
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

const mutationContext = (user: {
  id: number;
  role: string;
}): ListingMutationContext => ({
  userId: user.id,
  isAdmin: user.role === "admin",
});

const discordProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.discordId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: TEAM_FINDER_DISCORD_REQUIRED_MESSAGE,
    });
  }

  return next({ ctx });
});

export const teamFinderRouter = router({
  // --- Public board ---------------------------------------------------------
  list: publicProcedure
    .input(listTeamFinderListingsInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        return await listTeamFinderListings(input, ctx.user?.id ?? null);
      } catch (error) {
        toTrpcError(error);
      }
    }),

  getById: publicProcedure
    .input(listingIdInputSchema)
    .query(async ({ input, ctx }) => {
      try {
        const listing = await getTeamFinderListingById(
          input.id,
          ctx.user?.id ?? null,
          ctx.user?.role === "admin"
        );
        if (!listing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Listing not found.",
          });
        }
        return listing;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        toTrpcError(error);
      }
    }),

  // --- Owner actions --------------------------------------------------------
  myListings: discordProcedure.query(async ({ ctx }) => {
    try {
      return await listMyTeamFinderListings(ctx.user.id);
    } catch (error) {
      toTrpcError(error);
    }
  }),

  create: discordProcedure
    .input(createTeamFinderListingInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await createTeamFinderListing(input, ctx.user.id);
      } catch (error) {
        toTrpcError(error);
      }
    }),

  update: discordProcedure
    .input(updateTeamFinderListingInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await updateTeamFinderListing(input, mutationContext(ctx.user));
      } catch (error) {
        toTrpcError(error);
      }
    }),

  setStatus: discordProcedure
    .input(setListingStatusInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await setTeamFinderListingStatus(
          input.id,
          input.status,
          mutationContext(ctx.user)
        );
      } catch (error) {
        toTrpcError(error);
      }
    }),

  renew: discordProcedure
    .input(listingIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await renewTeamFinderListing(
          input.id,
          mutationContext(ctx.user)
        );
      } catch (error) {
        toTrpcError(error);
      }
    }),

  delete: discordProcedure
    .input(listingIdInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await deleteTeamFinderListing(
          input.id,
          mutationContext(ctx.user)
        );
      } catch (error) {
        toTrpcError(error);
      }
    }),

  // --- Reporting (any signed-in user) --------------------------------------
  report: discordProcedure
    .input(reportListingInputSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        return await createTeamFinderReport(input, ctx.user.id);
      } catch (error) {
        toTrpcError(error);
      }
    }),

  // --- Moderation (admin only) ---------------------------------------------
  admin: router({
    hide: adminProcedure
      .input(adminListingActionInputSchema)
      .mutation(async ({ input }) => {
        try {
          return await setListingHidden(input.id, true);
        } catch (error) {
          toTrpcError(error);
        }
      }),

    unhide: adminProcedure
      .input(adminListingActionInputSchema)
      .mutation(async ({ input }) => {
        try {
          return await setListingHidden(input.id, false);
        } catch (error) {
          toTrpcError(error);
        }
      }),

    listReports: adminProcedure.query(async () => {
      try {
        return await listTeamFinderReports();
      } catch (error) {
        toTrpcError(error);
      }
    }),

    reviewReport: adminProcedure
      .input(reviewReportInputSchema)
      .mutation(async ({ input }) => {
        try {
          return await reviewTeamFinderReport(input.id, input.status);
        } catch (error) {
          toTrpcError(error);
        }
      }),
  }),
});
