import { desc, eq } from "drizzle-orm";
import {
  vodAnalyses,
  type InsertVodAnalysis,
  type VodAnalysis,
} from "../drizzle/schema";
import { getDb } from "./db";
import { parseVodSource } from "@shared/vod/source";

export type CreateVodAnalysisInput = {
  sourceUrl: string;
  title?: string | null;
};

export async function createVodAnalysis(
  input: CreateVodAnalysisInput
): Promise<VodAnalysis | undefined> {
  const parsedSource = parseVodSource(input.sourceUrl);

  if (!parsedSource.valid) {
    throw new Error(parsedSource.error);
  }

  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot create VOD analysis: database not available"
    );
    return undefined;
  }

  try {
    const values: InsertVodAnalysis = {
      title: input.title ?? null,
      sourceType: parsedSource.sourceType,
      sourceId: parsedSource.sourceId ?? null,
      sourceRef: parsedSource.sourceRef ?? null,
      sourceUrl: input.sourceUrl.trim(),
      normalizedUrl: parsedSource.normalizedUrl,
    };

    await db.insert(vodAnalyses).values(values);
    const result = await db
      .select()
      .from(vodAnalyses)
      .orderBy(desc(vodAnalyses.id))
      .limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to create VOD analysis:", error);
    throw error;
  }
}

export async function getVodAnalysisById(
  id: number
): Promise<VodAnalysis | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get VOD analysis: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(vodAnalyses)
      .where(eq(vodAnalyses.id, id))
      .limit(1);
    return result[0];
  } catch (error) {
    console.error("[Database] Failed to get VOD analysis:", error);
    throw error;
  }
}

export async function listVodAnalyses(): Promise<VodAnalysis[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot list VOD analyses: database not available");
    return [];
  }

  try {
    return await db
      .select()
      .from(vodAnalyses)
      .orderBy(desc(vodAnalyses.createdAt));
  } catch (error) {
    console.error("[Database] Failed to list VOD analyses:", error);
    throw error;
  }
}
