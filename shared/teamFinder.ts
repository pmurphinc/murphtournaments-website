/**
 * Shared Team Finder constants and types.
 *
 * Centralizing the enums here keeps the server Zod schemas, the Drizzle table,
 * and the client filter/forms in agreement without duplicating string unions.
 */

export const TEAM_FINDER_LISTING_TYPES = ["player", "team"] as const;
export type TeamFinderListingType = (typeof TEAM_FINDER_LISTING_TYPES)[number];

export const TEAM_FINDER_STATUSES = [
  "active",
  "filled",
  "closed",
  "expired",
] as const;
export type TeamFinderStatus = (typeof TEAM_FINDER_STATUSES)[number];

export const TEAM_FINDER_REGIONS = [
  "NA",
  "EU",
  "SA",
  "ASIA",
  "OCE",
  "MENA",
  "GLOBAL",
] as const;
export type TeamFinderRegion = (typeof TEAM_FINDER_REGIONS)[number];

export const TEAM_FINDER_REGION_LABELS: Record<TeamFinderRegion, string> = {
  NA: "North America",
  EU: "Europe",
  SA: "South America",
  ASIA: "Asia",
  OCE: "Oceania",
  MENA: "Middle East / N. Africa",
  GLOBAL: "Global / Any",
};

export const FINALS_CLASSES = ["Light", "Medium", "Heavy"] as const;
export type FinalsClass = (typeof FINALS_CLASSES)[number];

export const TEAM_FINDER_REPORT_REASONS = [
  "spam",
  "inappropriate",
  "scam",
  "impersonation",
  "other",
] as const;
export type TeamFinderReportReason =
  (typeof TEAM_FINDER_REPORT_REASONS)[number];

export const TEAM_FINDER_REPORT_REASON_LABELS: Record<
  TeamFinderReportReason,
  string
> = {
  spam: "Spam or advertising",
  inappropriate: "Inappropriate content",
  scam: "Scam or misleading",
  impersonation: "Impersonation",
  other: "Other",
};

export const TEAM_FINDER_REPORT_STATUSES = [
  "open",
  "reviewed",
  "dismissed",
] as const;
export type TeamFinderReportStatus =
  (typeof TEAM_FINDER_REPORT_STATUSES)[number];

/** Listings live for 30 days from creation or last renewal. */
export const TEAM_FINDER_LISTING_TTL_DAYS = 30;
export const TEAM_FINDER_LISTING_TTL_MS =
  TEAM_FINDER_LISTING_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Field length limits, shared so client and server stay aligned. */
export const TEAM_FINDER_LIMITS = {
  description: 600,
  embarkId: 64,
  preferredRole: 120,
  experience: 240,
  availability: 240,
  url: 256,
  teamName: 120,
  neededClass: 120,
  practiceAvailability: 240,
  targetTournament: 120,
  reportDetails: 600,
  rosterCountMax: 10,
} as const;

/**
 * Compute the expiry timestamp for a listing created/renewed at `from`.
 */
export function computeTeamFinderExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + TEAM_FINDER_LISTING_TTL_MS);
}

/**
 * A listing is considered expired when its status is "expired" or its expiry
 * timestamp is in the past. Centralized so both layers agree on "open" status.
 */
export function isTeamFinderListingExpired(
  status: TeamFinderStatus,
  expiresAt: Date | string,
  now: Date = new Date()
): boolean {
  if (status === "expired") return true;
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() <= now.getTime();
}

/** Parse the comma-separated main class storage value into an array. */
export function parseMainClasses(
  value: string | null | undefined
): FinalsClass[] {
  if (!value) return [];
  return value
    .split(",")
    .map(part => part.trim())
    .filter((part): part is FinalsClass =>
      (FINALS_CLASSES as readonly string[]).includes(part)
    );
}

/** Serialize a set of main classes for storage in a single column. */
export function serializeMainClasses(values: readonly FinalsClass[]): string {
  const unique = FINALS_CLASSES.filter(cls => values.includes(cls));
  return unique.join(",");
}
