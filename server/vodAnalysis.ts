import { vodAnalyses, type InsertVodAnalysis } from "../drizzle/schema";
import { parseVodSource, type VodSourceType } from "../shared/vod/source";
import { getDb } from "./db";

export type VideoPov = "player" | "spectator";
export type VodAnalysisStatus = "created";

export type CreateVodAnalysisInput = {
  title: string;
  sourceUrl: string;
  videoPov: VideoPov;
  thumbnailUrl?: string | null;
  durationSeconds?: number | null;
};

type InsertableDb = {
  insert: (table: typeof vodAnalyses) => {
    values: (values: InsertVodAnalysis) => Promise<unknown>;
  };
};

const VALID_VIDEO_POVS: readonly VideoPov[] = ["player", "spectator"];

export function isValidVideoPov(value: unknown): value is VideoPov {
  return (
    typeof value === "string" && VALID_VIDEO_POVS.includes(value as VideoPov)
  );
}

export function buildVodAnalysisInsert(
  input: CreateVodAnalysisInput
): InsertVodAnalysis {
  const title = input.title.trim();

  if (!title) {
    throw new Error("VOD analysis title is required.");
  }

  if (!isValidVideoPov(input.videoPov)) {
    throw new Error("VOD analysis videoPov must be player or spectator.");
  }

  const parsedSource = parseVodSource(input.sourceUrl);

  if (!parsedSource.valid) {
    throw new Error(parsedSource.error);
  }

  return {
    title,
    sourceType: parsedSource.sourceType as VodSourceType,
    sourceUrl: input.sourceUrl.trim(),
    normalizedSourceUrl: parsedSource.normalizedUrl,
    sourceId: parsedSource.sourceId ?? null,
    sourceRef: parsedSource.sourceRef ?? null,
    thumbnailUrl: input.thumbnailUrl ?? null,
    durationSeconds: input.durationSeconds ?? null,
    videoPov: input.videoPov,
    status: "created",
  };
}

export async function createVodAnalysis(
  input: CreateVodAnalysisInput,
  dbClient?: InsertableDb | null
): Promise<InsertVodAnalysis> {
  const values = buildVodAnalysisInsert(input);
  const db = dbClient ?? (await getDb());

  if (!db) {
    throw new Error("Database is not available for VOD analysis creation.");
  }

  await db.insert(vodAnalyses).values(values);

  return values;
}
