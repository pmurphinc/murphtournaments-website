import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { teamFinderListings, teamFinderReports, users } from "../drizzle/schema";

export const getTeamFinderListWhereClause = (isAdmin: boolean) =>
  isAdmin ? undefined : eq(teamFinderListings.hiddenByAdmin, 0);

export type TeamFinderListingInput = {
  listingType: "lft" | "lfp";
  platform: "PC" | "Console" | "Crossplay";
  region: "NA" | "EU" | "SA" | "OCE" | "Asia" | "MENA";
  availability: "Weeknights" | "Weekends" | "Flexible";
  preferredRole: "Light" | "Medium" | "Heavy" | "Flex";
  notes?: string | null;
};

export function deriveTeamFinderListingContent(input: TeamFinderListingInput, discordUsername: string | null | undefined) {
  const prefix = input.listingType.toUpperCase();
  const title = `${prefix} · ${input.platform} · ${input.region}`;
  const notes = input.notes?.trim();
  const description = notes && notes.length > 0
    ? notes
    : `${prefix === "LFT" ? "Player looking for a team" : "Team looking for players"} on ${input.platform} in ${input.region}. Available ${input.availability.toLowerCase()} and prefers ${input.preferredRole}. Message ${discordUsername ? `@${discordUsername}` : "them on Discord"} to coordinate.`;
  return { title, description, contact: discordUsername ? `Discord: @${discordUsername}` : "Discord" };
}

export function deriveDiscordUserId(openId: string | null | undefined) {
  if (!openId?.startsWith("discord:")) return null;
  const id = openId.slice("discord:".length);
  return /^\d+$/.test(id) ? id : null;
}

export async function listTeamFinderListings(isAdmin: boolean) {
  const db = await getDb();
  if (!db) return [];

  const query = db
    .select({
      id: teamFinderListings.id,
      userId: teamFinderListings.userId,
      listingType: teamFinderListings.listingType,
      title: teamFinderListings.title,
      description: teamFinderListings.description,
      platform: teamFinderListings.platform,
      region: teamFinderListings.region,
      availability: teamFinderListings.availability,
      preferredRole: teamFinderListings.preferredRole,
      contact: teamFinderListings.contact,
      hiddenByAdmin: teamFinderListings.hiddenByAdmin,
      createdAt: teamFinderListings.createdAt,
      updatedAt: teamFinderListings.updatedAt,
      discordDisplayName: users.discordDisplayName,
      discordUsername: users.discordUsername,
      openId: users.openId,
    })
    .from(teamFinderListings)
    .innerJoin(users, eq(teamFinderListings.userId, users.id))
    .orderBy(desc(teamFinderListings.createdAt));

  const where = getTeamFinderListWhereClause(isAdmin);
  const rows = await (where ? query.where(where) : query);
  return rows.map(({ openId, ...row }) => ({ ...row, discordUserId: deriveDiscordUserId(openId) }));
}

export async function createTeamFinderListing(userId: number, discordUsername: string | null | undefined, input: TeamFinderListingInput) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const content = deriveTeamFinderListingContent(input, discordUsername);
  await db.insert(teamFinderListings).values({ userId, ...input, title: content.title, description: content.description, contact: content.contact });
  const rows = await db.select().from(teamFinderListings).where(eq(teamFinderListings.userId, userId)).orderBy(desc(teamFinderListings.createdAt)).limit(1);
  return rows[0];
}

export async function updateTeamFinderListing(userId: number, discordUsername: string | null | undefined, listingId: number, input: TeamFinderListingInput) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [listing] = await db.select().from(teamFinderListings).where(eq(teamFinderListings.id, listingId)).limit(1);
  if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
  if (listing.userId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the listing owner can edit this listing" });
  const content = deriveTeamFinderListingContent(input, discordUsername);
  await db.update(teamFinderListings).set({ ...input, title: content.title, description: content.description, contact: content.contact }).where(eq(teamFinderListings.id, listingId));
  const [updated] = await db.select().from(teamFinderListings).where(eq(teamFinderListings.id, listingId)).limit(1);
  return updated;
}

export async function deleteTeamFinderListing(userId: number, listingId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  const [listing] = await db.select().from(teamFinderListings).where(eq(teamFinderListings.id, listingId)).limit(1);
  if (!listing) throw new TRPCError({ code: "NOT_FOUND", message: "Listing not found" });
  if (listing.userId !== userId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the listing owner can delete this listing" });
  await db.delete(teamFinderListings).where(and(eq(teamFinderListings.id, listingId), eq(teamFinderListings.userId, userId)));
  return { success: true } as const;
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
