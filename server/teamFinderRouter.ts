import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { isDiscordAuthenticatedUser } from "./_core/discordOAuth";
import { canViewHiddenTeamFinderListings } from "../shared/teamFinderVisibility";
import {
  createTeamFinderListing,
  deleteTeamFinderListing,
  listTeamFinderListings,
  reportTeamFinderListing,
  setTeamFinderListingHidden,
  updateTeamFinderListing,
} from "./teamFinder";

const discordProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!isDiscordAuthenticatedUser(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Team Finder posting requires Discord sign-in" });
  }
  return next({ ctx });
});

const listingInputSchema = z.object({
  listingType: z.enum(["lft", "lfp"]),
  platform: z.enum(["PC", "Console", "Crossplay"]),
  region: z.enum(["NA", "EU", "SA", "OCE", "Asia", "MENA"]),
  availability: z.enum(["Weeknights", "Weekends", "Flexible"]),
  preferredRole: z.enum(["Light", "Medium", "Heavy", "Flex"]),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const teamFinderRouter = router({
  list: publicProcedure.query(({ ctx }) =>
    listTeamFinderListings(canViewHiddenTeamFinderListings(ctx.user?.role))
  ),
  create: discordProcedure.input(listingInputSchema).mutation(({ ctx, input }) =>
    createTeamFinderListing(ctx.user.id, ctx.user.discordUsername, input)
  ),
  update: discordProcedure
    .input(listingInputSchema.extend({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) => {
      const { id, ...listingInput } = input;
      return updateTeamFinderListing(ctx.user.id, ctx.user.discordUsername, id, listingInput);
    }),
  delete: discordProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(({ ctx, input }) => deleteTeamFinderListing(ctx.user.id, input.id)),
  report: discordProcedure
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
