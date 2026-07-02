import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { teamFinderListings, teamFinderReports } from "../drizzle/schema";

export const getTeamFinderListWhereClause = (isAdmin: boolean) =>
  isAdmin ? undefined : eq(teamFinderListings.hiddenByAdmin, 0);

export type TeamFinderListingInput = {
  title: string;
  description: string;
  platform?: string | null;
  region?: string | null;
  availability?: string | null;
  contact?: string | null;
};

export async function listTeamFinderListings(isAdmin: boolean) {
  const db = await getDb();
  if (!db) return [];

  const query = db
    .select({
      id: teamFinderListings.id,
      userId: teamFinderListings.userId,
      title: teamFinderListings.title,
      description: teamFinderListings.description,
      platform: teamFinderListings.platform,
      region: teamFinderListings.region,
      availability: teamFinderListings.availability,
      contact: teamFinderListings.contact,
      hiddenByAdmin: teamFinderListings.hiddenByAdmin,
      createdAt: teamFinderListings.createdAt,
      updatedAt: teamFinderListings.updatedAt,
    })
    .from(teamFinderListings)
    .orderBy(desc(teamFinderListings.createdAt));

  const where = getTeamFinderListWhereClause(isAdmin);
  return where ? query.where(where) : query;
}

export async function createTeamFinderListing(userId: number, input: TeamFinderListingInput) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  await db.insert(teamFinderListings).values({ userId, ...input });
  const rows = await db.select().from(teamFinderListings).where(eq(teamFinderListings.userId, userId)).orderBy(desc(teamFinderListings.createdAt)).limit(1);
  return rows[0];
}

export async function updateTeamFinderListing(userId: number, listingId: number, input: TeamFinderListingInput) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [listing] = await db.select().from(teamFinderListings).where(eq(teamFinderListings.id, listingId)).limit(1);
  if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
  if (listing.userId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the listing owner can edit this listing" });
  await db.update(teamFinderListings).set(input).where(eq(teamFinderListings.id, listingId));
  const [updated] = await db.select().from(teamFinderListings).where(eq(teamFinderListings.id, listingId)).limit(1);
  return updated;
}

export async function reportTeamFinderListing(userId: number, listingId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [listing] = await db.select().from(teamFinderListings).where(eq(teamFinderListings.id, listingId)).limit(1);
  if (!listing || listing.hiddenByAdmin) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
  if (listing.userId === userId) throw new TRPCError({ code: "FORBIDDEN", message: "You cannot report your own listing" });
  await db.insert(teamFinderReports).values({ listingId, reporterUserId: userId, reason }).onDuplicateKeyUpdate({ set: { reason } });
  return { success: true } as const;
}

export async function setTeamFinderListingHidden(listingId: number, hiddenByAdmin: boolean) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  await db.update(teamFinderListings).set({ hiddenByAdmin: hiddenByAdmin ? 1 : 0 }).where(eq(teamFinderListings.id, listingId));
  const [updated] = await db.select().from(teamFinderListings).where(eq(teamFinderListings.id, listingId)).limit(1);
  if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
  return updated;
}
