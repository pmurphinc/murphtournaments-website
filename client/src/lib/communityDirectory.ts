import { trpc } from "@/lib/trpc";
import type { TournamentCardData } from "@/components/public/TournamentCard";

/**
 * Status labels are derived only from fields the real `communityTournaments`
 * router actually returns (`eventStatus`, `registrationOpen`) — there is no
 * "upcoming/live/completed/archived" enum in the schema, so we compute one
 * instead of inventing a field that doesn't exist server-side.
 */
export type TournamentDiscoveryStatus =
  | "live"
  | "registration-open"
  | "upcoming"
  | "completed";

export interface TournamentStatusInput {
  eventStatus: "not-live" | "live" | "complete";
  registrationOpen: number;
}

export function getTournamentDiscoveryStatus(
  tournament: TournamentStatusInput
): TournamentDiscoveryStatus {
  if (tournament.eventStatus === "live") return "live";
  if (tournament.eventStatus === "complete") return "completed";
  if (tournament.registrationOpen === 1) return "registration-open";
  return "upcoming";
}

export const TOURNAMENT_STATUS_LABEL: Record<
  TournamentDiscoveryStatus,
  string
> = {
  live: "Live",
  "registration-open": "Registration Open",
  upcoming: "Upcoming",
  completed: "Completed",
};

interface RealCommunityTournament {
  id: number;
  name: string;
  eventStatus: "not-live" | "live" | "complete";
  registrationOpen: number;
  eventNote: string | null;
  publicSlug: string | null;
  maxTeams: number | null;
  publishedAt: string | Date | null;
}

function formatPublishedDate(
  publishedAt: string | Date | null
): string | undefined {
  if (!publishedAt) return undefined;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return `Published ${date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}`;
}

function toCardData(tournament: RealCommunityTournament): TournamentCardData {
  const status = getTournamentDiscoveryStatus(tournament);
  return {
    id: tournament.id,
    name: tournament.name,
    status,
    dateLabel: formatPublishedDate(tournament.publishedAt),
    note: tournament.eventNote ?? undefined,
    teamsLabel: tournament.maxTeams
      ? `Up to ${tournament.maxTeams} teams`
      : undefined,
    href: tournament.publicSlug
      ? `/tournaments/community/${tournament.publicSlug}`
      : "/tournaments/community",
    actionLabel:
      status === "registration-open" ? "View & Register" : "View Details",
  };
}

export interface CommunityDirectory {
  cards: TournamentCardData[];
  isLoading: boolean;
  /** True once loaded with zero results — includes the case where the
   * database isn't configured, since the backend degrades that to an empty
   * list (server/tournamentControl.ts `listCommunityTournaments`) rather than
   * throwing. There is no reliable way to distinguish "no database" from
   * "genuinely zero published tournaments" from the client, and there
   * shouldn't need to be — both are honestly represented as "nothing to
   * show right now." */
  isEmpty: boolean;
  /** Set only for a genuine, unexpected query failure (not the DB-unavailable
   * case, which the backend already turns into an empty list). */
  errorMessage: string | null;
}

/**
 * Single source of truth for reading the public tournament directory
 * (`communityTournaments.list`). Used by the homepage teaser and the full
 * discovery page so both render identical real states — no sample or
 * fallback content; production always reflects the actual directory.
 */
export function useCommunityDirectory(): CommunityDirectory {
  // retry: false — an unexpected failure here is deterministic (bad query,
  // real outage), not transient network flakiness, so show it immediately
  // instead of retrying with backoff.
  const query = trpc.communityTournaments.list.useQuery(undefined, {
    retry: false,
  });
  const cards = (query.data ?? []).map(toCardData);

  return {
    cards,
    isLoading: query.isLoading,
    isEmpty: !query.isLoading && !query.error && cards.length === 0,
    errorMessage: query.error
      ? "Could not load the tournament directory right now."
      : null,
  };
}
