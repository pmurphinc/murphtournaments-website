import { asc, desc, eq, sql } from "drizzle-orm";
import {
  vodAnalyses,
  vodAnalysisEvents,
  vodSuggestedEvents,
  type InsertVodAnalysis,
  type InsertVodAnalysisEvent,
  type InsertVodSuggestedEvent,
  type VodAnalysis,
  type VodAnalysisEvent,
  type VodSuggestedEvent,
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

export const VOD_SUGGESTED_EVENT_SOURCES = [
  "manual_test",
  "debug",
  "automation",
] as const;
export const VOD_SUGGESTED_EVENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;

export type VodSuggestedEventSource =
  (typeof VOD_SUGGESTED_EVENT_SOURCES)[number];
export type VodSuggestedEventStatus =
  (typeof VOD_SUGGESTED_EVENT_STATUSES)[number];

export type CreateVodSuggestedEventInput = CreateVodAnalysisEventInput & {
  source: VodSuggestedEventSource;
  confidence?: number | null;
  status?: VodSuggestedEventStatus;
};

export type VodSuggestedEventRecord = Pick<
  VodSuggestedEvent,
  | "id"
  | "vodAnalysisId"
  | "eventType"
  | "timestampSeconds"
  | "actorLabel"
  | "targetLabel"
  | "teamLabel"
  | "metadata"
  | "source"
  | "confidence"
  | "status"
  | "confirmedVodEventId"
  | "createdAt"
  | "updatedAt"
>;

export type ApproveVodSuggestedEventResult = {
  suggestion: VodSuggestedEventRecord;
  confirmedEventId: number;
};

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

type SuggestedEventInsertableDb = {
  insert: (table: typeof vodSuggestedEvents) => {
    values: (values: InsertVodSuggestedEvent) => Promise<unknown>;
  };
};

type SuggestedEventListableDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodSuggestedEvents) => {
      where: (condition: unknown) => {
        orderBy: (...columns: unknown[]) => Promise<VodSuggestedEventRecord[]>;
      };
    };
  };
};

type SuggestedEventWorkflowDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodSuggestedEvents) => {
      where: (condition: unknown) => {
        limit: (limit: number) => Promise<VodSuggestedEventRecord[]>;
      };
    };
  };
  insert: (table: typeof vodAnalysisEvents) => {
    values: (values: InsertVodAnalysisEvent) => Promise<unknown>;
  };
  update: (table: typeof vodSuggestedEvents) => {
    set: (values: Partial<InsertVodSuggestedEvent>) => {
      where: (condition: unknown) => Promise<unknown>;
    };
  };
  transaction?: <T>(
    callback: (tx: SuggestedEventWorkflowDb) => Promise<T>
  ) => Promise<T>;
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

export const createVodSuggestedEventInputSchema =
  createVodAnalysisEventInputSchema.safeExtend({
    source: z.enum(VOD_SUGGESTED_EVENT_SOURCES, {
      error: "Suggested event source is not supported.",
    }),
    confidence: z
      .number()
      .int("Suggested event confidence must be a whole number.")
      .min(0, "Suggested event confidence must be between 0 and 100.")
      .max(100, "Suggested event confidence must be between 0 and 100.")
      .optional()
      .nullable(),
    status: z
      .enum(VOD_SUGGESTED_EVENT_STATUSES, {
        error: "Suggested event status is not supported.",
      })
      .optional()
      .default("pending"),
  });

export const suggestedEventIdInputSchema = z.number().int().positive();

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

const vodSuggestedEventFields = {
  id: vodSuggestedEvents.id,
  vodAnalysisId: vodSuggestedEvents.vodAnalysisId,
  eventType: vodSuggestedEvents.eventType,
  timestampSeconds: vodSuggestedEvents.timestampSeconds,
  actorLabel: vodSuggestedEvents.actorLabel,
  targetLabel: vodSuggestedEvents.targetLabel,
  teamLabel: vodSuggestedEvents.teamLabel,
  metadata: vodSuggestedEvents.metadata,
  source: vodSuggestedEvents.source,
  confidence: vodSuggestedEvents.confidence,
  status: vodSuggestedEvents.status,
  confirmedVodEventId: vodSuggestedEvents.confirmedVodEventId,
  createdAt: vodSuggestedEvents.createdAt,
  updatedAt: vodSuggestedEvents.updatedAt,
};

const suggestedStatusOrder = (status: VodSuggestedEventStatus) => {
  if (status === "pending") return 0;
  if (status === "approved") return 1;
  return 2;
};

export function sortVodSuggestedEventRecords(
  rows: VodSuggestedEventRecord[]
): VodSuggestedEventRecord[] {
  return [...rows].sort((a, b) => {
    const statusDifference =
      suggestedStatusOrder(a.status) - suggestedStatusOrder(b.status);
    if (statusDifference !== 0) return statusDifference;

    const timestampDifference = a.timestampSeconds - b.timestampSeconds;
    if (timestampDifference !== 0) return timestampDifference;

    return a.id - b.id;
  });
}

export function buildVodSuggestedEventInsert(
  input: CreateVodSuggestedEventInput
): InsertVodSuggestedEvent {
  const parsedInput = createVodSuggestedEventInputSchema.parse(input);

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
    source: parsedInput.source,
    confidence: parsedInput.confidence ?? null,
    status: parsedInput.status,
    confirmedVodEventId: null,
  };
}

export async function createVodSuggestedEvent(
  input: CreateVodSuggestedEventInput,
  dbClient?: SuggestedEventInsertableDb | null
): Promise<InsertVodSuggestedEvent> {
  const values = buildVodSuggestedEventInsert(input);
  const db = dbClient ?? (await getDb());

  if (!db) {
    throw new Error(
      "Database is not available for VOD suggested event creation."
    );
  }

  await db.insert(vodSuggestedEvents).values(values);

  return values;
}

export async function listVodSuggestedEvents(
  vodAnalysisId: number,
  dbClient?: SuggestedEventListableDb | null
): Promise<VodSuggestedEventRecord[]> {
  const parsedVodAnalysisId = vodAnalysisIdInputSchema.parse(vodAnalysisId);

  const statusOrder = sql`case ${vodSuggestedEvents.status} when 'pending' then 0 when 'approved' then 1 else 2 end`;
  const runQuery = async (db: SuggestedEventListableDb) =>
    sortVodSuggestedEventRecords(
      await db
        .select(vodSuggestedEventFields)
        .from(vodSuggestedEvents)
        .where(eq(vodSuggestedEvents.vodAnalysisId, parsedVodAnalysisId))
        .orderBy(
          statusOrder,
          asc(vodSuggestedEvents.timestampSeconds),
          asc(vodSuggestedEvents.id)
        )
    );

  if (dbClient) {
    return runQuery(dbClient);
  }

  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database is not available for VOD suggested event listing."
    );
  }

  return runQuery(db as unknown as SuggestedEventListableDb);
}

async function getVodSuggestedEventByIdForWorkflow(
  id: number,
  db: SuggestedEventWorkflowDb
): Promise<VodSuggestedEventRecord | null> {
  const [suggestion] = await db
    .select(vodSuggestedEventFields)
    .from(vodSuggestedEvents)
    .where(eq(vodSuggestedEvents.id, id))
    .limit(1);

  return suggestion ?? null;
}

function extractInsertId(result: unknown): number | null {
  if (result && typeof result === "object" && "insertId" in result) {
    const insertId = Number((result as { insertId: unknown }).insertId);
    return Number.isInteger(insertId) && insertId > 0 ? insertId : null;
  }

  if (Array.isArray(result)) {
    for (const item of result) {
      const insertId = extractInsertId(item);
      if (insertId) return insertId;
    }
  }

  return null;
}

async function approveVodSuggestedEventInDb(
  id: number,
  db: SuggestedEventWorkflowDb
): Promise<ApproveVodSuggestedEventResult> {
  const parsedId = suggestedEventIdInputSchema.parse(id);
  const suggestion = await getVodSuggestedEventByIdForWorkflow(parsedId, db);

  if (!suggestion) {
    throw new Error("Suggested event was not found.");
  }

  if (suggestion.status === "approved") {
    if (suggestion.confirmedVodEventId) {
      return {
        suggestion,
        confirmedEventId: suggestion.confirmedVodEventId,
      };
    }

    throw new Error("Approved suggested event is missing a confirmed event.");
  }

  if (suggestion.status === "rejected") {
    throw new Error("Rejected suggested events cannot be approved.");
  }

  const insertResult = await db.insert(vodAnalysisEvents).values({
    vodAnalysisId: suggestion.vodAnalysisId,
    eventType: suggestion.eventType,
    timestampSeconds: suggestion.timestampSeconds,
    actorLabel: suggestion.actorLabel,
    targetLabel: suggestion.targetLabel,
    teamLabel: suggestion.teamLabel,
    metadata: suggestion.metadata,
  });
  const confirmedEventId = extractInsertId(insertResult);

  if (!confirmedEventId) {
    throw new Error("Could not determine approved VOD event id.");
  }

  await db
    .update(vodSuggestedEvents)
    .set({ status: "approved", confirmedVodEventId: confirmedEventId })
    .where(eq(vodSuggestedEvents.id, parsedId));

  const updatedSuggestion = await getVodSuggestedEventByIdForWorkflow(
    parsedId,
    db
  );

  return {
    suggestion: updatedSuggestion ?? {
      ...suggestion,
      status: "approved",
      confirmedVodEventId: confirmedEventId,
    },
    confirmedEventId,
  };
}

export async function approveVodSuggestedEvent(
  id: number,
  dbClient?: SuggestedEventWorkflowDb | null
): Promise<ApproveVodSuggestedEventResult> {
  const db = dbClient ?? (await getDb());

  if (!db) {
    throw new Error(
      "Database is not available for approving suggested events."
    );
  }

  const workflowDb = db as unknown as SuggestedEventWorkflowDb;
  if (workflowDb.transaction) {
    return workflowDb.transaction(tx => approveVodSuggestedEventInDb(id, tx));
  }

  return approveVodSuggestedEventInDb(id, workflowDb);
}

async function rejectVodSuggestedEventInDb(
  id: number,
  db: SuggestedEventWorkflowDb
): Promise<VodSuggestedEventRecord> {
  const parsedId = suggestedEventIdInputSchema.parse(id);
  const suggestion = await getVodSuggestedEventByIdForWorkflow(parsedId, db);

  if (!suggestion) {
    throw new Error("Suggested event was not found.");
  }

  if (suggestion.status === "approved") {
    throw new Error("Approved suggested events cannot be rejected.");
  }

  if (suggestion.status === "rejected") {
    return suggestion;
  }

  await db
    .update(vodSuggestedEvents)
    .set({ status: "rejected" })
    .where(eq(vodSuggestedEvents.id, parsedId));

  const updatedSuggestion = await getVodSuggestedEventByIdForWorkflow(
    parsedId,
    db
  );

  return updatedSuggestion ?? { ...suggestion, status: "rejected" };
}

export async function rejectVodSuggestedEvent(
  id: number,
  dbClient?: SuggestedEventWorkflowDb | null
): Promise<VodSuggestedEventRecord> {
  const db = dbClient ?? (await getDb());

  if (!db) {
    throw new Error(
      "Database is not available for rejecting suggested events."
    );
  }

  const workflowDb = db as unknown as SuggestedEventWorkflowDb;
  if (workflowDb.transaction) {
    return workflowDb.transaction(tx => rejectVodSuggestedEventInDb(id, tx));
  }

  return rejectVodSuggestedEventInDb(id, workflowDb);
}
