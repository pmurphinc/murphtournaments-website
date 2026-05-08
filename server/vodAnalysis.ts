import { asc, desc, eq } from "drizzle-orm";
import {
  vodAnalyses,
  vodAnalysisEvents,
  type InsertVodAnalysis,
  type InsertVodAnalysisEvent,
  type VodAnalysis,
  type VodAnalysisEvent,
} from "../drizzle/schema";
import { parseVodSource, type VodSourceType } from "../shared/vod/source";
import {
  VOD_ANALYSIS_EVENT_REQUIRED_FIELDS,
  VOD_ANALYSIS_EVENT_TYPES,
  type VodAnalysisEventType,
} from "../shared/vod/events";
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

export type VodAnalysisRecord = Pick<
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

export type VodAnalysisListItem = VodAnalysisRecord;

export type CreateVodAnalysisEventInput = {
  vodAnalysisId: number;
  eventType: VodAnalysisEventType;
  timestampSeconds: number;
  actorLabel?: string | null;
  targetLabel?: string | null;
  teamLabel?: string | null;
  metadata?: unknown;
};

export type VodAnalysisEventRecord = Pick<
  VodAnalysisEvent,
  | "id"
  | "vodAnalysisId"
  | "eventType"
  | "timestampSeconds"
  | "actorLabel"
  | "targetLabel"
  | "teamLabel"
  | "metadata"
  | "createdAt"
  | "updatedAt"
>;

type InsertableDb = {
  insert: (table: typeof vodAnalyses) => {
    values: (values: InsertVodAnalysis) => Promise<unknown>;
  };
};

type EventInsertableDb = {
  insert: (table: typeof vodAnalysisEvents) => {
    values: (values: InsertVodAnalysisEvent) => Promise<unknown>;
  };
};

type ListableDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalyses) => {
      orderBy: (...columns: unknown[]) => Promise<VodAnalysisListItem[]>;
    };
  };
};

type GetByIdDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalyses) => {
      where: (condition: unknown) => {
        limit: (limit: number) => Promise<VodAnalysisRecord[]>;
      };
    };
  };
};

type EventListableDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalysisEvents) => {
      where: (condition: unknown) => {
        orderBy: (...columns: unknown[]) => Promise<VodAnalysisEventRecord[]>;
      };
    };
  };
};

const VALID_VIDEO_POVS: readonly VideoPov[] = ["player", "spectator"];

export const vodAnalysisIdInputSchema = z.number().int().positive();

export const createVodAnalysisEventInputSchema = z
  .object({
    vodAnalysisId: vodAnalysisIdInputSchema,
    eventType: z.enum(VOD_ANALYSIS_EVENT_TYPES, {
      error: "VOD analysis event type is not supported.",
    }),
    timestampSeconds: z
      .number()
      .int("Event timestamp must be a whole number of seconds.")
      .nonnegative("Event timestamp must be zero or greater."),
    actorLabel: z.string().trim().optional().nullable(),
    targetLabel: z.string().trim().optional().nullable(),
    teamLabel: z.string().trim().optional().nullable(),
    metadata: z.unknown().optional(),
  })
  .superRefine((input, ctx) => {
    const requiredFields = VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[input.eventType];

    for (const field of requiredFields) {
      if (!input[field]?.trim()) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required for ${input.eventType} events.`,
        });
      }
    }
  });

export const createVodAnalysisInputSchema = z.object({
  title: z.string().trim().min(1, "VOD analysis title is required."),
  sourceUrl: z
    .string()
    .trim()
    .superRefine((sourceUrl, ctx) => {
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

const vodAnalysisFields = {
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
      .select(vodAnalysisFields)
      .from(vodAnalyses)
      .orderBy(desc(vodAnalyses.createdAt), desc(vodAnalyses.id));
  }

  const db = await getDb();

  if (!db) {
    throw new Error("Database is not available for VOD analysis listing.");
  }

  return db
    .select(vodAnalysisFields)
    .from(vodAnalyses)
    .orderBy(desc(vodAnalyses.createdAt), desc(vodAnalyses.id));
}

export async function getVodAnalysisById(
  id: number,
  dbClient?: GetByIdDb | null
): Promise<VodAnalysisRecord | null> {
  const parsedId = vodAnalysisIdInputSchema.parse(id);

  const runQuery = (db: GetByIdDb) =>
    db
      .select(vodAnalysisFields)
      .from(vodAnalyses)
      .where(eq(vodAnalyses.id, parsedId))
      .limit(1);

  if (dbClient) {
    const [vodAnalysis] = await runQuery(dbClient);
    return vodAnalysis ?? null;
  }

  const db = await getDb();

  if (!db) {
    throw new Error("Database is not available for VOD analysis lookup.");
  }

  const [vodAnalysis] = await runQuery(db as unknown as GetByIdDb);
  return vodAnalysis ?? null;
}

const vodAnalysisEventFields = {
  id: vodAnalysisEvents.id,
  vodAnalysisId: vodAnalysisEvents.vodAnalysisId,
  eventType: vodAnalysisEvents.eventType,
  timestampSeconds: vodAnalysisEvents.timestampSeconds,
  actorLabel: vodAnalysisEvents.actorLabel,
  targetLabel: vodAnalysisEvents.targetLabel,
  teamLabel: vodAnalysisEvents.teamLabel,
  metadata: vodAnalysisEvents.metadata,
  createdAt: vodAnalysisEvents.createdAt,
  updatedAt: vodAnalysisEvents.updatedAt,
};

function normalizeEventLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function buildVodAnalysisEventInsert(
  input: CreateVodAnalysisEventInput
): InsertVodAnalysisEvent {
  const parsedInput = createVodAnalysisEventInputSchema.parse(input);

  return {
    vodAnalysisId: parsedInput.vodAnalysisId,
    eventType: parsedInput.eventType,
    timestampSeconds: parsedInput.timestampSeconds,
    actorLabel: normalizeEventLabel(parsedInput.actorLabel),
    targetLabel: normalizeEventLabel(parsedInput.targetLabel),
    teamLabel: normalizeEventLabel(parsedInput.teamLabel),
    metadata:
      parsedInput.metadata === undefined || parsedInput.metadata === null
        ? null
        : JSON.stringify(parsedInput.metadata),
  };
}

export async function createVodAnalysisEvent(
  input: CreateVodAnalysisEventInput,
  dbClient?: EventInsertableDb | null
): Promise<InsertVodAnalysisEvent> {
  const values = buildVodAnalysisEventInsert(input);
  const db = dbClient ?? (await getDb());

  if (!db) {
    throw new Error(
      "Database is not available for VOD analysis event creation."
    );
  }

  await db.insert(vodAnalysisEvents).values(values);

  return values;
}

export async function listVodAnalysisEvents(
  vodAnalysisId: number,
  dbClient?: EventListableDb | null
): Promise<VodAnalysisEventRecord[]> {
  const parsedVodAnalysisId = vodAnalysisIdInputSchema.parse(vodAnalysisId);

  const runQuery = (db: EventListableDb) =>
    db
      .select(vodAnalysisEventFields)
      .from(vodAnalysisEvents)
      .where(eq(vodAnalysisEvents.vodAnalysisId, parsedVodAnalysisId))
      .orderBy(
        asc(vodAnalysisEvents.timestampSeconds),
        asc(vodAnalysisEvents.id)
      );

  if (dbClient) {
    return runQuery(dbClient);
  }

  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database is not available for VOD analysis event listing."
    );
  }

  return runQuery(db as unknown as EventListableDb);
}
