import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { canViewHiddenTeamFinderListings } from "../shared/teamFinderVisibility";
import {
  createTeamFinderListing,
  listTeamFinderListings,
  reportTeamFinderListing,
  setTeamFinderListingHidden,
  updateTeamFinderListing,
} from "./teamFinder";

const listingInputSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  platform: z.string().trim().max(64).optional().nullable(),
  region: z.string().trim().max(64).optional().nullable(),
  availability: z.string().trim().max(255).optional().nullable(),
  contact: z.string().trim().max(255).optional().nullable(),
});

export const teamFinderRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    listTeamFinderListings(canViewHiddenTeamFinderListings(ctx.user?.role))
  ),
  create: protectedProcedure.input(listingInputSchema).mutation(({ ctx, input }) =>
    createTeamFinderListing(ctx.user.id, input)
  ),
  update: protectedProcedure
    .input(listingInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) => {
      const { id, ...listingInput } = input;
      return updateTeamFinderListing(ctx.user.id, id, listingInput);
    }),
  report: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), reason: z.string().trim().min(5).max(1000) }))
    .mutation(({ ctx, input }) =>
      reportTeamFinderListing(ctx.user.id, input.id, input.reason)
    ),
  setHidden: adminProcedure
    .input(z.object({ id: z.number().int().positive(), hiddenByAdmin: z.boolean() }))
    .mutation(({ input }) =>
      setTeamFinderListingHidden(input.id, input.hiddenByAdmin)
    ),
});
