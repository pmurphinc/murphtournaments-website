import { and, desc, eq, lte } from "drizzle-orm";
import { z } from "zod";
import {
  teamFinderListings,
  teamFinderReports,
  users,
  type InsertTeamFinderListing,
  type TeamFinderListing,
  type TeamFinderReport,
} from "../drizzle/schema";
import {
  FINALS_CLASSES,
  TEAM_FINDER_LIMITS,
  TEAM_FINDER_LISTING_TYPES,
  TEAM_FINDER_REGIONS,
  TEAM_FINDER_REPORT_REASONS,
  TEAM_FINDER_STATUSES,
  computeTeamFinderExpiry,
  parseMainClasses,
  serializeMainClasses,
  type FinalsClass,
  type TeamFinderListingType,
  type TeamFinderRegion,
  type TeamFinderStatus,
} from "../shared/teamFinder";
import { getDb } from "./db";

// ---------------------------------------------------------------------------
// Public-facing shapes
// ---------------------------------------------------------------------------

/**
 * A listing as exposed to the public board. The raw `mainClasses` string is
 * normalized into an array, and the owner is reduced to safe display fields so
 * we never leak emails, openIds, or Discord tokens to the browser.
 */
export type TeamFinderListingPublic = {
  id: number;
  listingType: TeamFinderListingType;
  status: TeamFinderStatus;
  region: TeamFinderRegion;
  targetTournament: string | null;
  description: string;
  embarkId: string | null;
  mainClasses: FinalsClass[];
  preferredRole: string | null;
  experience: string | null;
  availability: string | null;
  twitchUrl: string | null;
  youtubeUrl: string | null;
  teamName: string | null;
  rosterCount: number | null;
  neededClass: string | null;
  practiceAvailability: string | null;
  hiddenByAdmin: boolean;
  isExpired: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    displayName: string;
    discordUsername: string | null;
    discordAvatarUrl: string | null;
  };
  /** True only when the requester owns the listing. */
  isOwner: boolean;
};

type ListingRow = TeamFinderListing & {
  ownerName: string | null;
  ownerDiscordUsername: string | null;
  ownerDiscordAvatarUrl: string | null;
};

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const trimmedString = (max: number) =>
  z.string().trim().max(max, `Must be ${max} characters or fewer.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer.`)
    .optional()
    .transform(value => (value && value.length > 0 ? value : undefined));

/**
 * Validate an optional URL. Only http(s) URLs are accepted, and an optional
 * host allow-list narrows platform-specific links (Twitch / YouTube).
 */
const optionalUrl = (hosts?: string[]) =>
  z
    .string()
    .trim()
    .max(
      TEAM_FINDER_LIMITS.url,
      `Links must be ${TEAM_FINDER_LIMITS.url} characters or fewer.`
    )
    .optional()
    .transform(value => (value && value.length > 0 ? value : undefined))
    .superRefine((value, ctx) => {
      if (!value) return;
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Enter a valid URL." });
        return;
      }
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        ctx.addIssue({
          code: "custom",
          message: "Links must start with http:// or https://.",
        });
        return;
      }
      if (hosts && hosts.length > 0) {
        const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
        const allowed = hosts.some(
          allowedHost =>
            host === allowedHost || host.endsWith(`.${allowedHost}`)
        );
        if (!allowed) {
          ctx.addIssue({
            code: "custom",
            message: `Link must point to ${hosts.join(" or ")}.`,
          });
        }
      }
    });

const regionSchema = z.enum(TEAM_FINDER_REGIONS);
const statusSchema = z.enum(TEAM_FINDER_STATUSES);
const mainClassesSchema = z
  .array(z.enum(FINALS_CLASSES))
  .min(1, "Select at least one main class.")
  .max(FINALS_CLASSES.length);

/**
 * Lightweight anti-spam honeypot. The field is rendered hidden in the form, so
 * legitimate users always leave it empty; bots that fill every field are
 * rejected. Shared by create and update inputs.
 */
const honeypot = z
  .string()
  .optional()
  .transform(value => value ?? "")
  .refine(value => value.length === 0, {
    message: "Submission rejected.",
  });

const playerListingShape = {
  listingType: z.literal("player"),
  region: regionSchema,
  description: trimmedString(TEAM_FINDER_LIMITS.description).min(
    1,
    "A short description is required."
  ),
  targetTournament: optionalText(TEAM_FINDER_LIMITS.targetTournament),
  embarkId: trimmedString(TEAM_FINDER_LIMITS.embarkId).min(
    1,
    "Embark ID is required."
  ),
  mainClasses: mainClassesSchema,
  preferredRole: optionalText(TEAM_FINDER_LIMITS.preferredRole),
  experience: optionalText(TEAM_FINDER_LIMITS.experience),
  availability: optionalText(TEAM_FINDER_LIMITS.availability),
  twitchUrl: optionalUrl(["twitch.tv"]),
  youtubeUrl: optionalUrl(["youtube.com", "youtu.be"]),
  website: honeypot,
};

const teamListingShape = {
  listingType: z.literal("team"),
  region: regionSchema,
  description: trimmedString(TEAM_FINDER_LIMITS.description).min(
    1,
    "A short recruiting description is required."
  ),
  targetTournament: optionalText(TEAM_FINDER_LIMITS.targetTournament),
  teamName: trimmedString(TEAM_FINDER_LIMITS.teamName).min(
    1,
    "Team name is required."
  ),
  rosterCount: z
    .number()
    .int("Roster count must be a whole number.")
    .min(0, "Roster count cannot be negative.")
    .max(
      TEAM_FINDER_LIMITS.rosterCountMax,
      `Roster count must be ${TEAM_FINDER_LIMITS.rosterCountMax} or fewer.`
    ),
  neededClass: trimmedString(TEAM_FINDER_LIMITS.neededClass).min(
    1,
    "Specify the class or role you need."
  ),
  experience: optionalText(TEAM_FINDER_LIMITS.experience),
  practiceAvailability: optionalText(TEAM_FINDER_LIMITS.practiceAvailability),
  website: honeypot,
};

export const createTeamFinderListingInputSchema = z.discriminatedUnion(
  "listingType",
  [z.object(playerListingShape), z.object(teamListingShape)]
);

export type CreateTeamFinderListingInput = z.infer<
  typeof createTeamFinderListingInputSchema
>;

export const updateTeamFinderListingInputSchema = z.discriminatedUnion(
  "listingType",
  [
    z.object({ id: z.number().int().positive(), ...playerListingShape }),
    z.object({ id: z.number().int().positive(), ...teamListingShape }),
  ]
);

export type UpdateTeamFinderListingInput = z.infer<
  typeof updateTeamFinderListingInputSchema
>;

export const listTeamFinderListingsInputSchema = z
  .object({
    listingType: z.enum(TEAM_FINDER_LISTING_TYPES).optional(),
    region: regionSchema.optional(),
    mainClass: z.enum(FINALS_CLASSES).optional(),
    targetTournament: z.string().trim().max(120).optional(),
    includeInactive: z.boolean().optional().default(false),
  })
  .optional();

export type ListTeamFinderListingsInput = z.infer<
  typeof listTeamFinderListingsInputSchema
>;

export const listingIdInputSchema = z.object({
  id: z.number().int().positive(),
});

export const setListingStatusInputSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["active", "filled", "closed"] as const),
});

export const reportListingInputSchema = z.object({
  listingId: z.number().int().positive(),
  reason: z.enum(TEAM_FINDER_REPORT_REASONS),
  details: optionalText(TEAM_FINDER_LIMITS.reportDetails),
  website: honeypot,
});

export const adminListingActionInputSchema = z.object({
  id: z.number().int().positive(),
});

export const reviewReportInputSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["reviewed", "dismissed"] as const),
});

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const ownerDisplayName = (row: ListingRow): string => {
  if (row.ownerName && row.ownerName.length > 0) return row.ownerName;
  if (row.ownerDiscordUsername && row.ownerDiscordUsername.length > 0) {
    return row.ownerDiscordUsername;
  }
  return "Murph Tournaments Player";
};

function toPublicListing(
  row: ListingRow,
  viewerUserId: number | null
): TeamFinderListingPublic {
  const expiresAt =
    row.expiresAt instanceof Date ? row.expiresAt : new Date(row.expiresAt);
  const now = new Date();
  const isExpired =
    row.status === "expired" || expiresAt.getTime() <= now.getTime();

  return {
    id: row.id,
    listingType: row.listingType,
    status: row.status,
    region: row.region,
    targetTournament: row.targetTournament,
    description: row.description,
    embarkId: row.embarkId,
    mainClasses: parseMainClasses(row.mainClasses),
    preferredRole: row.preferredRole,
    experience: row.experience,
    availability: row.availability,
    twitchUrl: row.twitchUrl,
    youtubeUrl: row.youtubeUrl,
    teamName: row.teamName,
    rosterCount: row.rosterCount,
    neededClass: row.neededClass,
    practiceAvailability: row.practiceAvailability,
    hiddenByAdmin: row.hiddenByAdmin === 1,
    isExpired,
    expiresAt: expiresAt.toISOString(),
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : new Date(row.createdAt).toISOString(),
    updatedAt:
      row.updatedAt instanceof Date
        ? row.updatedAt.toISOString()
        : new Date(row.updatedAt).toISOString(),
    owner: {
      displayName: ownerDisplayName(row),
      discordUsername: row.ownerDiscordUsername,
      discordAvatarUrl: row.ownerDiscordAvatarUrl,
    },
    isOwner: viewerUserId != null && viewerUserId === row.ownerUserId,
  };
}

const listingSelection = {
  id: teamFinderListings.id,
  ownerUserId: teamFinderListings.ownerUserId,
  listingType: teamFinderListings.listingType,
  status: teamFinderListings.status,
  region: teamFinderListings.region,
  targetTournament: teamFinderListings.targetTournament,
  description: teamFinderListings.description,
  embarkId: teamFinderListings.embarkId,
  mainClasses: teamFinderListings.mainClasses,
  preferredRole: teamFinderListings.preferredRole,
  experience: teamFinderListings.experience,
  availability: teamFinderListings.availability,
  twitchUrl: teamFinderListings.twitchUrl,
  youtubeUrl: teamFinderListings.youtubeUrl,
  teamName: teamFinderListings.teamName,
  rosterCount: teamFinderListings.rosterCount,
  neededClass: teamFinderListings.neededClass,
  practiceAvailability: teamFinderListings.practiceAvailability,
  hiddenByAdmin: teamFinderListings.hiddenByAdmin,
  expiresAt: teamFinderListings.expiresAt,
  createdAt: teamFinderListings.createdAt,
  updatedAt: teamFinderListings.updatedAt,
  ownerName: users.name,
  ownerDiscordUsername: users.discordUsername,
  ownerDiscordAvatarUrl: users.discordAvatarUrl,
} as const;

function buildInsertValues(
  input: CreateTeamFinderListingInput,
  ownerUserId: number
): InsertTeamFinderListing {
  const base = {
    ownerUserId,
    listingType: input.listingType,
    status: "active" as const,
    region: input.region,
    targetTournament: input.targetTournament ?? null,
    description: input.description,
    expiresAt: computeTeamFinderExpiry(),
  };

  if (input.listingType === "player") {
    return {
      ...base,
      embarkId: input.embarkId,
      mainClasses: serializeMainClasses(input.mainClasses),
      preferredRole: input.preferredRole ?? null,
      experience: input.experience ?? null,
      availability: input.availability ?? null,
      twitchUrl: input.twitchUrl ?? null,
      youtubeUrl: input.youtubeUrl ?? null,
    };
  }

  return {
    ...base,
    teamName: input.teamName,
    rosterCount: input.rosterCount,
    neededClass: input.neededClass,
    experience: input.experience ?? null,
    practiceAvailability: input.practiceAvailability ?? null,
  };
}

// ---------------------------------------------------------------------------
// Auto-expiry sweep
// ---------------------------------------------------------------------------

/**
 * Flip any active-but-past-expiry listings to "expired". Run opportunistically
 * before listing queries so the public board never shows stale-open listings,
 * even without a background scheduler.
 */
export async function expireOverdueListings(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(teamFinderListings)
    .set({ status: "expired" })
    .where(
      and(
        eq(teamFinderListings.status, "active"),
        lte(teamFinderListings.expiresAt, new Date())
      )
    );
}

// ---------------------------------------------------------------------------
// Queries / mutations
// ---------------------------------------------------------------------------

export async function listTeamFinderListings(
  input: ListTeamFinderListingsInput,
  viewerUserId: number | null
): Promise<TeamFinderListingPublic[]> {
  await expireOverdueListings();

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  const filters = [eq(teamFinderListings.hiddenByAdmin, 0)];

  if (input?.listingType) {
    filters.push(eq(teamFinderListings.listingType, input.listingType));
  }
  if (input?.region) {
    filters.push(eq(teamFinderListings.region, input.region));
  }
  if (input?.targetTournament) {
    filters.push(
      eq(teamFinderListings.targetTournament, input.targetTournament)
    );
  }
  if (!input?.includeInactive) {
    filters.push(eq(teamFinderListings.status, "active"));
  }

  const rows = (await db
    .select(listingSelection)
    .from(teamFinderListings)
    .innerJoin(users, eq(teamFinderListings.ownerUserId, users.id))
    .where(and(...filters))
    .orderBy(desc(teamFinderListings.createdAt))) as ListingRow[];

  const mainClass = input?.mainClass;

  return rows
    .map(row => toPublicListing(row, viewerUserId))
    .filter(listing => {
      if (!mainClass) return true;
      if (listing.listingType === "player") {
        return listing.mainClasses.includes(mainClass);
      }
      // Team listings match the class filter via their "needed class" text.
      return (
        listing.neededClass?.toLowerCase().includes(mainClass.toLowerCase()) ??
        false
      );
    });
}

export async function listMyTeamFinderListings(
  ownerUserId: number
): Promise<TeamFinderListingPublic[]> {
  await expireOverdueListings();

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  const rows = (await db
    .select(listingSelection)
    .from(teamFinderListings)
    .innerJoin(users, eq(teamFinderListings.ownerUserId, users.id))
    .where(eq(teamFinderListings.ownerUserId, ownerUserId))
    .orderBy(desc(teamFinderListings.createdAt))) as ListingRow[];

  return rows.map(row => toPublicListing(row, ownerUserId));
}

async function getListingRow(id: number): Promise<ListingRow | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  const rows = (await db
    .select(listingSelection)
    .from(teamFinderListings)
    .innerJoin(users, eq(teamFinderListings.ownerUserId, users.id))
    .where(eq(teamFinderListings.id, id))
    .limit(1)) as ListingRow[];

  return rows[0];
}

export async function getTeamFinderListingById(
  id: number,
  viewerUserId: number | null,
  isAdmin: boolean
): Promise<TeamFinderListingPublic | null> {
  const row = await getListingRow(id);
  if (!row) return null;

  // Hidden listings are only visible to their owner or an admin.
  if (row.hiddenByAdmin === 1 && !isAdmin && row.ownerUserId !== viewerUserId) {
    return null;
  }

  return toPublicListing(row, viewerUserId);
}

async function getOwnerUserId(id: number): Promise<number | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  const rows = await db
    .select({ ownerUserId: teamFinderListings.ownerUserId })
    .from(teamFinderListings)
    .where(eq(teamFinderListings.id, id))
    .limit(1);

  return rows[0]?.ownerUserId;
}

async function getListingOwnershipAndType(
  id: number
): Promise<
  { ownerUserId: number; listingType: TeamFinderListingType } | undefined
> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  const rows = await db
    .select({
      ownerUserId: teamFinderListings.ownerUserId,
      listingType: teamFinderListings.listingType,
    })
    .from(teamFinderListings)
    .where(eq(teamFinderListings.id, id))
    .limit(1);

  return rows[0];
}

export type ListingMutationContext = {
  userId: number;
  isAdmin: boolean;
};

/** Throws if the listing does not exist or the actor may not modify it. */
async function assertCanModify(
  id: number,
  ctx: ListingMutationContext
): Promise<void> {
  const ownerUserId = await getOwnerUserId(id);
  if (ownerUserId === undefined) {
    throw new Error("Listing not found.");
  }
  if (!ctx.isAdmin && ownerUserId !== ctx.userId) {
    throw new Error("You do not have permission to modify this listing.");
  }
}

/** Throws if an update attempts to turn a player listing into a team listing, or vice versa. */
async function assertListingTypeUnchanged(
  id: number,
  nextListingType: TeamFinderListingType
): Promise<void> {
  const existing = await getListingOwnershipAndType(id);
  if (!existing) {
    throw new Error("Listing not found.");
  }
  if (existing.listingType !== nextListingType) {
    throw new Error("Listing type cannot be changed after posting.");
  }
}

export async function createTeamFinderListing(
  input: CreateTeamFinderListingInput,
  ownerUserId: number
): Promise<TeamFinderListingPublic> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  const values = buildInsertValues(input, ownerUserId);
  const result = await db.insert(teamFinderListings).values(values);
  const insertId = Number((result as unknown as { insertId: number }).insertId);

  const row = await getListingRow(insertId);
  if (!row) {
    throw new Error("Failed to load the created listing.");
  }
  return toPublicListing(row, ownerUserId);
}

export async function updateTeamFinderListing(
  input: UpdateTeamFinderListingInput,
  ctx: ListingMutationContext
): Promise<TeamFinderListingPublic> {
  await assertCanModify(input.id, ctx);
  await assertListingTypeUnchanged(input.id, input.listingType);

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  const shared = {
    region: input.region,
    description: input.description,
    targetTournament: input.targetTournament ?? null,
  };

  const update =
    input.listingType === "player"
      ? {
          ...shared,
          listingType: "player" as const,
          embarkId: input.embarkId,
          mainClasses: serializeMainClasses(input.mainClasses),
          preferredRole: input.preferredRole ?? null,
          experience: input.experience ?? null,
          availability: input.availability ?? null,
          twitchUrl: input.twitchUrl ?? null,
          youtubeUrl: input.youtubeUrl ?? null,
        }
      : {
          ...shared,
          listingType: "team" as const,
          teamName: input.teamName,
          rosterCount: input.rosterCount,
          neededClass: input.neededClass,
          experience: input.experience ?? null,
          practiceAvailability: input.practiceAvailability ?? null,
        };

  await db
    .update(teamFinderListings)
    .set(update)
    .where(eq(teamFinderListings.id, input.id));

  const row = await getListingRow(input.id);
  if (!row) {
    throw new Error("Listing not found.");
  }
  return toPublicListing(row, ctx.userId);
}

export async function setTeamFinderListingStatus(
  id: number,
  status: Extract<TeamFinderStatus, "active" | "filled" | "closed">,
  ctx: ListingMutationContext
): Promise<TeamFinderListingPublic> {
  await assertCanModify(id, ctx);

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  await db
    .update(teamFinderListings)
    .set({ status })
    .where(eq(teamFinderListings.id, id));

  const row = await getListingRow(id);
  if (!row) {
    throw new Error("Listing not found.");
  }
  return toPublicListing(row, ctx.userId);
}

/** Renew an owner's listing: reactivate and reset the 30-day expiry window. */
export async function renewTeamFinderListing(
  id: number,
  ctx: ListingMutationContext
): Promise<TeamFinderListingPublic> {
  await assertCanModify(id, ctx);

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  await db
    .update(teamFinderListings)
    .set({ status: "active", expiresAt: computeTeamFinderExpiry() })
    .where(eq(teamFinderListings.id, id));

  const row = await getListingRow(id);
  if (!row) {
    throw new Error("Listing not found.");
  }
  return toPublicListing(row, ctx.userId);
}

export async function deleteTeamFinderListing(
  id: number,
  ctx: ListingMutationContext
): Promise<{ success: true }> {
  await assertCanModify(id, ctx);

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  await db.delete(teamFinderListings).where(eq(teamFinderListings.id, id));
  return { success: true };
}

// --- Moderation (admin only) ------------------------------------------------

export async function setListingHidden(
  id: number,
  hidden: boolean
): Promise<TeamFinderListingPublic> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder listings.");
  }

  const ownerUserId = await getOwnerUserId(id);
  if (ownerUserId === undefined) {
    throw new Error("Listing not found.");
  }

  await db
    .update(teamFinderListings)
    .set({ hiddenByAdmin: hidden ? 1 : 0 })
    .where(eq(teamFinderListings.id, id));

  const row = await getListingRow(id);
  if (!row) {
    throw new Error("Listing not found.");
  }
  return toPublicListing(row, null);
}

// --- Reports ----------------------------------------------------------------

export async function createTeamFinderReport(
  input: z.infer<typeof reportListingInputSchema>,
  reporterUserId: number
): Promise<{ success: true }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder reports.");
  }

  const ownerUserId = await getOwnerUserId(input.listingId);
  if (ownerUserId === undefined) {
    throw new Error("Listing not found.");
  }

  await db.insert(teamFinderReports).values({
    listingId: input.listingId,
    reporterUserId,
    reason: input.reason,
    details: input.details ?? null,
    status: "open",
  });

  return { success: true };
}

export type TeamFinderReportAdminRecord = TeamFinderReport & {
  listingTitle: string;
};

export async function listTeamFinderReports(): Promise<
  TeamFinderReportAdminRecord[]
> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder reports.");
  }

  const rows = await db
    .select({
      id: teamFinderReports.id,
      listingId: teamFinderReports.listingId,
      reporterUserId: teamFinderReports.reporterUserId,
      reason: teamFinderReports.reason,
      details: teamFinderReports.details,
      status: teamFinderReports.status,
      createdAt: teamFinderReports.createdAt,
      updatedAt: teamFinderReports.updatedAt,
      listingType: teamFinderListings.listingType,
      teamName: teamFinderListings.teamName,
      embarkId: teamFinderListings.embarkId,
    })
    .from(teamFinderReports)
    .innerJoin(
      teamFinderListings,
      eq(teamFinderReports.listingId, teamFinderListings.id)
    )
    .orderBy(desc(teamFinderReports.createdAt));

  return rows.map(row => ({
    id: row.id,
    listingId: row.listingId,
    reporterUserId: row.reporterUserId,
    reason: row.reason,
    details: row.details,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    listingTitle:
      row.listingType === "team"
        ? (row.teamName ?? `Team listing #${row.listingId}`)
        : (row.embarkId ?? `Player listing #${row.listingId}`),
  }));
}

export async function reviewTeamFinderReport(
  id: number,
  status: Extract<TeamFinderReport["status"], "reviewed" | "dismissed">
): Promise<{ success: true }> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available for Team Finder reports.");
  }

  await db
    .update(teamFinderReports)
    .set({ status })
    .where(eq(teamFinderReports.id, id));

  return { success: true };
}
