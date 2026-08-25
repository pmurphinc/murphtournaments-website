import type { Express, Request, Response } from "express";
import { asc, desc, eq } from "drizzle-orm";
import { arcadeScores } from "../drizzle/schema";
import { getDb } from "./db";

const ARCADE_ORIGINS = new Set([
  "https://breachrunner.murphtournaments.com",
  "https://wormhole-arcade.pmurphinc.chatgpt.site",
]);

const ARCADE_DIFFICULTIES = new Set(["easy", "difficult", "hard"]);

type ArcadeDifficulty = "easy" | "difficult" | "hard";

export type ArcadeScoreInput = {
  runId: string;
  initials: string;
  score: number;
  ship: string;
  difficulty: ArcadeDifficulty;
  durationSeconds: number;
};

function cleanInteger(value: unknown, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const integer = Math.floor(value);
  return integer >= 0 && integer <= maximum ? integer : null;
}

export function normalizeArcadeInitials(value: unknown) {
  if (typeof value !== "string") return null;
  const initials = value.trim().toUpperCase();
  return /^[A-Z0-9]{3}$/.test(initials) ? initials : null;
}

export function parseArcadeScoreInput(value: unknown): ArcadeScoreInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const runId = typeof record.runId === "string" ? record.runId.trim() : "";
  const initials = normalizeArcadeInitials(record.initials);
  const score = cleanInteger(record.score, 1_000_000_000);
  const durationSeconds = cleanInteger(record.durationSeconds, 86_400);
  const ship = typeof record.ship === "string" ? record.ship.trim() : "";
  const difficulty = typeof record.difficulty === "string"
    ? record.difficulty.toLowerCase()
    : "";

  if (!/^[A-Za-z0-9_-]{16,64}$/.test(runId)) return null;
  if (!initials || score === null || durationSeconds === null) return null;
  if (!ship || ship.length > 64) return null;
  if (!ARCADE_DIFFICULTIES.has(difficulty)) return null;

  return {
    runId,
    initials,
    score,
    ship,
    difficulty: difficulty as ArcadeDifficulty,
    durationSeconds,
  };
}

export function allowedArcadeOrigin(origin: string | undefined) {
  if (!origin) return null;
  if (ARCADE_ORIGINS.has(origin)) return origin;
  if (
    process.env.NODE_ENV !== "production" &&
    /^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)
  ) {
    return origin;
  }
  return null;
}

function applyArcadeCors(req: Request, res: Response) {
  const requestOrigin = req.get("origin");
  const origin = allowedArcadeOrigin(requestOrigin);
  if (requestOrigin && !origin) return false;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return true;
}

function publicEntry(
  row: typeof arcadeScores.$inferSelect,
  rank: number
) {
  return {
    id: row.id,
    rank,
    initials: row.initials,
    score: row.score,
    ship: row.ship,
    difficulty: row.difficulty,
    durationSeconds: row.durationSeconds,
    achievedAt: row.createdAt.toISOString(),
  };
}

async function readLeaderboard(limit: number) {
  const db = await getDb();
  if (!db) return null;
  return db
    .select()
    .from(arcadeScores)
    .orderBy(
      desc(arcadeScores.score),
      asc(arcadeScores.createdAt),
      asc(arcadeScores.id)
    )
    .limit(limit);
}

async function saveArcadeScore(input: ArcadeScoreInput) {
  const db = await getDb();
  if (!db) return null;

  await db
    .insert(arcadeScores)
    .values(input)
    .onDuplicateKeyUpdate({ set: { runId: input.runId } });

  const [saved] = await db
    .select()
    .from(arcadeScores)
    .where(eq(arcadeScores.runId, input.runId))
    .limit(1);

  return saved ?? null;
}

export function registerArcadeScoreRoutes(app: Express) {
  const preflight = (req: Request, res: Response) => {
    if (!applyArcadeCors(req, res)) {
      res.status(403).json({ error: "Origin not allowed." });
      return;
    }
    res.status(204).end();
  };

  app.options("/api/arcade/leaderboard", preflight);
  app.options("/api/arcade/scores", preflight);

  app.get("/api/arcade/leaderboard", async (req, res) => {
    if (!applyArcadeCors(req, res)) {
      res.status(403).json({ error: "Origin not allowed." });
      return;
    }

    try {
      const requested = Number.parseInt(String(req.query.limit ?? "10"), 10);
      const limit = Number.isFinite(requested)
        ? Math.min(100, Math.max(1, requested))
        : 10;
      const rows = await readLeaderboard(limit);
      if (!rows) {
        res.status(503).json({ error: "Leaderboard storage unavailable." });
        return;
      }
      res.json({ entries: rows.map((row, index) => publicEntry(row, index + 1)) });
    } catch (error) {
      console.error("[Arcade] Failed to load leaderboard:", error);
      res.status(500).json({ error: "Leaderboard could not be loaded." });
    }
  });

  app.post("/api/arcade/scores", async (req, res) => {
    if (!applyArcadeCors(req, res)) {
      res.status(403).json({ error: "Origin not allowed." });
      return;
    }

    const input = parseArcadeScoreInput(req.body);
    if (!input) {
      res.status(400).json({ error: "Invalid arcade score." });
      return;
    }

    try {
      const saved = await saveArcadeScore(input);
      if (!saved) {
        res.status(503).json({ error: "Leaderboard storage unavailable." });
        return;
      }
      const rows = await readLeaderboard(100);
      const rank = rows
        ? rows.findIndex(row => row.id === saved.id) + 1
        : 0;
      res.status(201).json({
        entry: publicEntry(saved, rank > 0 ? rank : 0),
        rank: rank > 0 ? rank : null,
      });
    } catch (error) {
      console.error("[Arcade] Failed to save score:", error);
      res.status(500).json({ error: "Score could not be saved." });
    }
  });
}
