import { desc } from "drizzle-orm";
import {
  vodAnalyses,
  type InsertVodAnalysis,
  type VodAnalysis,
} from "../drizzle/schema";
import { parseVodSource, type VodSourceType } from "../shared/vod/source";
import { z } from "zod";
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

export type VodAnalysisListItem = Pick<
  VodAnalysis,
  | "id"
  | "title"
  | "sourceType"
  | "sourceUrl"
  | "normalizedSourceUrl"
  | "sourceId"
  | "sourceRef"
  | "thumbnailUrl"
  | "durationSeconds"
  | "videoPov"
  | "status"
  | "createdAt"
  | "updatedAt"
>;

type InsertableDb = {
  insert: (table: typeof vodAnalyses) => {
    values: (values: InsertVodAnalysis) => Promise<unknown>;
  };
};

type ListableDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalyses) => {
      orderBy: (...columns: unknown[]) => Promise<VodAnalysisListItem[]>;
    };
  };
};

const VALID_VIDEO_POVS: readonly VideoPov[] = ["player", "spectator"];

export const createVodAnalysisInputSchema = z.object({
  title: z.string().trim().min(1, "VOD analysis title is required."),
  sourceUrl: z.string().trim().superRefine((sourceUrl, ctx) => {
    const parsedSource = parseVodSource(sourceUrl);

    if (!parsedSource.valid) {
      ctx.addIssue({
        code: "custom",
        message: parsedSource.error,
      });
    }
  }),
  videoPov: z.enum(["player", "spectator"], {
    error: "VOD analysis videoPov must be player or spectator.",
  }),
});

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

const vodAnalysisListFields = {
  id: vodAnalyses.id,
  title: vodAnalyses.title,
  sourceType: vodAnalyses.sourceType,
  sourceUrl: vodAnalyses.sourceUrl,
  normalizedSourceUrl: vodAnalyses.normalizedSourceUrl,
  sourceId: vodAnalyses.sourceId,
  sourceRef: vodAnalyses.sourceRef,
  thumbnailUrl: vodAnalyses.thumbnailUrl,
  durationSeconds: vodAnalyses.durationSeconds,
  videoPov: vodAnalyses.videoPov,
  status: vodAnalyses.status,
  createdAt: vodAnalyses.createdAt,
  updatedAt: vodAnalyses.updatedAt,
};

export async function listVodAnalyses(
  dbClient?: ListableDb | null
): Promise<VodAnalysisListItem[]> {
  if (dbClient) {
    return dbClient
      .select(vodAnalysisListFields)
      .from(vodAnalyses)
      .orderBy(desc(vodAnalyses.createdAt), desc(vodAnalyses.id));
  }

  const db = await getDb();

  if (!db) {
    throw new Error("Database is not available for VOD analysis listing.");
  }

  return db
    .select(vodAnalysisListFields)
    .from(vodAnalyses)
    .orderBy(desc(vodAnalyses.createdAt), desc(vodAnalyses.id));
}
