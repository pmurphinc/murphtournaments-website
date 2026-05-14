import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import {
  vodAnalyses,
  vodAnalysisEvents,
  vodCaptureJobs,
  vodSuggestedEvents,
  type InsertVodAnalysis,
  type InsertVodAnalysisEvent,
  type InsertVodCaptureJob,
  type InsertVodSuggestedEvent,
  type VodAnalysis,
  type VodAnalysisEvent,
  type VodCaptureJob,
  type VodSuggestedEvent,
} from "../drizzle/schema";
import { parseVodSource, type VodSourceType } from "../shared/vod/source";
import {
  fetchTwitchVodMetadata,
  type TwitchMetadata,
  type TwitchMetadataResult,
} from "./twitchMetadata";
import {
  VOD_ANALYSIS_EVENT_REQUIRED_FIELDS,
  VOD_ANALYSIS_EVENT_TYPES,
  type VodAnalysisEventType,
} from "../shared/vod/events";
import { z } from "zod";
import { getDb } from "./db";
import {
  buildFrameSamplingPlan,
  getVodCaptureReadiness,
  type FrameSamplingPlan,
  type VodCaptureReadiness,
} from "../shared/vod/frame-sampling";
import { getVodHudZonePreset, type VodHudZone } from "../shared/vod/hud-zones";
import { createCenterEventTextSampleDetector } from "./vodDetectors/centerEventTextDetector";
import {
  getVodAutomationOcrConfidenceThreshold,
  isVodAutomationOcrEnabled,
} from "./vodDetectors/centerEventTextOcr";
import {
  buildVodCaptureFrameUrl,
  checkVodFrameCaptureBinaries,
  extractVodFrame,
  getLatestVodCaptureFrameFile,
  type VodCaptureFrameFilePreview,
  type VodFrameCaptureBinaryCheck,
  type VodFrameCaptureInput,
  type VodFrameCaptureResult,
} from "./vodFrameCapture";

export type VideoPov = "player" | "spectator";
export type VodAnalysisStatus = "created";

export const VOD_CAPTURE_JOB_STATUSES = [
  "queued",
  "processing",
  "complete",
  "failed",
  "cancelled",
] as const;
export const VOD_CAPTURE_JOB_SOURCES = ["manual_debug", "automation"] as const;

export type VodCaptureJobStatus = (typeof VOD_CAPTURE_JOB_STATUSES)[number];
export type VodCaptureJobSource = (typeof VOD_CAPTURE_JOB_SOURCES)[number];

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

export type PendingSuggestedEventCountRow = {
  vodAnalysisId: number;
  pendingSuggestedCount: number | string | bigint;
};

export type PendingSuggestedEventCountsByVodAnalysisId = Record<number, number>;

export type SuggestedEventStatusCountRow = {
  status: VodSuggestedEventStatus;
  suggestedCount: number | string | bigint;
};

export type ManualEventCountRow = {
  confirmedManualEventCount: number | string | bigint;
};

export type VodAutomationStatusSummary = {
  vodAnalysisId: number;
  ocrEnabled: boolean;
  ocrConfidenceThreshold: number;
  readiness: VodCaptureReadiness;
  frameCaptureBinaries: VodFrameCaptureBinaryCheck;
  latestCaptureJob: VodCaptureJobRecord | null;
  pendingSuggestedCount: number;
  approvedSuggestedCount: number;
  rejectedSuggestedCount: number;
  confirmedManualEventCount: number;
};

export type VodAnalysisListItem = VodAnalysisRecord & {
  pendingSuggestedCount: number;
};

export type VodCaptureJobRecord = Pick<
  VodCaptureJob,
  | "id"
  | "vodAnalysisId"
  | "status"
  | "source"
  | "sampleIntervalSeconds"
  | "plannedSamples"
  | "processedSamples"
  | "failedSamples"
  | "errorMessage"
  | "startedAt"
  | "completedAt"
  | "createdAt"
  | "updatedAt"
>;

export type UpdateVodCaptureJobStatusInput = {
  id: number;
  vodAnalysisId: number;
  status: VodCaptureJobStatus;
  processedSamples?: number;
  failedSamples?: number;
  errorMessage?: string | null;
};

export type UpdateVodCaptureJobStatusResult = {
  status: "updated";
  id: number;
  vodAnalysisId: number;
  update: Partial<InsertVodCaptureJob>;
};

export type CreateVodCaptureJobResult =
  | {
      status: "created";
      vodAnalysis: VodAnalysisRecord;
      readiness: VodCaptureReadiness;
      captureJob: InsertVodCaptureJob;
    }
  | {
      status: "not_ready";
      vodAnalysis: VodAnalysisRecord;
      readiness: VodCaptureReadiness;
    }
  | { status: "not_found"; vodAnalysis: null };

export type RefreshTwitchMetadataStatus =
  | "updated"
  | "credentials_missing"
  | "not_twitch"
  | "not_found"
  | "fetch_failed";

export type RefreshTwitchMetadataSummary = {
  thumbnailUrlReturned: boolean;
  thumbnailUrlUpdated: boolean;
  thumbnailUrl: string | null;
  existingThumbnailUrl: string | null;
  videoType?: TwitchMetadata["videoType"];
  url?: string;
};

export type RefreshTwitchMetadataResult = {
  status: RefreshTwitchMetadataStatus;
  vodAnalysis?: VodAnalysisRecord | null;
  metadata?: TwitchMetadata;
  metadataSummary?: RefreshTwitchMetadataSummary;
};

type TwitchMetadataFetcher = (vodId: string) => Promise<TwitchMetadataResult>;

export type CreateVodAnalysisEventInput = {
  vodAnalysisId: number;
  eventType: VodAnalysisEventType;
  timestampSeconds: number;
  actorLabel?: string | null;
  targetLabel?: string | null;
  teamLabel?: string | null;
  metadata?: unknown;
};

export type UpdateVodAnalysisEventInput = CreateVodAnalysisEventInput & {
  id: number;
};

export type DeleteVodAnalysisEventInput = {
  id: number;
  vodAnalysisId: number;
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

export type DetectedAutomationEventInput = Omit<
  CreateVodAnalysisEventInput,
  "vodAnalysisId"
> & {
  confidence?: number | null;
};

export type IngestAutomationDetectionsInput = {
  vodAnalysisId: number;
  captureJobId: number;
  detections: DetectedAutomationEventInput[];
};

export type RunMockVodAutomationDetectionsInput = {
  vodAnalysisId: number;
  captureJobId: number;
};

export type ProcessVodCaptureJobInput = {
  vodAnalysisId: number;
  captureJobId: number;
};

export type VodCaptureSampleDetectionInput = {
  vodAnalysis: VodAnalysisRecord;
  captureJob: VodCaptureJobRecord;
  sampleTimestampSeconds: number;
  sampleIndex: number;
  samplePlan: FrameSamplingPlan;
  frameCapture?: VodFrameCaptureResult;
};

export type VodCaptureSampleDetector = (
  input: VodCaptureSampleDetectionInput
) => Promise<DetectedAutomationEventInput[]>;

export type VodFrameExtractor = (
  input: VodFrameCaptureInput
) => Promise<VodFrameCaptureResult>;

export type RunMockVodAutomationDetectionsResult = Pick<
  IngestAutomationDetectionsResult,
  "status" | "vodAnalysisId" | "captureJobId" | "createdCount"
>;

export type ProcessVodCaptureJobResult = {
  status:
    | "complete"
    | "failed"
    | "not_found"
    | "invalid_capture_job"
    | "invalid_capture_job_status";
  vodAnalysisId: number;
  captureJobId: number;
  processedSamples: number;
  failedSamples: number;
  createdSuggestionCount: number;
  errorMessage?: string;
};

export type VodLatestCaptureFramePreviewResult =
  | {
      status: "available";
      vodAnalysisId: number;
      captureJobId: number;
      frameUrl: string;
      relativeFramePath: string;
      fileName: string;
      timestampSeconds: number | null;
      zones: VodHudZone[];
    }
  | {
      status: "not_found";
      vodAnalysisId: number;
      captureJobId: number | null;
      frameUrl: null;
      relativeFramePath: null;
      fileName: null;
      timestampSeconds: null;
      zones: VodHudZone[];
    };

export type IngestAutomationDetectionsResult =
  | {
      status: "created";
      vodAnalysisId: number;
      captureJobId: number;
      createdCount: number;
      suggestedEvents: InsertVodSuggestedEvent[];
    }
  | {
      status: "not_found";
      vodAnalysisId: number;
      captureJobId: number;
      createdCount: 0;
      suggestedEvents: [];
    }
  | {
      status: "invalid_capture_job";
      vodAnalysisId: number;
      captureJobId: number;
      createdCount: 0;
      suggestedEvents: [];
    };

export type UpdateVodSuggestedEventInput = Omit<
  CreateVodAnalysisEventInput,
  "vodAnalysisId"
> & {
  id: number;
  confidence?: number | null;
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

type EventUpdateableDb = {
  update: (table: typeof vodAnalysisEvents) => {
    set: (values: Partial<InsertVodAnalysisEvent>) => {
      where: (condition: unknown) => Promise<unknown>;
    };
  };
};

type EventDeleteableDb = {
  delete: (table: typeof vodAnalysisEvents) => {
    where: (condition: unknown) => Promise<unknown>;
  };
};

type ListableDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalyses) => {
      orderBy: (...columns: unknown[]) => Promise<VodAnalysisRecord[]>;
    };
  };
};

type PendingSuggestedEventCountDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodSuggestedEvents) => {
      where: (condition: unknown) => {
        groupBy: (
          column: typeof vodSuggestedEvents.vodAnalysisId
        ) => Promise<PendingSuggestedEventCountRow[]>;
      };
    };
  };
};

type VodAnalysisListDb = ListableDb & PendingSuggestedEventCountDb;

type GetByIdDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalyses) => {
      where: (condition: unknown) => {
        limit: (limit: number) => Promise<VodAnalysisRecord[]>;
      };
    };
  };
};

type UpdateVodAnalysisMetadataDb = GetByIdDb & {
  update: (table: typeof vodAnalyses) => {
    set: (values: Partial<InsertVodAnalysis>) => {
      where: (condition: unknown) => Promise<unknown>;
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

type CaptureJobInsertableDb = GetByIdDb & {
  insert: (table: typeof vodCaptureJobs) => {
    values: (values: InsertVodCaptureJob) => Promise<unknown>;
  };
};

type CaptureJobListableDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodCaptureJobs) => {
      where: (condition: unknown) => {
        orderBy: (...columns: unknown[]) => Promise<VodCaptureJobRecord[]>;
      };
    };
  };
};

type CaptureJobUpdateableDb = {
  update: (table: typeof vodCaptureJobs) => {
    set: (values: Partial<InsertVodCaptureJob>) => {
      where: (condition: unknown) => Promise<unknown>;
    };
  };
};

type CaptureJobLatestDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodCaptureJobs) => {
      where: (condition: unknown) => {
        orderBy: (...columns: unknown[]) => {
          limit: (limit: number) => Promise<VodCaptureJobRecord[]>;
        };
      };
    };
  };
};

type SuggestedEventInsertableDb = {
  insert: (table: typeof vodSuggestedEvents) => {
    values: (values: InsertVodSuggestedEvent) => Promise<unknown>;
  };
};

type ProcessVodCaptureJobDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalyses | typeof vodCaptureJobs) => {
      where: (condition: unknown) => {
        limit: (
          limit: number
        ) => Promise<VodAnalysisRecord[] | VodCaptureJobRecord[]>;
      };
    };
  };
  update: (table: typeof vodCaptureJobs) => {
    set: (values: Partial<InsertVodCaptureJob>) => {
      where: (condition: unknown) => Promise<unknown>;
    };
  };
  insert: (table: typeof vodSuggestedEvents) => {
    values: (values: InsertVodSuggestedEvent) => Promise<unknown>;
  };
};

type AutomationDetectionIngestDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalyses | typeof vodCaptureJobs) => {
      where: (condition: unknown) => {
        limit: (
          limit: number
        ) => Promise<VodAnalysisRecord[] | VodCaptureJobRecord[]>;
      };
    };
  };
  insert: (table: typeof vodSuggestedEvents) => {
    values: (values: InsertVodSuggestedEvent) => Promise<unknown>;
  };
};

type SuggestedEventStatusCountDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodSuggestedEvents) => {
      where: (condition: unknown) => {
        groupBy: (
          column: typeof vodSuggestedEvents.status
        ) => Promise<SuggestedEventStatusCountRow[]>;
      };
    };
  };
};

type ManualEventCountDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodAnalysisEvents) => {
      where: (condition: unknown) => Promise<ManualEventCountRow[]>;
    };
  };
};

type AutomationStatusDb = GetByIdDb &
  CaptureJobLatestDb &
  SuggestedEventStatusCountDb &
  ManualEventCountDb;

type SuggestedEventListableDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodSuggestedEvents) => {
      where: (condition: unknown) => {
        orderBy: (...columns: unknown[]) => Promise<VodSuggestedEventRecord[]>;
      };
    };
  };
};

type SuggestedEventUpdateableDb = {
  select: (fields: Record<string, unknown>) => {
    from: (table: typeof vodSuggestedEvents) => {
      where: (condition: unknown) => {
        limit: (limit: number) => Promise<VodSuggestedEventRecord[]>;
      };
    };
  };
  update: (table: typeof vodSuggestedEvents) => {
    set: (values: Partial<InsertVodSuggestedEvent>) => {
      where: (condition: unknown) => Promise<unknown>;
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

export const createVodCaptureJobInputSchema = z.object({
  vodAnalysisId: vodAnalysisIdInputSchema,
  source: z
    .enum(VOD_CAPTURE_JOB_SOURCES, {
      error: "Capture job source is not supported.",
    })
    .optional(),
});

export const updateVodCaptureJobStatusInputSchema = z.object({
  id: z.number().int().positive(),
  vodAnalysisId: vodAnalysisIdInputSchema,
  status: z.enum(VOD_CAPTURE_JOB_STATUSES, {
    error: "Capture job status is not supported.",
  }),
  processedSamples: z
    .number()
    .int("Processed samples must be a whole number.")
    .nonnegative("Processed samples must be zero or greater.")
    .optional(),
  failedSamples: z
    .number()
    .int("Failed samples must be a whole number.")
    .nonnegative("Failed samples must be zero or greater.")
    .optional(),
  errorMessage: z.string().trim().optional().nullable(),
});

const vodAnalysisEventPayloadBaseSchema = z.object({
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
});

type VodAnalysisEventPayloadForValidation = z.infer<
  typeof vodAnalysisEventPayloadBaseSchema
>;

function validateVodAnalysisEventRequiredFields(
  input: Pick<
    VodAnalysisEventPayloadForValidation,
    "eventType" | "actorLabel" | "targetLabel" | "teamLabel"
  >,
  ctx: z.RefinementCtx
) {
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
}

const vodAnalysisEventPayloadSchema =
  vodAnalysisEventPayloadBaseSchema.superRefine(
    validateVodAnalysisEventRequiredFields
  );

export const createVodAnalysisEventInputSchema = vodAnalysisEventPayloadSchema;

export const vodAnalysisEventIdInputSchema = z.number().int().positive();

export const updateVodAnalysisEventInputSchema =
  vodAnalysisEventPayloadSchema.safeExtend({
    id: vodAnalysisEventIdInputSchema,
  });

export const deleteVodAnalysisEventInputSchema = z.object({
  id: vodAnalysisEventIdInputSchema,
  vodAnalysisId: vodAnalysisIdInputSchema,
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

export const detectedAutomationEventInputSchema =
  vodAnalysisEventPayloadBaseSchema
    .omit({ vodAnalysisId: true })
    .safeExtend({
      confidence: z
        .number()
        .int("Detected event confidence must be a whole number.")
        .min(0, "Detected event confidence must be between 0 and 100.")
        .max(100, "Detected event confidence must be between 0 and 100.")
        .optional()
        .nullable(),
    })
    .superRefine(validateVodAnalysisEventRequiredFields);

export const ingestAutomationDetectionsInputSchema = z.object({
  vodAnalysisId: vodAnalysisIdInputSchema,
  captureJobId: z.number().int().positive(),
  detections: z
    .array(detectedAutomationEventInputSchema)
    .nonempty("At least one detected event is required."),
});

export const runMockVodAutomationDetectionsInputSchema = z.object({
  vodAnalysisId: vodAnalysisIdInputSchema,
  captureJobId: z.number().int().positive(),
});

export const processVodCaptureJobInputSchema = z.object({
  vodAnalysisId: vodAnalysisIdInputSchema,
  captureJobId: z.number().int().positive(),
});

export const latestCaptureFramePreviewInputSchema = z.object({
  vodAnalysisId: vodAnalysisIdInputSchema,
  captureJobId: z.number().int().positive().optional(),
});

export const updateVodSuggestedEventInputSchema =
  vodAnalysisEventPayloadBaseSchema
    .omit({ vodAnalysisId: true })
    .safeExtend({
      id: z.number().int().positive(),
      confidence: z
        .number()
        .int("Suggested event confidence must be a whole number.")
        .min(0, "Suggested event confidence must be between 0 and 100.")
        .max(100, "Suggested event confidence must be between 0 and 100.")
        .optional()
        .nullable(),
    })
    .superRefine(validateVodAnalysisEventRequiredFields);

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

export function addPendingSuggestedCountsToVodAnalyses(
  rows: VodAnalysisRecord[],
  countsByVodAnalysisId: PendingSuggestedEventCountsByVodAnalysisId
): VodAnalysisListItem[] {
  return rows.map(row => ({
    ...row,
    pendingSuggestedCount: countsByVodAnalysisId[row.id] ?? 0,
  }));
}

export async function getPendingSuggestedEventCountsByVodAnalysisIds(
  ids: number[],
  dbClient?: PendingSuggestedEventCountDb | null
): Promise<PendingSuggestedEventCountsByVodAnalysisId> {
  const uniqueIds = Array.from(
    new Set(ids.map(id => vodAnalysisIdInputSchema.parse(id)))
  );

  if (uniqueIds.length === 0) {
    return {};
  }

  const runQuery = (db: PendingSuggestedEventCountDb) =>
    db
      .select({
        vodAnalysisId: vodSuggestedEvents.vodAnalysisId,
        pendingSuggestedCount: count(),
      })
      .from(vodSuggestedEvents)
      .where(
        and(
          inArray(vodSuggestedEvents.vodAnalysisId, uniqueIds),
          eq(vodSuggestedEvents.status, "pending")
        )
      )
      .groupBy(vodSuggestedEvents.vodAnalysisId);

  const db =
    dbClient ?? ((await getDb()) as PendingSuggestedEventCountDb | null);

  if (!db) {
    throw new Error(
      "Database is not available for VOD suggested event count listing."
    );
  }

  const countRows = await runQuery(db);

  return Object.fromEntries(
    countRows.map(row => [row.vodAnalysisId, Number(row.pendingSuggestedCount)])
  );
}

export async function listVodAnalyses(
  dbClient?: VodAnalysisListDb | null
): Promise<VodAnalysisListItem[]> {
  const runListQuery = (db: ListableDb) =>
    db
      .select(vodAnalysisFields)
      .from(vodAnalyses)
      .orderBy(desc(vodAnalyses.createdAt), desc(vodAnalyses.id));

  if (dbClient) {
    const rows = await runListQuery(dbClient);
    const countsByVodAnalysisId =
      await getPendingSuggestedEventCountsByVodAnalysisIds(
        rows.map(row => row.id),
        dbClient
      );

    return addPendingSuggestedCountsToVodAnalyses(rows, countsByVodAnalysisId);
  }

  const db = await getDb();

  if (!db) {
    throw new Error("Database is not available for VOD analysis listing.");
  }

  const listDb = db as unknown as VodAnalysisListDb;
  const rows = await runListQuery(listDb);
  const countsByVodAnalysisId =
    await getPendingSuggestedEventCountsByVodAnalysisIds(
      rows.map(row => row.id),
      listDb
    );

  return addPendingSuggestedCountsToVodAnalyses(rows, countsByVodAnalysisId);
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

const vodCaptureJobFields = {
  id: vodCaptureJobs.id,
  vodAnalysisId: vodCaptureJobs.vodAnalysisId,
  status: vodCaptureJobs.status,
  source: vodCaptureJobs.source,
  sampleIntervalSeconds: vodCaptureJobs.sampleIntervalSeconds,
  plannedSamples: vodCaptureJobs.plannedSamples,
  processedSamples: vodCaptureJobs.processedSamples,
  failedSamples: vodCaptureJobs.failedSamples,
  errorMessage: vodCaptureJobs.errorMessage,
  startedAt: vodCaptureJobs.startedAt,
  completedAt: vodCaptureJobs.completedAt,
  createdAt: vodCaptureJobs.createdAt,
  updatedAt: vodCaptureJobs.updatedAt,
};

export async function createVodCaptureJob(
  vodAnalysisId: number,
  source: VodCaptureJobSource = "manual_debug",
  dbClient?: CaptureJobInsertableDb | null
): Promise<CreateVodCaptureJobResult> {
  const parsedVodAnalysisId = vodAnalysisIdInputSchema.parse(vodAnalysisId);
  const parsedSource = z.enum(VOD_CAPTURE_JOB_SOURCES).parse(source);
  const db = dbClient ?? ((await getDb()) as CaptureJobInsertableDb | null);

  if (!db) {
    throw new Error("Database is not available for VOD capture job creation.");
  }

  const vodAnalysis = await getVodAnalysisById(parsedVodAnalysisId, db);

  if (!vodAnalysis) {
    return { status: "not_found", vodAnalysis: null };
  }

  const readiness = getVodCaptureReadiness(vodAnalysis);

  if (!readiness.isReady) {
    return { status: "not_ready", vodAnalysis, readiness };
  }

  const samplePlan = buildFrameSamplingPlan(vodAnalysis.durationSeconds);
  const captureJob: InsertVodCaptureJob = {
    vodAnalysisId: parsedVodAnalysisId,
    status: "queued",
    source: parsedSource,
    sampleIntervalSeconds: samplePlan.intervalSeconds,
    plannedSamples: samplePlan.timestamps.length,
    processedSamples: 0,
    failedSamples: 0,
  };

  await db.insert(vodCaptureJobs).values(captureJob);

  return {
    status: "created",
    vodAnalysis,
    readiness,
    captureJob,
  };
}

export function buildVodCaptureJobStatusUpdate(
  input: UpdateVodCaptureJobStatusInput
): UpdateVodCaptureJobStatusResult {
  const parsedInput = updateVodCaptureJobStatusInputSchema.parse(input);
  const update: Partial<InsertVodCaptureJob> = {
    status: parsedInput.status,
  };

  if (parsedInput.processedSamples !== undefined) {
    update.processedSamples = parsedInput.processedSamples;
  }

  if (parsedInput.failedSamples !== undefined) {
    update.failedSamples = parsedInput.failedSamples;
  }

  if (parsedInput.status === "processing") {
    update.startedAt = new Date();
  }

  if (["complete", "failed", "cancelled"].includes(parsedInput.status)) {
    update.completedAt = new Date();
  }

  if (parsedInput.status === "failed") {
    update.errorMessage = parsedInput.errorMessage?.trim() || null;
  }

  return {
    status: "updated",
    id: parsedInput.id,
    vodAnalysisId: parsedInput.vodAnalysisId,
    update,
  };
}

export async function updateVodCaptureJobStatus(
  input: UpdateVodCaptureJobStatusInput,
  dbClient?: CaptureJobUpdateableDb | null
): Promise<UpdateVodCaptureJobStatusResult> {
  const result = buildVodCaptureJobStatusUpdate(input);
  const db = dbClient ?? ((await getDb()) as CaptureJobUpdateableDb | null);

  if (!db) {
    throw new Error(
      "Database is not available for VOD capture job status updates."
    );
  }

  await db
    .update(vodCaptureJobs)
    .set(result.update)
    .where(
      and(
        eq(vodCaptureJobs.id, result.id),
        eq(vodCaptureJobs.vodAnalysisId, result.vodAnalysisId)
      )
    );

  return result;
}

async function getVodCaptureJobByIdForProcessing(
  id: number,
  db: ProcessVodCaptureJobDb
): Promise<VodCaptureJobRecord | null> {
  const [captureJob] = (await db
    .select(vodCaptureJobFields)
    .from(vodCaptureJobs)
    .where(eq(vodCaptureJobs.id, id))
    .limit(1)) as unknown as VodCaptureJobRecord[];

  return captureJob ?? null;
}

export const conservativeVodCaptureSampleDetector: VodCaptureSampleDetector =
  createCenterEventTextSampleDetector();

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown capture processing error.";
}

export async function processVodCaptureJob(
  input: ProcessVodCaptureJobInput,
  dbClient?: ProcessVodCaptureJobDb | null,
  detector: VodCaptureSampleDetector = conservativeVodCaptureSampleDetector,
  frameExtractor: VodFrameExtractor = extractVodFrame
): Promise<ProcessVodCaptureJobResult> {
  const parsedInput = processVodCaptureJobInputSchema.parse(input);
  const db = dbClient ?? ((await getDb()) as ProcessVodCaptureJobDb | null);

  if (!db) {
    throw new Error(
      "Database is not available for VOD capture job processing."
    );
  }

  const baseResult = {
    vodAnalysisId: parsedInput.vodAnalysisId,
    captureJobId: parsedInput.captureJobId,
    processedSamples: 0,
    failedSamples: 0,
    createdSuggestionCount: 0,
  } satisfies Omit<ProcessVodCaptureJobResult, "status">;

  const vodAnalysis = await getVodAnalysisById(
    parsedInput.vodAnalysisId,
    db as unknown as GetByIdDb
  );

  if (!vodAnalysis) {
    return { ...baseResult, status: "not_found" };
  }

  const captureJob = await getVodCaptureJobByIdForProcessing(
    parsedInput.captureJobId,
    db
  );

  if (!captureJob) {
    return { ...baseResult, status: "not_found" };
  }

  if (captureJob.vodAnalysisId !== parsedInput.vodAnalysisId) {
    return { ...baseResult, status: "invalid_capture_job" };
  }

  if (captureJob.status !== "queued") {
    return {
      ...baseResult,
      status: "invalid_capture_job_status",
      errorMessage: `Capture job ${captureJob.id} must be queued before processing.`,
    };
  }

  let processedSamples = 0;
  let failedSamples = 0;
  let createdSuggestionCount = 0;
  let firstFrameCaptureErrorMessage: string | undefined;
  const samplePlan = buildFrameSamplingPlan(
    vodAnalysis.durationSeconds,
    captureJob.sampleIntervalSeconds
  );

  const updateJob = async (values: Partial<InsertVodCaptureJob>) => {
    await db
      .update(vodCaptureJobs)
      .set(values)
      .where(
        and(
          eq(vodCaptureJobs.id, parsedInput.captureJobId),
          eq(vodCaptureJobs.vodAnalysisId, parsedInput.vodAnalysisId)
        )
      );
  };

  await updateJob({
    status: "processing",
    processedSamples: 0,
    failedSamples: 0,
    errorMessage: null,
    startedAt: new Date(),
  });

  try {
    for (
      let sampleIndex = 0;
      sampleIndex < samplePlan.timestamps.length;
      sampleIndex += 1
    ) {
      const sampleTimestampSeconds = samplePlan.timestamps[sampleIndex];
      try {
        const frameCapture = await frameExtractor({
          vodAnalysisId: parsedInput.vodAnalysisId,
          captureJobId: parsedInput.captureJobId,
          sourceUrl:
            vodAnalysis.normalizedSourceUrl ?? vodAnalysis.sourceUrl ?? "",
          timestampSeconds: sampleTimestampSeconds,
          sampleIndex,
        });

        if (frameCapture.status === "failed") {
          failedSamples += 1;
          firstFrameCaptureErrorMessage ??= frameCapture.errorMessage;
        } else {
          processedSamples += 1;
        }

        const detections = await detector({
          vodAnalysis,
          captureJob,
          sampleTimestampSeconds,
          sampleIndex,
          samplePlan,
          frameCapture,
        });

        if (detections.length > 0) {
          const enrichedDetections = detections.map(detection => ({
            ...detection,
            metadata: {
              ...(typeof detection.metadata === "object" &&
              detection.metadata !== null &&
              !Array.isArray(detection.metadata)
                ? detection.metadata
                : Object.hasOwn(detection, "metadata")
                  ? { detectorMetadata: detection.metadata }
                  : {}),
              detectorVersion:
                typeof detection.metadata === "object" &&
                detection.metadata !== null &&
                !Array.isArray(detection.metadata) &&
                "detectorVersion" in detection.metadata &&
                typeof detection.metadata.detectorVersion === "string"
                  ? detection.metadata.detectorVersion
                  : "debug-frame-v1",
              sampleIndex,
              timestampSeconds: sampleTimestampSeconds,
              frameCaptureStatus: frameCapture.status,
              ...(frameCapture.status === "captured"
                ? {
                    relativeFramePath: frameCapture.relativeFramePath,
                    fileName: frameCapture.fileName,
                  }
                : { frameCaptureMessage: frameCapture.errorMessage }),
            },
          }));
          const ingestResult = await ingestAutomationDetections(
            {
              vodAnalysisId: parsedInput.vodAnalysisId,
              captureJobId: parsedInput.captureJobId,
              detections: enrichedDetections,
            },
            db
          );

          if (ingestResult.status !== "created") {
            throw new Error(
              `Automation detection ingestion returned ${ingestResult.status}.`
            );
          }

          createdSuggestionCount += ingestResult.createdCount;
        }
      } catch (error) {
        failedSamples += 1;
        throw new Error(
          `Capture sample ${sampleIndex + 1} at ${sampleTimestampSeconds}s failed: ${getErrorMessage(error)}`
        );
      } finally {
        await updateJob({ processedSamples, failedSamples });
      }
    }

    const completedErrorMessage =
      failedSamples > 0 ? firstFrameCaptureErrorMessage : undefined;

    await updateJob({
      status: "complete",
      processedSamples,
      failedSamples,
      errorMessage: completedErrorMessage ?? null,
      completedAt: new Date(),
    });

    return {
      status: "complete",
      vodAnalysisId: parsedInput.vodAnalysisId,
      captureJobId: parsedInput.captureJobId,
      processedSamples,
      failedSamples,
      createdSuggestionCount,
      ...(completedErrorMessage ? { errorMessage: completedErrorMessage } : {}),
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);

    await updateJob({
      status: "failed",
      processedSamples,
      failedSamples,
      errorMessage,
      completedAt: new Date(),
    });

    return {
      status: "failed",
      vodAnalysisId: parsedInput.vodAnalysisId,
      captureJobId: parsedInput.captureJobId,
      processedSamples,
      failedSamples,
      createdSuggestionCount,
      errorMessage,
    };
  }
}

export async function listVodCaptureJobs(
  vodAnalysisId: number,
  dbClient?: CaptureJobListableDb | null
): Promise<VodCaptureJobRecord[]> {
  const parsedVodAnalysisId = vodAnalysisIdInputSchema.parse(vodAnalysisId);
  const runQuery = (db: CaptureJobListableDb) =>
    db
      .select(vodCaptureJobFields)
      .from(vodCaptureJobs)
      .where(eq(vodCaptureJobs.vodAnalysisId, parsedVodAnalysisId))
      .orderBy(desc(vodCaptureJobs.createdAt), desc(vodCaptureJobs.id));

  const db = dbClient ?? ((await getDb()) as CaptureJobListableDb | null);

  if (!db) {
    throw new Error("Database is not available for VOD capture job listing.");
  }

  return runQuery(db);
}

export async function getLatestVodCaptureJob(
  vodAnalysisId: number,
  dbClient?: CaptureJobLatestDb | null
): Promise<VodCaptureJobRecord | null> {
  const parsedVodAnalysisId = vodAnalysisIdInputSchema.parse(vodAnalysisId);
  const runQuery = (db: CaptureJobLatestDb) =>
    db
      .select(vodCaptureJobFields)
      .from(vodCaptureJobs)
      .where(eq(vodCaptureJobs.vodAnalysisId, parsedVodAnalysisId))
      .orderBy(desc(vodCaptureJobs.createdAt), desc(vodCaptureJobs.id))
      .limit(1);

  const db = dbClient ?? ((await getDb()) as CaptureJobLatestDb | null);

  if (!db) {
    throw new Error(
      "Database is not available for latest VOD capture job lookup."
    );
  }

  const [captureJob] = await runQuery(db);
  return captureJob ?? null;
}

async function getVodCaptureJobByIdForPreview(
  id: number,
  db: ProcessVodCaptureJobDb
): Promise<VodCaptureJobRecord | null> {
  const [captureJob] = (await db
    .select(vodCaptureJobFields)
    .from(vodCaptureJobs)
    .where(eq(vodCaptureJobs.id, id))
    .limit(1)) as unknown as VodCaptureJobRecord[];

  return captureJob ?? null;
}

function buildLatestFramePreviewResult(
  vodAnalysis: VodAnalysisRecord,
  captureJobId: number | null,
  frame: VodCaptureFrameFilePreview | null
): VodLatestCaptureFramePreviewResult {
  const zones = getVodHudZonePreset(vodAnalysis.videoPov).zones;

  if (!frame || captureJobId === null) {
    return {
      status: "not_found",
      vodAnalysisId: vodAnalysis.id,
      captureJobId,
      frameUrl: null,
      relativeFramePath: null,
      fileName: null,
      timestampSeconds: null,
      zones,
    };
  }

  return {
    status: "available",
    vodAnalysisId: vodAnalysis.id,
    captureJobId,
    frameUrl: buildVodCaptureFrameUrl(
      vodAnalysis.id,
      captureJobId,
      frame.fileName
    ),
    relativeFramePath: frame.relativeFramePath,
    fileName: frame.fileName,
    timestampSeconds: frame.timestampSeconds,
    zones,
  };
}

export async function getLatestCaptureFramePreview(
  input: z.infer<typeof latestCaptureFramePreviewInputSchema>,
  dbClient?: (GetByIdDb & CaptureJobLatestDb & ProcessVodCaptureJobDb) | null
): Promise<VodLatestCaptureFramePreviewResult | null> {
  const parsedInput = latestCaptureFramePreviewInputSchema.parse(input);
  const db =
    dbClient ??
    ((await getDb()) as
      | (GetByIdDb & CaptureJobLatestDb & ProcessVodCaptureJobDb)
      | null);

  if (!db) {
    throw new Error(
      "Database is not available for VOD capture frame preview lookup."
    );
  }

  const vodAnalysis = await getVodAnalysisById(
    parsedInput.vodAnalysisId,
    db as GetByIdDb
  );

  if (!vodAnalysis) {
    return null;
  }

  const captureJob = parsedInput.captureJobId
    ? await getVodCaptureJobByIdForPreview(parsedInput.captureJobId, db)
    : await getLatestVodCaptureJob(parsedInput.vodAnalysisId, db);

  if (!captureJob || captureJob.vodAnalysisId !== parsedInput.vodAnalysisId) {
    return buildLatestFramePreviewResult(
      vodAnalysis,
      parsedInput.captureJobId ?? null,
      null
    );
  }

  const frame = await getLatestVodCaptureFrameFile(
    parsedInput.vodAnalysisId,
    captureJob.id
  );

  return buildLatestFramePreviewResult(vodAnalysis, captureJob.id, frame);
}

function normalizeCountValue(value: number | string | bigint): number {
  return Number(value);
}

export async function getVodAutomationStatus(
  vodAnalysisId: number,
  dbClient?: AutomationStatusDb | null,
  binaryChecker: () => Promise<VodFrameCaptureBinaryCheck> = checkVodFrameCaptureBinaries
): Promise<VodAutomationStatusSummary | null> {
  const parsedVodAnalysisId = vodAnalysisIdInputSchema.parse(vodAnalysisId);
  const db = dbClient ?? ((await getDb()) as AutomationStatusDb | null);

  if (!db) {
    throw new Error("Database is not available for VOD automation status.");
  }

  const vodAnalysis = await getVodAnalysisById(
    parsedVodAnalysisId,
    db as GetByIdDb
  );

  if (!vodAnalysis) {
    return null;
  }

  const suggestedCountDb = db as SuggestedEventStatusCountDb;
  const manualCountDb = db as ManualEventCountDb;
  const [
    latestCaptureJob,
    suggestedCountRows,
    manualCountRows,
    frameCaptureBinaries,
  ] = await Promise.all([
    getLatestVodCaptureJob(parsedVodAnalysisId, db as CaptureJobLatestDb),
    suggestedCountDb
      .select({
        status: vodSuggestedEvents.status,
        suggestedCount: count(),
      })
      .from(vodSuggestedEvents)
      .where(eq(vodSuggestedEvents.vodAnalysisId, parsedVodAnalysisId))
      .groupBy(vodSuggestedEvents.status),
    manualCountDb
      .select({ confirmedManualEventCount: count() })
      .from(vodAnalysisEvents)
      .where(eq(vodAnalysisEvents.vodAnalysisId, parsedVodAnalysisId)),
    binaryChecker(),
  ]);

  const suggestedCounts: Record<VodSuggestedEventStatus, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  for (const row of suggestedCountRows) {
    suggestedCounts[row.status] = normalizeCountValue(row.suggestedCount);
  }

  return {
    vodAnalysisId: parsedVodAnalysisId,
    ocrEnabled: isVodAutomationOcrEnabled(),
    ocrConfidenceThreshold: getVodAutomationOcrConfidenceThreshold(),
    readiness: getVodCaptureReadiness(vodAnalysis),
    frameCaptureBinaries,
    latestCaptureJob,
    pendingSuggestedCount: suggestedCounts.pending,
    approvedSuggestedCount: suggestedCounts.approved,
    rejectedSuggestedCount: suggestedCounts.rejected,
    confirmedManualEventCount: normalizeCountValue(
      manualCountRows[0]?.confirmedManualEventCount ?? 0
    ),
  };
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

function getTwitchVodId(vod: VodAnalysisRecord): string | null {
  if (vod.sourceId?.trim() && /^\d+$/.test(vod.sourceId.trim())) {
    return vod.sourceId.trim();
  }

  const parsedSource = parseVodSource(vod.normalizedSourceUrl || vod.sourceUrl);

  if (
    parsedSource.valid &&
    parsedSource.sourceType === "twitch" &&
    parsedSource.sourceId &&
    /^\d+$/.test(parsedSource.sourceId)
  ) {
    return parsedSource.sourceId;
  }

  return null;
}

export function buildVodAnalysisMetadataUpdate(
  metadata: TwitchMetadata
): Partial<InsertVodAnalysis> {
  const update: Partial<InsertVodAnalysis> = {};
  const title = metadata.title?.trim();

  if (title) {
    update.title = title;
  }

  const thumbnailUrl = metadata.thumbnailUrl?.trim();

  if (thumbnailUrl) {
    update.thumbnailUrl = thumbnailUrl;
  }

  if (metadata.durationSeconds && metadata.durationSeconds > 0) {
    update.durationSeconds = metadata.durationSeconds;
  }

  return update;
}

export async function refreshTwitchMetadataForVodAnalysis(
  vodAnalysisId: number,
  dbClient?: UpdateVodAnalysisMetadataDb | null,
  metadataFetcher: TwitchMetadataFetcher = fetchTwitchVodMetadata
): Promise<RefreshTwitchMetadataResult> {
  const parsedVodAnalysisId = vodAnalysisIdInputSchema.parse(vodAnalysisId);
  const db =
    dbClient ?? ((await getDb()) as UpdateVodAnalysisMetadataDb | null);

  if (!db) {
    throw new Error(
      "Database is not available for VOD analysis metadata refresh."
    );
  }

  const vod = await getVodAnalysisById(parsedVodAnalysisId, db);

  if (!vod) {
    return { status: "not_found", vodAnalysis: null };
  }

  if (vod.sourceType !== "twitch") {
    return { status: "not_twitch", vodAnalysis: vod };
  }

  const twitchVodId = getTwitchVodId(vod);

  if (!twitchVodId) {
    return { status: "not_found", vodAnalysis: vod };
  }

  const metadataResult = await metadataFetcher(twitchVodId);

  if (metadataResult.status !== "success") {
    return { status: metadataResult.status, vodAnalysis: vod };
  }

  const updateValues = buildVodAnalysisMetadataUpdate(metadataResult.metadata);
  const metadataSummary: RefreshTwitchMetadataSummary = {
    thumbnailUrlReturned: Boolean(metadataResult.metadata.thumbnailUrl?.trim()),
    thumbnailUrlUpdated: Boolean(updateValues.thumbnailUrl),
    thumbnailUrl: metadataResult.metadata.thumbnailUrl?.trim() || null,
    existingThumbnailUrl: vod.thumbnailUrl?.trim() || null,
    ...(metadataResult.metadata.videoType
      ? { videoType: metadataResult.metadata.videoType }
      : {}),
    ...(metadataResult.metadata.url
      ? { url: metadataResult.metadata.url }
      : {}),
  };

  if (Object.keys(updateValues).length > 0) {
    await db
      .update(vodAnalyses)
      .set(updateValues)
      .where(eq(vodAnalyses.id, parsedVodAnalysisId));
  }

  const updatedVod = {
    ...vod,
    ...updateValues,
  };

  return {
    status: "updated",
    vodAnalysis: updatedVod,
    metadata: metadataResult.metadata,
    metadataSummary,
  };
}

function serializeEventMetadata(metadata: unknown) {
  return metadata === undefined || metadata === null
    ? null
    : JSON.stringify(metadata);
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
    metadata: serializeEventMetadata(parsedInput.metadata),
  };
}

export function buildVodAnalysisEventUpdate(
  input: UpdateVodAnalysisEventInput
): Partial<InsertVodAnalysisEvent> {
  const parsedInput = updateVodAnalysisEventInputSchema.parse(input);
  const values: Partial<InsertVodAnalysisEvent> = {
    eventType: parsedInput.eventType,
    timestampSeconds: parsedInput.timestampSeconds,
    actorLabel: normalizeEventLabel(parsedInput.actorLabel),
    targetLabel: normalizeEventLabel(parsedInput.targetLabel),
    teamLabel: normalizeEventLabel(parsedInput.teamLabel),
  };

  if (Object.hasOwn(parsedInput, "metadata")) {
    values.metadata = serializeEventMetadata(parsedInput.metadata);
  }

  return values;
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

export async function updateVodAnalysisEvent(
  input: UpdateVodAnalysisEventInput,
  dbClient?: EventUpdateableDb | null
): Promise<Partial<InsertVodAnalysisEvent>> {
  const parsedInput = updateVodAnalysisEventInputSchema.parse(input);
  const values = buildVodAnalysisEventUpdate(parsedInput);
  const db = dbClient ?? ((await getDb()) as EventUpdateableDb | null);

  if (!db) {
    throw new Error(
      "Database is not available for VOD analysis event updates."
    );
  }

  await db
    .update(vodAnalysisEvents)
    .set(values)
    .where(
      and(
        eq(vodAnalysisEvents.id, parsedInput.id),
        eq(vodAnalysisEvents.vodAnalysisId, parsedInput.vodAnalysisId)
      )
    );

  return values;
}

export async function deleteVodAnalysisEvent(
  input: DeleteVodAnalysisEventInput,
  dbClient?: EventDeleteableDb | null
): Promise<DeleteVodAnalysisEventInput> {
  const parsedInput = deleteVodAnalysisEventInputSchema.parse(input);
  const db = dbClient ?? ((await getDb()) as EventDeleteableDb | null);

  if (!db) {
    throw new Error(
      "Database is not available for VOD analysis event deletion."
    );
  }

  await db
    .delete(vodAnalysisEvents)
    .where(
      and(
        eq(vodAnalysisEvents.id, parsedInput.id),
        eq(vodAnalysisEvents.vodAnalysisId, parsedInput.vodAnalysisId)
      )
    );

  return parsedInput;
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
    metadata: serializeEventMetadata(parsedInput.metadata),
    source: parsedInput.source,
    confidence: parsedInput.confidence ?? null,
    status: parsedInput.status,
    confirmedVodEventId: null,
  };
}

export function buildVodSuggestedEventUpdate(
  input: UpdateVodSuggestedEventInput
): Partial<InsertVodSuggestedEvent> {
  const parsedInput = updateVodSuggestedEventInputSchema.parse(input);
  const values: Partial<InsertVodSuggestedEvent> = {
    eventType: parsedInput.eventType,
    timestampSeconds: parsedInput.timestampSeconds,
    actorLabel: normalizeEventLabel(parsedInput.actorLabel),
    targetLabel: normalizeEventLabel(parsedInput.targetLabel),
    teamLabel: normalizeEventLabel(parsedInput.teamLabel),
    confidence: parsedInput.confidence ?? null,
  };

  if (Object.hasOwn(parsedInput, "metadata")) {
    values.metadata = serializeEventMetadata(parsedInput.metadata);
  }

  return values;
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

function buildAutomationDetectionMetadata(
  captureJobId: number,
  detection: DetectedAutomationEventInput
) {
  if (Object.hasOwn(detection, "metadata")) {
    return {
      captureJobId,
      detectorMetadata: detection.metadata ?? null,
    };
  }

  return { captureJobId };
}

export function buildAutomationDetectionSuggestedEventInserts(
  input: IngestAutomationDetectionsInput
): InsertVodSuggestedEvent[] {
  const parsedInput = ingestAutomationDetectionsInputSchema.parse(input);

  return parsedInput.detections.map(detection =>
    buildVodSuggestedEventInsert({
      vodAnalysisId: parsedInput.vodAnalysisId,
      eventType: detection.eventType,
      timestampSeconds: detection.timestampSeconds,
      actorLabel: detection.actorLabel,
      targetLabel: detection.targetLabel,
      teamLabel: detection.teamLabel,
      confidence: detection.confidence,
      metadata: buildAutomationDetectionMetadata(
        parsedInput.captureJobId,
        detection
      ),
      source: "automation",
      status: "pending",
    })
  );
}

async function getVodCaptureJobByIdForIngestion(
  id: number,
  db: AutomationDetectionIngestDb
): Promise<VodCaptureJobRecord | null> {
  const [captureJob] = (await db
    .select(vodCaptureJobFields)
    .from(vodCaptureJobs)
    .where(eq(vodCaptureJobs.id, id))
    .limit(1)) as unknown as VodCaptureJobRecord[];

  return captureJob ?? null;
}

export async function ingestAutomationDetections(
  input: IngestAutomationDetectionsInput,
  dbClient?: AutomationDetectionIngestDb | null
): Promise<IngestAutomationDetectionsResult> {
  const parsedInput = ingestAutomationDetectionsInputSchema.parse(input);
  const suggestedEvents =
    buildAutomationDetectionSuggestedEventInserts(parsedInput);
  const db =
    dbClient ?? ((await getDb()) as AutomationDetectionIngestDb | null);

  if (!db) {
    throw new Error(
      "Database is not available for VOD automation detection ingestion."
    );
  }

  const [vodAnalysis] = (await db
    .select(vodAnalysisFields)
    .from(vodAnalyses)
    .where(eq(vodAnalyses.id, parsedInput.vodAnalysisId))
    .limit(1)) as VodAnalysisRecord[];

  if (!vodAnalysis) {
    return {
      status: "not_found",
      vodAnalysisId: parsedInput.vodAnalysisId,
      captureJobId: parsedInput.captureJobId,
      createdCount: 0,
      suggestedEvents: [],
    };
  }

  const captureJob = await getVodCaptureJobByIdForIngestion(
    parsedInput.captureJobId,
    db
  );

  if (
    !captureJob ||
    captureJob.vodAnalysisId !== parsedInput.vodAnalysisId ||
    captureJob.status === "cancelled"
  ) {
    return {
      status: "invalid_capture_job",
      vodAnalysisId: parsedInput.vodAnalysisId,
      captureJobId: parsedInput.captureJobId,
      createdCount: 0,
      suggestedEvents: [],
    };
  }

  for (const suggestedEvent of suggestedEvents) {
    await db.insert(vodSuggestedEvents).values(suggestedEvent);
  }

  return {
    status: "created",
    vodAnalysisId: parsedInput.vodAnalysisId,
    captureJobId: parsedInput.captureJobId,
    createdCount: suggestedEvents.length,
    suggestedEvents,
  };
}

const MOCK_VOD_AUTOMATION_DETECTIONS: DetectedAutomationEventInput[] = [
  {
    eventType: "tap",
    timestampSeconds: 30,
    actorLabel: "Mock Player 1",
    targetLabel: "1",
    teamLabel: "The Live Wires",
    confidence: 72,
    metadata: {
      mockAutomation: true,
      devOnly: true,
      generator: "runMockVodAutomationDetections",
      sampleIndex: 0,
    },
  },
  {
    eventType: "plug",
    timestampSeconds: 45,
    actorLabel: "Mock Player 1",
    targetLabel: "A",
    teamLabel: "The Live Wires",
    confidence: 76,
    metadata: {
      mockAutomation: true,
      devOnly: true,
      generator: "runMockVodAutomationDetections",
      sampleIndex: 1,
    },
  },
  {
    eventType: "steal_flip",
    timestampSeconds: 75,
    targetLabel: "A",
    teamLabel: "The High Notes",
    confidence: 81,
    metadata: {
      mockAutomation: true,
      devOnly: true,
      generator: "runMockVodAutomationDetections",
      sampleIndex: 2,
    },
  },
  {
    eventType: "cashout",
    timestampSeconds: 120,
    targetLabel: "A",
    teamLabel: "The High Notes",
    confidence: 88,
    metadata: {
      mockAutomation: true,
      devOnly: true,
      generator: "runMockVodAutomationDetections",
      sampleIndex: 3,
    },
  },
];

export async function runMockVodAutomationDetections(
  input: RunMockVodAutomationDetectionsInput,
  dbClient?: AutomationDetectionIngestDb | null
): Promise<RunMockVodAutomationDetectionsResult> {
  const parsedInput = runMockVodAutomationDetectionsInputSchema.parse(input);
  const result = await ingestAutomationDetections(
    {
      ...parsedInput,
      detections: MOCK_VOD_AUTOMATION_DETECTIONS,
    },
    dbClient
  );

  return {
    status: result.status,
    vodAnalysisId: result.vodAnalysisId,
    captureJobId: result.captureJobId,
    createdCount: result.createdCount,
  };
}

export async function updateVodSuggestedEvent(
  input: UpdateVodSuggestedEventInput,
  dbClient?: SuggestedEventUpdateableDb | null
): Promise<VodSuggestedEventRecord> {
  const parsedInput = updateVodSuggestedEventInputSchema.parse(input);
  const values = buildVodSuggestedEventUpdate(parsedInput);
  const db = dbClient ?? (await getDb());

  if (!db) {
    throw new Error(
      "Database is not available for VOD suggested event updates."
    );
  }

  const updateDb = db as unknown as SuggestedEventUpdateableDb;
  const suggestion = await getVodSuggestedEventByIdForWorkflow(
    parsedInput.id,
    updateDb
  );

  if (!suggestion) {
    throw new Error("Suggested event was not found.");
  }

  if (suggestion.status !== "pending") {
    throw new Error("Only pending suggested events can be edited.");
  }

  await updateDb
    .update(vodSuggestedEvents)
    .set(values)
    .where(
      and(
        eq(vodSuggestedEvents.id, parsedInput.id),
        eq(vodSuggestedEvents.status, "pending")
      )
    );

  const updatedSuggestion = await getVodSuggestedEventByIdForWorkflow(
    parsedInput.id,
    updateDb
  );

  return updatedSuggestion ?? { ...suggestion, ...values };
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
  db: SuggestedEventUpdateableDb
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
