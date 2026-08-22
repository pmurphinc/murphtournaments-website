import type { Express, Request, Response } from "express";
import { z } from "zod";
import {
  ARCADE_GAME_SLUG,
  ARCADE_LEADERBOARD_DEFAULT_LIMIT,
  ARCADE_LEADERBOARD_MAX_LIMIT,
  ARCADE_MAX_DURATION_SECONDS,
  ARCADE_MAX_SCORE,
  ARCADE_PUBLIC_URL,
  type ArcadeLeaderboardEntry,
  type ArcadeSessionResponse,
} from "@shared/arcade";
import * as db from "./db";
import { sdk } from "./_core/sdk";

/**
 * Wormhole Arcade endpoints.
 *
 * These are plain REST rather than tRPC because the arcade is served from a
 * different origin: a small hand-written surface can be opened cross-origin to
 * exactly one allowlisted host, whereas mounting CORS on `/api/trpc` would
 * expose every procedure on the site.
 *
 * Scores arrive from the browser and are therefore trusted. That is the
 * accepted trade for a leaderboard that costs a player nothing to join; the
 * checks below are plausibility bounds, not anti-cheat.
 */

const DEFAULT_ARCADE_ORIGINS = [ARCADE_PUBLIC_URL];

function normalizeOrigin(value: string) {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

/**
 * Allowlisted browser origins. `ARCADE_ALLOWED_ORIGINS` is a comma-separated
 * override so a local arcade build (http://localhost:5173) can be added without
 * a code change; the production arcade is always allowed.
 */
export function getArcadeAllowedOrigins(
  raw: string | undefined = process.env.ARCADE_ALLOWED_ORIGINS
) {
  const configured = (raw ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter((origin): origin is string => Boolean(origin));

  return new Set([...DEFAULT_ARCADE_ORIGINS, ...configured]);
}

export function isAllowedArcadeOrigin(
  origin: string | undefined,
  allowed = getArcadeAllowedOrigins()
) {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  return Boolean(normalized && allowed.has(normalized));
}

/**
 * Returns false when the request carries a cross-origin `Origin` header that is
 * not allowlisted. Same-origin requests (the site's own /arcade page) send no
 * `Origin` on a GET and are always permitted.
 */
function applyArcadeCors(req: Request, res: Response) {
  const origin = req.headers.origin;
  res.setHeader("Vary", "Origin");

  if (!origin) return true;
  if (!isAllowedArcadeOrigin(origin)) return false;

  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Max-Age", "600");
  return true;
}

async function getDiscordUser(req: Request) {
  try {
    const user = await sdk.authenticateRequest(req);
    return user.loginMethod === "discord" ? user : null;
  } catch {
    return null;
  }
}

const submissionSchema = z.object({
  score: z.number().int().min(0).max(ARCADE_MAX_SCORE),
  outcome: z.enum(["victory", "defeat"]),
  ship: z.string().trim().min(1).max(64).optional(),
  rivalHealth: z.number().int().min(0).max(100).optional(),
  durationSeconds: z
    .number()
    .int()
    .min(0)
    .max(ARCADE_MAX_DURATION_SECONDS)
    .optional(),
});

/**
 * Per-user submission throttle. In-memory on purpose: a lost counter after a
 * restart costs nothing, and the leaderboard is not worth a datastore round
 * trip on every save.
 */
const SUBMIT_WINDOW_MS = 10 * 60 * 1000;
const SUBMIT_LIMIT = 40;
const submissionTimes = new Map<number, number[]>();

export function isRateLimited(userId: number, now = Date.now()) {
  const recent = (submissionTimes.get(userId) ?? []).filter(
    time => now - time < SUBMIT_WINDOW_MS
  );

  if (recent.length >= SUBMIT_LIMIT) {
    submissionTimes.set(userId, recent);
    return true;
  }

  recent.push(now);
  submissionTimes.set(userId, recent);
  return false;
}

function parseLimit(value: unknown) {
  const parsed =
    typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) return ARCADE_LEADERBOARD_DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), ARCADE_LEADERBOARD_MAX_LIMIT);
}

export async function readArcadeLeaderboard(
  limit: number
): Promise<ArcadeLeaderboardEntry[]> {
  const rows = await db.getArcadeLeaderboard(ARCADE_GAME_SLUG, limit);
  return rows.map(row => ({
    rank: row.rank,
    displayName: row.displayName,
    discordUsername: row.discordUsername,
    discordAvatarUrl: row.discordAvatarUrl,
    bestScore: row.bestScore,
    runs: row.runs,
    lastPlayed: row.lastPlayed ? row.lastPlayed.toISOString() : null,
  }));
}

export function registerArcadeRoutes(app: Express) {
  app.options("/api/arcade/*", (req: Request, res: Response) => {
    if (!applyArcadeCors(req, res)) {
      res.status(403).end();
      return;
    }
    res.status(204).end();
  });

  // Who the arcade is talking to, and how they currently stand. Always 200 —
  // "nobody is signed in" is a normal answer, not an error, because the game
  // must keep working either way.
  app.get("/api/arcade/session", async (req: Request, res: Response) => {
    if (!applyArcadeCors(req, res)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    const user = await getDiscordUser(req);
    if (!user) {
      res.json({
        signedIn: false,
        player: null,
      } satisfies ArcadeSessionResponse);
      return;
    }

    try {
      const standing = await db.getArcadePlayerStanding(
        user.id,
        ARCADE_GAME_SLUG
      );
      res.json({
        signedIn: true,
        player: {
          displayName:
            user.discordDisplayName ||
            user.name ||
            user.discordUsername ||
            "Pilot",
          discordUsername: user.discordUsername ?? null,
          discordAvatarUrl: user.discordAvatarUrl ?? null,
          bestScore: standing?.bestScore ?? 0,
          runs: standing?.runs ?? 0,
          rank: standing?.rank ?? null,
        },
      } satisfies ArcadeSessionResponse);
    } catch (error) {
      console.error("[Arcade] Failed to read session standing", error);
      res.status(500).json({ error: "Could not read your arcade profile." });
    }
  });

  app.get("/api/arcade/leaderboard", async (req: Request, res: Response) => {
    if (!applyArcadeCors(req, res)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    try {
      const entries = await readArcadeLeaderboard(parseLimit(req.query.limit));
      res.json({ entries });
    } catch (error) {
      console.error("[Arcade] Failed to read leaderboard", error);
      res.status(500).json({ error: "Could not load the leaderboard." });
    }
  });

  app.post("/api/arcade/scores", async (req: Request, res: Response) => {
    if (!applyArcadeCors(req, res)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }

    const user = await getDiscordUser(req);
    if (!user) {
      res.status(401).json({ error: "Sign in with Discord to save a score." });
      return;
    }

    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "That score could not be read." });
      return;
    }

    if (isRateLimited(user.id)) {
      res
        .status(429)
        .json({ error: "Too many scores saved just now — try again shortly." });
      return;
    }

    try {
      const saved = await db.recordArcadeScore({
        userId: user.id,
        game: ARCADE_GAME_SLUG,
        score: parsed.data.score,
        ship: parsed.data.ship ?? null,
        outcome: parsed.data.outcome,
        rivalHealth: parsed.data.rivalHealth ?? 0,
        durationSeconds: parsed.data.durationSeconds ?? 0,
      });

      if (!saved) {
        res.status(503).json({ error: "Scores are unavailable right now." });
        return;
      }

      const standing = await db.getArcadePlayerStanding(
        user.id,
        ARCADE_GAME_SLUG
      );
      res.status(201).json({
        saved: true,
        bestScore: standing?.bestScore ?? parsed.data.score,
        runs: standing?.runs ?? 1,
        rank: standing?.rank ?? null,
      });
    } catch (error) {
      console.error("[Arcade] Failed to save score", error);
      res.status(500).json({ error: "Could not save that score." });
    }
  });
}
