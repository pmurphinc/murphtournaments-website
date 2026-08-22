/**
 * Shared constants for the Wormhole Arcade integration.
 *
 * The arcade is a separate deployment (wormhole.murphtournaments.com) with no
 * database of its own. Anyone can play it immediately as a guest; signing in
 * with Discord is offered only after a run, purely to save the score here.
 */

/** Slug stored on every `arcade_scores` row, so a second game can share the table. */
export const ARCADE_GAME_SLUG = "wormhole";

/** Where the playable game lives. */
export const ARCADE_PUBLIC_URL = "https://wormhole.murphtournaments.com";

/** Default and maximum number of rows a leaderboard request may return. */
export const ARCADE_LEADERBOARD_DEFAULT_LIMIT = 10;
export const ARCADE_LEADERBOARD_MAX_LIMIT = 50;

/**
 * Upper bound on an accepted score. Scores are reported by the browser and are
 * therefore trusted; this is only an absurdity guard, not anti-cheat.
 */
export const ARCADE_MAX_SCORE = 10_000_000;

/** Upper bound on an accepted run length, so a stuck clock cannot store nonsense. */
export const ARCADE_MAX_DURATION_SECONDS = 24 * 60 * 60;

export type ArcadeOutcome = "victory" | "defeat";

export type ArcadeLeaderboardEntry = {
  rank: number;
  displayName: string;
  discordUsername: string | null;
  discordAvatarUrl: string | null;
  bestScore: number;
  runs: number;
  lastPlayed: string | null;
};

export type ArcadeSessionResponse = {
  signedIn: boolean;
  player: {
    displayName: string;
    discordUsername: string | null;
    discordAvatarUrl: string | null;
    bestScore: number;
    runs: number;
    rank: number | null;
  } | null;
};

export type ArcadeScoreSubmission = {
  score: number;
  outcome: ArcadeOutcome;
  ship?: string;
  rivalHealth?: number;
  durationSeconds?: number;
};
