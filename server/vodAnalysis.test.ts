import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  vodAnalyses,
  vodAnalysisEvents,
  vodCaptureJobs,
  vodSuggestedEvents,
} from "../drizzle/schema";
import {
  addPendingSuggestedCountsToVodAnalyses,
  approveVodSuggestedEvent,
  buildVodAnalysisEventInsert,
  buildVodAnalysisEventUpdate,
  buildVodAnalysisInsert,
  buildVodAnalysisMetadataUpdate,
  buildAutomationDetectionSuggestedEventInserts,
  buildVodSuggestedEventInsert,
  buildVodSuggestedEventUpdate,
  createVodAnalysis,
  createVodAnalysisEvent,
  createVodAnalysisEventInputSchema,
  createVodAnalysisInputSchema,
  createVodCaptureJob,
  deleteVodAnalysisEvent,
  deleteVodAnalysisEventInputSchema,
  createVodSuggestedEvent,
  createVodSuggestedEventInputSchema,
  getLatestCaptureFramePreview,
  getLatestVodCaptureJob,
  getVodAutomationStatus,
  getPendingSuggestedEventCountsByVodAnalysisIds,
  getVodAnalysisById,
  ingestAutomationDetections,
  ingestAutomationDetectionsInputSchema,
  detectedAutomationEventInputSchema,
  listVodAnalysisEvents,
  listVodAnalyses,
  listVodCaptureJobs,
  listVodSuggestedEvents,
  rejectVodSuggestedEvent,
  refreshTwitchMetadataForVodAnalysis,
  processVodCaptureJob,
  runMockVodAutomationDetections,
  updateVodAnalysisEvent,
  updateVodAnalysisEventInputSchema,
  updateVodSuggestedEvent,
  updateVodSuggestedEventInputSchema,
  sortVodSuggestedEventRecords,
  vodAnalysisIdInputSchema,
  type VodAnalysisEventRecord,
  type VodCaptureJobRecord,
  type PendingSuggestedEventCountRow,
  type VodAnalysisRecord,
  type VodSuggestedEventRecord,
  type ManualEventCountRow,
  type SuggestedEventStatusCountRow,
  buildVodCaptureJobStatusUpdate,
  updateVodCaptureJobStatus,
  updateVodCaptureJobStatusInputSchema,
  type UpdateVodCaptureJobStatusInput,
  type VodCaptureSampleDetector,
  type VodFrameExtractor,
} from "./vodAnalysis";
import { getVodHudZonePreset, VOD_HUD_ZONE_IDS } from "../shared/vod/hud-zones";
import {
  createCenterEventTextSampleDetector,
  parseCenterEventTextToDetections,
} from "./vodDetectors/centerEventTextDetector";
import type { CenterEventTextOcrResult } from "./vodDetectors/centerEventTextOcr";
import {
  getLatestVodCaptureFrameFile,
  resolveVodCaptureFramePath,
} from "./vodFrameCapture";
import { getSafeVodCaptureFramePathForRequest } from "./vodCaptureFrameRoute";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

afterEach(() => {
  vi.unstubAllEnvs();
});

const skippedFrameExtractor: VodFrameExtractor = async input => ({
  status: "skipped",
  timestampSeconds: input.timestampSeconds,
  sampleIndex: input.sampleIndex,
  errorMessage: "Frame extraction skipped in unit test.",
});

const capturedFrameExtractor: VodFrameExtractor = async input => ({
  status: "captured",
  timestampSeconds: input.timestampSeconds,
  sampleIndex: input.sampleIndex,
  framePath: `/workspace/murphtournaments-website/server/.cache/vod-capture/${input.vodAnalysisId}/${input.captureJobId}/sample-${String(input.sampleIndex + 1).padStart(4, "0")}-${String(input.timestampSeconds).padStart(6, "0")}.jpg`,
  relativeFramePath: `server/.cache/vod-capture/${input.vodAnalysisId}/${input.captureJobId}/sample-${String(input.sampleIndex + 1).padStart(4, "0")}-${String(input.timestampSeconds).padStart(6, "0")}.jpg`,
  fileName: `sample-${String(input.sampleIndex + 1).padStart(4, "0")}-${String(input.timestampSeconds).padStart(6, "0")}.jpg`,
});

function mockedCenterEventOcrResult(
  text: string,
  confidence: number | null = 92
): CenterEventTextOcrResult {
  return {
    normalizedText: text.trim().toUpperCase(),
    rawText: text,
    confidence,
    engine: "tesseract.js",
    engineVersion: "test",
    language: "eng",
    crop: {
      hudZoneId: "center_event_text",
      hudZoneLabel: "Center Event Text",
      sourceRect: { x: 0.28, y: 0.42, width: 0.44, height: 0.24 },
      pixelRect: { left: 538, top: 454, width: 845, height: 260 },
      sourceWidth: 1920,
      sourceHeight: 1080,
      scaleFactor: 1,
    },
    timestampSeconds: 0,
    sampleIndex: 0,
  };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createInsertDb() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));

  return { db: { insert }, insert, values };
}

function createEventInsertDb() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));

  return { db: { insert }, insert, values };
}

function createListDb(
  rows: VodAnalysisRecord[],
  countRows: PendingSuggestedEventCountRow[] = []
) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const groupBy = vi.fn().mockResolvedValue(countRows);
  const where = vi.fn(() => ({ groupBy }));
  const from = vi.fn(table =>
    table === vodAnalyses ? { orderBy } : { where }
  );
  const select = vi.fn(() => ({ from }));

  return { db: { select }, select, from, orderBy, where, groupBy };
}

function createSuggestedEventCountDb(
  countRows: PendingSuggestedEventCountRow[]
) {
  const groupBy = vi.fn().mockResolvedValue(countRows);
  const where = vi.fn(() => ({ groupBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return { db: { select }, select, from, where, groupBy };
}

function createGetByIdDb(rows: VodAnalysisRecord[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return { db: { select }, select, from, where, limit };
}

function createEventListDb(rows: VodAnalysisEventRecord[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return { db: { select }, select, from, where, orderBy };
}

function createEventUpdateDb() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));

  return { db: { update }, update, set, where };
}

function createEventDeleteDb() {
  const where = vi.fn().mockResolvedValue(undefined);
  const deleteFn = vi.fn(() => ({ where }));

  return { db: { delete: deleteFn }, deleteFn, where };
}

function createCaptureJobDb(vodRows: VodAnalysisRecord[]) {
  const insertedCaptureJobs: unknown[] = [];
  const values = vi.fn(async (job: unknown) => {
    insertedCaptureJobs.push(job);
  });
  const insert = vi.fn(() => ({ values }));
  const vodLimit = vi.fn().mockResolvedValue(vodRows);
  const vodWhere = vi.fn(() => ({ limit: vodLimit }));
  const captureOrderBy = vi.fn();
  const captureWhere = vi.fn(() => ({ orderBy: captureOrderBy }));
  const from = vi.fn(table => {
    if (table === vodAnalyses) return { where: vodWhere };
    return { where: captureWhere };
  });
  const select = vi.fn(() => ({ from }));

  return {
    db: { select, insert },
    select,
    from,
    insert,
    values,
    insertedCaptureJobs,
  };
}

function createCaptureJobUpdateDb() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));
  const insert = vi.fn();

  return { db: { update, insert }, update, set, where, insert };
}

function createCaptureJobListDb(rows: VodCaptureJobRecord[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return { db: { select }, select, from, where, orderBy };
}

function createLatestCaptureJobDb(rows: VodCaptureJobRecord[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn(() => ({ limit }));
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return { db: { select }, select, from, where, orderBy, limit };
}

function createAutomationStatusDb({
  vodRows,
  captureRows = [],
  suggestedCountRows = [],
  manualCountRows = [{ confirmedManualEventCount: 0 }],
}: {
  vodRows: VodAnalysisRecord[];
  captureRows?: VodCaptureJobRecord[];
  suggestedCountRows?: SuggestedEventStatusCountRow[];
  manualCountRows?: ManualEventCountRow[];
}) {
  const vodLimit = vi.fn().mockResolvedValue(vodRows);
  const vodWhere = vi.fn(() => ({ limit: vodLimit }));
  const captureLimit = vi.fn().mockResolvedValue(captureRows);
  const captureOrderBy = vi.fn(() => ({ limit: captureLimit }));
  const captureWhere = vi.fn(() => ({ orderBy: captureOrderBy }));
  const suggestedGroupBy = vi.fn().mockResolvedValue(suggestedCountRows);
  const suggestedWhere = vi.fn(() => ({ groupBy: suggestedGroupBy }));
  const manualWhere = vi.fn().mockResolvedValue(manualCountRows);
  const from = vi.fn(table => {
    if (table === vodAnalyses) return { where: vodWhere };
    if (table === vodCaptureJobs) return { where: captureWhere };
    if (table === vodSuggestedEvents) return { where: suggestedWhere };
    return { where: manualWhere };
  });
  const select = vi.fn(() => ({ from }));

  return {
    db: { select },
    select,
    from,
    vodWhere,
    vodLimit,
    captureWhere,
    captureOrderBy,
    captureLimit,
    suggestedWhere,
    suggestedGroupBy,
    manualWhere,
  };
}

function createSuggestedEventInsertDb() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));

  return { db: { insert }, insert, values };
}

function createAutomationDetectionIngestDb({
  vodRows,
  captureRows,
}: {
  vodRows: VodAnalysisRecord[];
  captureRows: VodCaptureJobRecord[];
}) {
  const insertedSuggestedEvents: unknown[] = [];
  const values = vi.fn(async (event: unknown) => {
    insertedSuggestedEvents.push(event);
  });
  const insert = vi.fn(() => ({ values }));
  const vodLimit = vi.fn().mockResolvedValue(vodRows);
  const vodWhere = vi.fn(() => ({ limit: vodLimit }));
  const captureLimit = vi.fn().mockResolvedValue(captureRows);
  const captureWhere = vi.fn(() => ({ limit: captureLimit }));
  const from = vi.fn(table => {
    if (table === vodAnalyses) return { where: vodWhere };
    return { where: captureWhere };
  });
  const select = vi.fn(() => ({ from }));

  return {
    db: { select, insert },
    select,
    from,
    insert,
    values,
    vodLimit,
    captureLimit,
    insertedSuggestedEvents,
  };
}

function createProcessCaptureJobDb({
  vodRows,
  captureRows,
}: {
  vodRows: VodAnalysisRecord[];
  captureRows: VodCaptureJobRecord[];
}) {
  const insertedSuggestedEvents: unknown[] = [];
  const updateSets: Array<Record<string, unknown>> = [];
  const values = vi.fn(async (event: unknown) => {
    insertedSuggestedEvents.push(event);
  });
  const insert = vi.fn(() => ({ values }));
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn((update: Record<string, unknown>) => {
    updateSets.push(update);
    return { where: updateWhere };
  });
  const update = vi.fn(() => ({ set }));
  const vodLimit = vi.fn().mockResolvedValue(vodRows);
  const vodWhere = vi.fn(() => ({ limit: vodLimit }));
  const captureLimit = vi.fn().mockResolvedValue(captureRows);
  const captureWhere = vi.fn(() => ({ limit: captureLimit }));
  const from = vi.fn(table => {
    if (table === vodAnalyses) return { where: vodWhere };
    return { where: captureWhere };
  });
  const select = vi.fn(() => ({ from }));

  return {
    db: { select, update, insert },
    select,
    insert,
    values,
    update,
    set,
    updateWhere,
    vodLimit,
    captureLimit,
    insertedSuggestedEvents,
    updateSets,
  };
}

function createSuggestedEventListDb(rows: VodSuggestedEventRecord[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return { db: { select }, select, from, where, orderBy };
}

function createSuggestedEventWorkflowDb(rows: VodSuggestedEventRecord[]) {
  const storedRows = [...rows];
  const insertedEvents: unknown[] = [];
  const set = vi.fn((values: Partial<VodSuggestedEventRecord>) => ({
    where: vi.fn(async () => {
      Object.assign(storedRows[0], values);
    }),
  }));
  const update = vi.fn(() => ({ set }));
  const values = vi.fn(async (event: unknown) => {
    insertedEvents.push(event);
    return { insertId: insertedEvents.length + 100 };
  });
  const insert = vi.fn(() => ({ values }));
  const limit = vi.fn(async () => [...storedRows]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));

  return {
    db: { select, insert, update },
    select,
    insert,
    values,
    update,
    set,
    insertedEvents,
    storedRows,
  };
}

describe("vodAnalysisIdInputSchema", () => {
  it("accepts positive integer ids", () => {
    expect(vodAnalysisIdInputSchema.parse(42)).toBe(42);
  });

  it("rejects non-positive and non-integer ids", () => {
    expect(vodAnalysisIdInputSchema.safeParse(0).success).toBe(false);
    expect(vodAnalysisIdInputSchema.safeParse(-1).success).toBe(false);
    expect(vodAnalysisIdInputSchema.safeParse(1.5).success).toBe(false);
  });
});

describe("createVodAnalysisInputSchema", () => {
  it("rejects invalid source URLs", () => {
    const result = createVodAnalysisInputSchema.safeParse({
      title: "Ranked finals",
      sourceUrl: "not a url",
      videoPov: "player",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a valid video URL.");
  });

  it("rejects invalid videoPov values", () => {
    const result = createVodAnalysisInputSchema.safeParse({
      title: "Ranked finals",
      sourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
      videoPov: "observer",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "VOD analysis videoPov must be player or spectator."
    );
  });

  it("requires a title", () => {
    const result = createVodAnalysisInputSchema.safeParse({
      title: "   ",
      sourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
      videoPov: "spectator",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "VOD analysis title is required."
    );
  });
});

describe("buildVodAnalysisInsert", () => {
  it("stores parsed source metadata and defaults status to created", () => {
    expect(
      buildVodAnalysisInsert({
        title: " Ranked finals ",
        sourceUrl: "https://www.twitch.tv/videos/1234567890?t=1h2m3s",
        videoPov: "player",
        thumbnailUrl: "https://example.com/thumb.jpg",
        durationSeconds: 3600,
      })
    ).toEqual({
      title: "Ranked finals",
      sourceType: "twitch",
      sourceUrl: "https://www.twitch.tv/videos/1234567890?t=1h2m3s",
      normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
      sourceId: "1234567890",
      sourceRef: "v1234567890",
      thumbnailUrl: "https://example.com/thumb.jpg",
      durationSeconds: 3600,
      videoPov: "player",
      status: "created",
    });
  });

  it("requires a valid player or spectator POV", () => {
    expect(() =>
      buildVodAnalysisInsert({
        title: "Ranked finals",
        sourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
        videoPov: "observer" as "player",
      })
    ).toThrow("VOD analysis videoPov must be player or spectator.");
  });

  it("rejects invalid source URLs before database access", async () => {
    const { db, insert } = createInsertDb();

    await expect(
      createVodAnalysis(
        {
          title: "Ranked finals",
          sourceUrl: "not a url",
          videoPov: "spectator",
        },
        db
      )
    ).rejects.toThrow("Enter a valid video URL.");

    expect(insert).not.toHaveBeenCalled();
  });
});

describe("createVodAnalysis", () => {
  it("inserts normalized VOD analysis values", async () => {
    const { db, insert, values } = createInsertDb();

    await expect(
      createVodAnalysis(
        {
          title: "Ranked finals",
          sourceUrl: "https://youtu.be/VIDEO_ID",
          videoPov: "spectator",
        },
        db
      )
    ).resolves.toMatchObject({
      sourceType: "youtube",
      normalizedSourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
      sourceId: "VIDEO_ID",
      sourceRef: "VIDEO_ID",
      videoPov: "spectator",
      status: "created",
    });

    expect(insert).toHaveBeenCalledWith(vodAnalyses);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Ranked finals",
        sourceType: "youtube",
        sourceUrl: "https://youtu.be/VIDEO_ID",
        normalizedSourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
        videoPov: "spectator",
        status: "created",
      })
    );
  });
});

describe("getPendingSuggestedEventCountsByVodAnalysisIds", () => {
  it("returns an empty result for empty ids without querying the DB", async () => {
    const { db, select } = createSuggestedEventCountDb([
      { vodAnalysisId: 1, pendingSuggestedCount: 1 },
    ]);

    await expect(
      getPendingSuggestedEventCountsByVodAnalysisIds([], db)
    ).resolves.toEqual({});
    expect(select).not.toHaveBeenCalled();
  });

  it("counts pending suggestions with one grouped query", async () => {
    const { db, select, from, where, groupBy } = createSuggestedEventCountDb([
      { vodAnalysisId: 1, pendingSuggestedCount: 2 },
      { vodAnalysisId: 3, pendingSuggestedCount: "4" },
    ]);

    await expect(
      getPendingSuggestedEventCountsByVodAnalysisIds([1, 3], db)
    ).resolves.toEqual({ 1: 2, 3: 4 });

    expect(select).toHaveBeenCalledWith({
      vodAnalysisId: vodSuggestedEvents.vodAnalysisId,
      pendingSuggestedCount: expect.anything(),
    });
    expect(from).toHaveBeenCalledWith(vodSuggestedEvents);
    expect(where).toHaveBeenCalledTimes(1);
    expect(groupBy).toHaveBeenCalledWith(vodSuggestedEvents.vodAnalysisId);
  });
});

describe("addPendingSuggestedCountsToVodAnalyses", () => {
  it("maps grouped count results onto list rows", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const rows: VodAnalysisRecord[] = [
      {
        id: 1,
        title: "With pending",
        sourceType: "youtube",
        sourceUrl: "https://youtu.be/ONE",
        normalizedSourceUrl: "https://www.youtube.com/watch?v=ONE",
        sourceId: "ONE",
        sourceRef: "ONE",
        thumbnailUrl: null,
        durationSeconds: null,
        videoPov: "player",
        status: "created",
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 2,
        title: "Without pending",
        sourceType: "twitch",
        sourceUrl: "https://www.twitch.tv/videos/1234567890",
        normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
        sourceId: "1234567890",
        sourceRef: "v1234567890",
        thumbnailUrl: null,
        durationSeconds: null,
        videoPov: "spectator",
        status: "created",
        createdAt,
        updatedAt: createdAt,
      },
    ];

    expect(addPendingSuggestedCountsToVodAnalyses(rows, { 1: 5 })).toEqual([
      { ...rows[0], pendingSuggestedCount: 5 },
      { ...rows[1], pendingSuggestedCount: 0 },
    ]);
  });
});

describe("listVodAnalyses", () => {
  it("selects list card fields newest-first", async () => {
    const firstCreatedAt = new Date("2026-01-02T00:00:00Z");
    const secondCreatedAt = new Date("2026-01-01T00:00:00Z");
    const rows: VodAnalysisRecord[] = [
      {
        id: 2,
        title: "Newest",
        sourceType: "youtube",
        sourceUrl: "https://youtu.be/NEW",
        normalizedSourceUrl: "https://www.youtube.com/watch?v=NEW",
        sourceId: "NEW",
        sourceRef: "NEW",
        thumbnailUrl: null,
        durationSeconds: null,
        videoPov: "player",
        status: "created",
        createdAt: firstCreatedAt,
        updatedAt: firstCreatedAt,
      },
      {
        id: 1,
        title: "Older",
        sourceType: "twitch",
        sourceUrl: "https://www.twitch.tv/videos/1234567890",
        normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
        sourceId: "1234567890",
        sourceRef: "v1234567890",
        thumbnailUrl: null,
        durationSeconds: null,
        videoPov: "spectator",
        status: "created",
        createdAt: secondCreatedAt,
        updatedAt: secondCreatedAt,
      },
    ];
    const { db, select, from, orderBy, where, groupBy } = createListDb(rows, [
      { vodAnalysisId: 2, pendingSuggestedCount: 3 },
    ]);

    await expect(listVodAnalyses(db)).resolves.toEqual([
      { ...rows[0], pendingSuggestedCount: 3 },
      { ...rows[1], pendingSuggestedCount: 0 },
    ]);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        id: vodAnalyses.id,
        title: vodAnalyses.title,
        sourceType: vodAnalyses.sourceType,
        normalizedSourceUrl: vodAnalyses.normalizedSourceUrl,
        videoPov: vodAnalyses.videoPov,
        status: vodAnalyses.status,
      })
    );
    expect(from).toHaveBeenCalledWith(vodAnalyses);
    expect(from).toHaveBeenCalledWith(vodSuggestedEvents);
    expect(where).toHaveBeenCalledTimes(1);
    expect(groupBy).toHaveBeenCalledWith(vodSuggestedEvents.vodAnalysisId);
    expect(orderBy).toHaveBeenCalledTimes(1);
  });

  it("includes zero pendingSuggestedCount when a list row has no grouped count", async () => {
    const createdAt = new Date("2026-01-03T00:00:00Z");
    const rows: VodAnalysisRecord[] = [
      {
        id: 9,
        title: "No suggestions",
        sourceType: "youtube",
        sourceUrl: "https://youtu.be/NONE",
        normalizedSourceUrl: "https://www.youtube.com/watch?v=NONE",
        sourceId: "NONE",
        sourceRef: "NONE",
        thumbnailUrl: null,
        durationSeconds: null,
        videoPov: "player",
        status: "created",
        createdAt,
        updatedAt: createdAt,
      },
    ];
    const { db } = createListDb(rows);

    await expect(listVodAnalyses(db)).resolves.toEqual([
      { ...rows[0], pendingSuggestedCount: 0 },
    ]);
  });
});

describe("getVodAnalysisById", () => {
  it("selects one VOD analysis by id", async () => {
    const createdAt = new Date("2026-01-02T00:00:00Z");
    const row: VodAnalysisRecord = {
      id: 7,
      title: "Detail",
      sourceType: "youtube",
      sourceUrl: "https://youtu.be/DETAIL",
      normalizedSourceUrl: "https://www.youtube.com/watch?v=DETAIL",
      sourceId: "DETAIL",
      sourceRef: "DETAIL",
      thumbnailUrl: "https://example.com/detail.jpg",
      durationSeconds: 75,
      videoPov: "player",
      status: "created",
      createdAt,
      updatedAt: createdAt,
    };
    const { db, select, from, where, limit } = createGetByIdDb([row]);

    await expect(getVodAnalysisById(7, db)).resolves.toEqual(row);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        id: vodAnalyses.id,
        title: vodAnalyses.title,
        sourceUrl: vodAnalyses.sourceUrl,
        updatedAt: vodAnalyses.updatedAt,
      })
    );
    expect(from).toHaveBeenCalledWith(vodAnalyses);
    expect(where).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(1);
  });

  it("returns null when no VOD analysis matches", async () => {
    const { db } = createGetByIdDb([]);

    await expect(getVodAnalysisById(999, db)).resolves.toBeNull();
  });

  it("rejects invalid ids before database access", async () => {
    const { db, select } = createGetByIdDb([]);

    await expect(getVodAnalysisById(0, db)).rejects.toThrow();
    expect(select).not.toHaveBeenCalled();
  });
});

describe("createVodAnalysisEventInputSchema", () => {
  const baseInput = {
    vodAnalysisId: 1,
    eventType: "death",
    timestampSeconds: 10,
    actorLabel: "Player A",
    targetLabel: "Player B",
  } as const;

  it("accepts supported event types", () => {
    expect(createVodAnalysisEventInputSchema.parse(baseInput).eventType).toBe(
      "death"
    );
  });

  it("rejects unsupported event types", () => {
    expect(
      createVodAnalysisEventInputSchema.safeParse({
        ...baseInput,
        eventType: "suggested_event",
      }).success
    ).toBe(false);
  });

  it("rejects invalid VOD ids", async () => {
    const { db, insert } = createEventInsertDb();

    await expect(
      createVodAnalysisEvent(
        {
          ...baseInput,
          vodAnalysisId: 0,
        },
        db
      )
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects invalid event types before database access", async () => {
    const { db, insert } = createEventInsertDb();

    await expect(
      createVodAnalysisEvent(
        {
          ...baseInput,
          eventType: "ocr_capture" as "death",
        },
        db
      )
    ).rejects.toThrow();
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects negative and non-integer timestamps", () => {
    expect(
      createVodAnalysisEventInputSchema.safeParse({
        ...baseInput,
        timestampSeconds: -1,
      }).success
    ).toBe(false);
    expect(
      createVodAnalysisEventInputSchema.safeParse({
        ...baseInput,
        timestampSeconds: 1.5,
      }).success
    ).toBe(false);
  });

  it.each([
    ["death", { actorLabel: "A", targetLabel: "B" }],
    ["tap", { actorLabel: "A", targetLabel: "1", teamLabel: "Orange" }],
    ["plug", { actorLabel: "A", targetLabel: "A", teamLabel: "Orange" }],
    ["cashout", { targetLabel: "A", teamLabel: "Orange" }],
    ["team_wipe", { actorLabel: "Orange", teamLabel: "Purple" }],
    ["team_spawn", { teamLabel: "Orange" }],
    ["steal_flip", { targetLabel: "B", teamLabel: "The Live Wires" }],
    ["revive", { actorLabel: "A", targetLabel: "B", teamLabel: "Orange" }],
    ["defib", { actorLabel: "A", targetLabel: "B", teamLabel: "Orange" }],
  ] as const)("accepts required fields for %s", (eventType, fields) => {
    expect(
      createVodAnalysisEventInputSchema.safeParse({
        vodAnalysisId: 1,
        eventType,
        timestampSeconds: 10,
        ...fields,
      }).success
    ).toBe(true);
  });

  it.each([
    ["death", { targetLabel: "B" }],
    ["tap", { actorLabel: "A", targetLabel: "1" }],
    ["plug", { actorLabel: "A", teamLabel: "Orange" }],
    ["cashout", { teamLabel: "Orange" }],
    ["team_wipe", { teamLabel: "Purple" }],
    ["team_spawn", {}],
    ["steal_flip", { teamLabel: "The Live Wires" }],
    ["revive", { actorLabel: "A", targetLabel: "B" }],
    ["defib", { targetLabel: "B", teamLabel: "Orange" }],
  ] as const)("rejects missing required fields for %s", (eventType, fields) => {
    expect(
      createVodAnalysisEventInputSchema.safeParse({
        vodAnalysisId: 1,
        eventType,
        timestampSeconds: 10,
        ...fields,
      }).success
    ).toBe(false);
  });
});

describe("updateVodAnalysisEventInputSchema", () => {
  const baseInput = {
    id: 9,
    vodAnalysisId: 1,
    eventType: "death",
    timestampSeconds: 10,
    actorLabel: "Player A",
    targetLabel: "Player B",
  } as const;

  it("validates required fields for changed event types", () => {
    expect(
      updateVodAnalysisEventInputSchema.safeParse({
        ...baseInput,
        eventType: "cashout",
        actorLabel: undefined,
        targetLabel: "A",
        teamLabel: "Orange",
      }).success
    ).toBe(true);

    expect(
      updateVodAnalysisEventInputSchema.safeParse({
        ...baseInput,
        eventType: "steal_flip",
        actorLabel: undefined,
        targetLabel: "B",
        teamLabel: "The Live Wires",
      }).success
    ).toBe(true);

    expect(
      updateVodAnalysisEventInputSchema.safeParse({
        ...baseInput,
        eventType: "cashout",
        actorLabel: undefined,
        targetLabel: undefined,
        teamLabel: "   ",
      }).success
    ).toBe(false);
  });

  it("rejects invalid ids, timestamps, and event types before database access", async () => {
    const { db, update } = createEventUpdateDb();

    await expect(
      updateVodAnalysisEvent(
        {
          ...baseInput,
          id: 0,
        },
        db
      )
    ).rejects.toThrow();
    await expect(
      updateVodAnalysisEvent(
        {
          ...baseInput,
          timestampSeconds: -1,
        },
        db
      )
    ).rejects.toThrow();
    expect(
      updateVodAnalysisEventInputSchema.safeParse({
        ...baseInput,
        eventType: "unsupported_event",
      }).success
    ).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});

describe("createVodAnalysisEvent", () => {
  it("inserts normalized manual event values", async () => {
    const { db, insert, values } = createEventInsertDb();

    await expect(
      createVodAnalysisEvent(
        {
          vodAnalysisId: 12,
          eventType: "team_wipe",
          timestampSeconds: 77,
          actorLabel: " Orange ",
          teamLabel: " Purple ",
          metadata: { note: "manual" },
        },
        db
      )
    ).resolves.toMatchObject({
      vodAnalysisId: 12,
      eventType: "team_wipe",
      timestampSeconds: 77,
      actorLabel: "Orange",
      teamLabel: "Purple",
      metadata: JSON.stringify({ note: "manual" }),
    });

    expect(insert).toHaveBeenCalledWith(vodAnalysisEvents);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        vodAnalysisId: 12,
        eventType: "team_wipe",
        timestampSeconds: 77,
      })
    );
  });

  it("builds inserts without suggested event, capture, frame extraction, or OCR fields", () => {
    expect(
      Object.keys(
        buildVodAnalysisEventInsert({
          vodAnalysisId: 1,
          eventType: "cashout",
          timestampSeconds: 30,
          targetLabel: "A",
          teamLabel: "Orange",
        })
      )
    ).toEqual([
      "vodAnalysisId",
      "eventType",
      "timestampSeconds",
      "actorLabel",
      "targetLabel",
      "teamLabel",
      "metadata",
    ]);
  });
});

describe("updateVodAnalysisEvent", () => {
  it("updates normalized manual event values scoped to the VOD", async () => {
    const { db, update, set, where } = createEventUpdateDb();

    await expect(
      updateVodAnalysisEvent(
        {
          id: 33,
          vodAnalysisId: 12,
          eventType: "team_wipe",
          timestampSeconds: 77,
          actorLabel: " Orange ",
          targetLabel: "   ",
          teamLabel: " Purple ",
          metadata: { note: "edited" },
        },
        db
      )
    ).resolves.toMatchObject({
      eventType: "team_wipe",
      timestampSeconds: 77,
      actorLabel: "Orange",
      targetLabel: null,
      teamLabel: "Purple",
      metadata: JSON.stringify({ note: "edited" }),
    });

    expect(update).toHaveBeenCalledWith(vodAnalysisEvents);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "team_wipe",
        timestampSeconds: 77,
        actorLabel: "Orange",
        targetLabel: null,
        teamLabel: "Purple",
      })
    );
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("does not overwrite metadata when metadata is omitted", () => {
    expect(
      buildVodAnalysisEventUpdate({
        id: 33,
        vodAnalysisId: 12,
        eventType: "cashout",
        timestampSeconds: 77,
        targetLabel: "A",
        teamLabel: "Orange",
      })
    ).not.toHaveProperty("metadata");
  });
});

describe("listVodAnalysisEvents", () => {
  it("sorts VOD events by timestamp then id", async () => {
    const createdAt = new Date("2026-01-02T00:00:00Z");
    const rows: VodAnalysisEventRecord[] = [
      {
        id: 1,
        vodAnalysisId: 7,
        eventType: "death",
        timestampSeconds: 10,
        actorLabel: "A",
        targetLabel: "B",
        teamLabel: null,
        metadata: null,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 2,
        vodAnalysisId: 7,
        eventType: "cashout",
        timestampSeconds: 10,
        actorLabel: null,
        targetLabel: null,
        teamLabel: "Orange",
        metadata: null,
        createdAt,
        updatedAt: createdAt,
      },
    ];
    const { db, select, from, where, orderBy } = createEventListDb(rows);

    await expect(listVodAnalysisEvents(7, db)).resolves.toEqual(rows);

    expect(select).toHaveBeenCalledWith(
      expect.objectContaining({
        id: vodAnalysisEvents.id,
        vodAnalysisId: vodAnalysisEvents.vodAnalysisId,
        eventType: vodAnalysisEvents.eventType,
        timestampSeconds: vodAnalysisEvents.timestampSeconds,
      })
    );
    expect(from).toHaveBeenCalledWith(vodAnalysisEvents);
    expect(where).toHaveBeenCalledTimes(1);
    expect(orderBy).toHaveBeenCalledTimes(1);
  });
});

describe("deleteVodAnalysisEventInputSchema", () => {
  it("rejects invalid ids before database access", async () => {
    const { db, deleteFn } = createEventDeleteDb();

    expect(
      deleteVodAnalysisEventInputSchema.safeParse({
        id: 0,
        vodAnalysisId: 12,
      }).success
    ).toBe(false);
    await expect(
      deleteVodAnalysisEvent({ id: 9, vodAnalysisId: 0 }, db)
    ).rejects.toThrow();
    expect(deleteFn).not.toHaveBeenCalled();
  });
});

describe("deleteVodAnalysisEvent", () => {
  it("deletes the expected event scoped to the VOD", async () => {
    const { db, deleteFn, where } = createEventDeleteDb();

    await expect(
      deleteVodAnalysisEvent({ id: 33, vodAnalysisId: 12 }, db)
    ).resolves.toEqual({ id: 33, vodAnalysisId: 12 });

    expect(deleteFn).toHaveBeenCalledWith(vodAnalysisEvents);
    expect(where).toHaveBeenCalledTimes(1);
  });
});

const suggestedCreatedAt = new Date("2026-01-03T00:00:00Z");

function suggestedEvent(
  overrides: Partial<VodSuggestedEventRecord> = {}
): VodSuggestedEventRecord {
  return {
    id: 1,
    vodAnalysisId: 7,
    eventType: "death",
    timestampSeconds: 30,
    actorLabel: "Player A",
    targetLabel: "Player B",
    teamLabel: "Orange",
    metadata: null,
    source: "manual_test",
    confidence: null,
    status: "pending",
    confirmedVodEventId: null,
    createdAt: suggestedCreatedAt,
    updatedAt: suggestedCreatedAt,
    ...overrides,
  };
}

describe("createVodSuggestedEventInputSchema", () => {
  it("validates suggested events with the same required field rules as manual events", () => {
    const result = createVodSuggestedEventInputSchema.safeParse({
      vodAnalysisId: 7,
      eventType: "death",
      timestampSeconds: 30,
      actorLabel: "Player A",
      source: "manual_test",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(issue => issue.path[0] === "targetLabel")
    ).toBe(true);
  });

  it("accepts steal_flip suggestions with the required teamLabel and cashout selector", () => {
    expect(
      createVodSuggestedEventInputSchema.safeParse({
        vodAnalysisId: 7,
        eventType: "steal_flip",
        timestampSeconds: 30,
        targetLabel: "A",
        teamLabel: "The Live Wires",
        source: "automation",
      }).success
    ).toBe(true);
  });

  it("rejects steal_flip suggestions without the required teamLabel", () => {
    const result = createVodSuggestedEventInputSchema.safeParse({
      vodAnalysisId: 7,
      eventType: "steal_flip",
      timestampSeconds: 30,
      targetLabel: "A",
      source: "automation",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(issue => issue.path[0] === "teamLabel")
    ).toBe(true);
  });

  it("rejects steal_flip suggestions without the required cashout selector", () => {
    const result = createVodSuggestedEventInputSchema.safeParse({
      vodAnalysisId: 7,
      eventType: "steal_flip",
      timestampSeconds: 30,
      teamLabel: "The Live Wires",
      source: "automation",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(issue => issue.path[0] === "targetLabel")
    ).toBe(true);
  });

  it("accepts cashout suggestions with teamLabel and cashout selector", () => {
    expect(
      createVodSuggestedEventInputSchema.safeParse({
        vodAnalysisId: 7,
        eventType: "cashout",
        timestampSeconds: 30,
        targetLabel: "A",
        teamLabel: "Orange",
        source: "automation",
      }).success
    ).toBe(true);
  });

  it("rejects cashout suggestions without the required cashout selector", () => {
    const result = createVodSuggestedEventInputSchema.safeParse({
      vodAnalysisId: 7,
      eventType: "cashout",
      timestampSeconds: 30,
      teamLabel: "Orange",
      source: "automation",
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(issue => issue.path[0] === "targetLabel")
    ).toBe(true);
  });

  it("accepts plug cashout selectors and tap vault selectors", () => {
    expect(
      createVodSuggestedEventInputSchema.safeParse({
        vodAnalysisId: 7,
        eventType: "plug",
        timestampSeconds: 30,
        actorLabel: "Plug Player",
        targetLabel: "B",
        teamLabel: "Orange",
        source: "automation",
      }).success
    ).toBe(true);
    expect(
      createVodSuggestedEventInputSchema.safeParse({
        vodAnalysisId: 7,
        eventType: "tap",
        timestampSeconds: 30,
        actorLabel: "Tap Player",
        targetLabel: "2",
        teamLabel: "Orange",
        source: "automation",
      }).success
    ).toBe(true);
  });

  it("validates confidence range", () => {
    expect(
      createVodSuggestedEventInputSchema.safeParse({
        vodAnalysisId: 7,
        eventType: "cashout",
        timestampSeconds: 30,
        targetLabel: "A",
        teamLabel: "Orange",
        source: "debug",
        confidence: -1,
      }).success
    ).toBe(false);
    expect(
      createVodSuggestedEventInputSchema.safeParse({
        vodAnalysisId: 7,
        eventType: "cashout",
        timestampSeconds: 30,
        targetLabel: "A",
        teamLabel: "Orange",
        source: "debug",
        confidence: 101,
      }).success
    ).toBe(false);
  });

  it("defaults status to pending", () => {
    expect(
      createVodSuggestedEventInputSchema.parse({
        vodAnalysisId: 7,
        eventType: "cashout",
        timestampSeconds: 30,
        targetLabel: "A",
        teamLabel: "Orange",
        source: "automation",
      }).status
    ).toBe("pending");
  });
});

describe("createVodSuggestedEvent", () => {
  it("inserts pending suggestions without creating confirmed manual events", async () => {
    const { db, insert, values } = createSuggestedEventInsertDb();

    await expect(
      createVodSuggestedEvent(
        {
          vodAnalysisId: 7,
          eventType: "cashout",
          timestampSeconds: 45,
          targetLabel: "A",
          teamLabel: "Orange",
          source: "manual_test",
          confidence: 88,
        },
        db
      )
    ).resolves.toMatchObject({
      status: "pending",
      confirmedVodEventId: null,
      confidence: 88,
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(vodSuggestedEvents);
    expect(insert).not.toHaveBeenCalledWith(vodAnalysisEvents);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        vodAnalysisId: 7,
        eventType: "cashout",
        source: "manual_test",
        status: "pending",
      })
    );
  });

  it("builds inserts with normalized labels and JSON metadata", () => {
    expect(
      buildVodSuggestedEventInsert({
        vodAnalysisId: 7,
        eventType: "death",
        timestampSeconds: 12,
        actorLabel: " Player A ",
        targetLabel: " Player B ",
        teamLabel: " ",
        metadata: { sourceFrame: 123 },
        source: "debug",
      })
    ).toMatchObject({
      actorLabel: "Player A",
      targetLabel: "Player B",
      teamLabel: null,
      metadata: JSON.stringify({ sourceFrame: 123 }),
      status: "pending",
    });
  });
});

describe("updateVodSuggestedEvent", () => {
  it("accepts valid pending corrections and returns the updated suggestion", async () => {
    const { db, set, insertedEvents } = createSuggestedEventWorkflowDb([
      suggestedEvent({ id: 22, eventType: "death" }),
    ]);

    await expect(
      updateVodSuggestedEvent(
        {
          id: 22,
          eventType: "cashout",
          timestampSeconds: 75,
          targetLabel: " B ",
          teamLabel: " The Live Wires ",
          confidence: 62,
          metadata: { corrected: true },
        },
        db
      )
    ).resolves.toMatchObject({
      id: 22,
      eventType: "cashout",
      timestampSeconds: 75,
      actorLabel: null,
      targetLabel: "B",
      teamLabel: "The Live Wires",
      confidence: 62,
      status: "pending",
    });

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "cashout",
        timestampSeconds: 75,
        actorLabel: null,
        targetLabel: "B",
        teamLabel: "The Live Wires",
        confidence: 62,
        metadata: JSON.stringify({ corrected: true }),
      })
    );
    expect(insertedEvents).toHaveLength(0);
  });

  it("rejects missing required targetLabel for cashout", async () => {
    const { db, update } = createSuggestedEventWorkflowDb([suggestedEvent()]);

    await expect(
      updateVodSuggestedEvent(
        {
          id: 1,
          eventType: "cashout",
          timestampSeconds: 30,
          teamLabel: "Orange",
        },
        db
      )
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });

  it("rejects missing targetLabel for steal_flip", async () => {
    const { db, update } = createSuggestedEventWorkflowDb([suggestedEvent()]);

    await expect(
      updateVodSuggestedEvent(
        {
          id: 1,
          eventType: "steal_flip",
          timestampSeconds: 30,
          teamLabel: "Orange",
        },
        db
      )
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });

  it("rejects missing teamLabel for steal_flip", async () => {
    const { db, update } = createSuggestedEventWorkflowDb([suggestedEvent()]);

    await expect(
      updateVodSuggestedEvent(
        {
          id: 1,
          eventType: "steal_flip",
          timestampSeconds: 30,
          targetLabel: "A",
        },
        db
      )
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });

  it("rejects invalid timestamp before DB write", async () => {
    const { db, select, update } = createSuggestedEventWorkflowDb([
      suggestedEvent(),
    ]);

    expect(
      updateVodSuggestedEventInputSchema.safeParse({
        id: 1,
        eventType: "death",
        timestampSeconds: -1,
        actorLabel: "A",
        targetLabel: "B",
      }).success
    ).toBe(false);

    await expect(
      updateVodSuggestedEvent(
        {
          id: 1,
          eventType: "death",
          timestampSeconds: -1,
          actorLabel: "A",
          targetLabel: "B",
        },
        db
      )
    ).rejects.toThrow();

    expect(select).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not create a manual event during correction", async () => {
    const { db, insert, insertedEvents } = createSuggestedEventWorkflowDb([
      suggestedEvent({ id: 22 }),
    ]);

    await updateVodSuggestedEvent(
      {
        id: 22,
        eventType: "death",
        timestampSeconds: 45,
        actorLabel: "Correct Actor",
        targetLabel: "Correct Target",
      },
      db
    );

    expect(insert).not.toHaveBeenCalled();
    expect(insertedEvents).toHaveLength(0);
  });

  it("does not update approved or rejected suggestions", async () => {
    for (const status of ["approved", "rejected"] as const) {
      const { db, update } = createSuggestedEventWorkflowDb([
        suggestedEvent({ id: 22, status }),
      ]);

      await expect(
        updateVodSuggestedEvent(
          {
            id: 22,
            eventType: "death",
            timestampSeconds: 45,
            actorLabel: "Correct Actor",
            targetLabel: "Correct Target",
          },
          db
        )
      ).rejects.toThrow("Only pending suggested events can be edited.");

      expect(update).not.toHaveBeenCalled();
    }
  });

  it("builds updates with normalized labels and optional metadata", () => {
    expect(
      buildVodSuggestedEventUpdate({
        id: 9,
        eventType: "death",
        timestampSeconds: 10,
        actorLabel: " Actor ",
        targetLabel: " Target ",
        teamLabel: " ",
      })
    ).toMatchObject({
      actorLabel: "Actor",
      targetLabel: "Target",
      teamLabel: null,
    });
  });
});

describe("approveVodSuggestedEvent", () => {
  it("creates exactly one confirmed manual event and marks suggestion approved", async () => {
    const { db, insert, values, set, insertedEvents } =
      createSuggestedEventWorkflowDb([suggestedEvent({ id: 22 })]);

    await expect(approveVodSuggestedEvent(22, db)).resolves.toMatchObject({
      confirmedEventId: 101,
      suggestion: { status: "approved", confirmedVodEventId: 101 },
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(vodAnalysisEvents);
    expect(values).toHaveBeenCalledTimes(1);
    expect(insertedEvents).toHaveLength(1);
    expect(set).toHaveBeenCalledWith({
      status: "approved",
      confirmedVodEventId: 101,
    });
  });

  it("approves using corrected saved values after correction", async () => {
    const { db, insertedEvents } = createSuggestedEventWorkflowDb([
      suggestedEvent({ id: 22, eventType: "death" }),
    ]);

    await updateVodSuggestedEvent(
      {
        id: 22,
        eventType: "steal_flip",
        timestampSeconds: 92,
        targetLabel: "C",
        teamLabel: "The Socialites",
      },
      db
    );

    await expect(approveVodSuggestedEvent(22, db)).resolves.toMatchObject({
      confirmedEventId: 101,
      suggestion: { status: "approved", confirmedVodEventId: 101 },
    });

    expect(insertedEvents).toEqual([
      expect.objectContaining({
        eventType: "steal_flip",
        timestampSeconds: 92,
        targetLabel: "C",
        teamLabel: "The Socialites",
      }),
    ]);
  });

  it("is idempotent when already approved with a confirmed event id", async () => {
    const { db, insert } = createSuggestedEventWorkflowDb([
      suggestedEvent({
        id: 22,
        status: "approved",
        confirmedVodEventId: 101,
      }),
    ]);

    await expect(approveVodSuggestedEvent(22, db)).resolves.toMatchObject({
      confirmedEventId: 101,
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it("does not approve rejected suggestions", async () => {
    const { db, insert } = createSuggestedEventWorkflowDb([
      suggestedEvent({ id: 22, status: "rejected" }),
    ]);

    await expect(approveVodSuggestedEvent(22, db)).rejects.toThrow(
      "Rejected suggested events cannot be approved."
    );
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("rejectVodSuggestedEvent", () => {
  it("marks pending suggestions rejected without creating manual events or deleting them", async () => {
    const { db, insert, set, storedRows } = createSuggestedEventWorkflowDb([
      suggestedEvent({ id: 22 }),
    ]);

    await expect(rejectVodSuggestedEvent(22, db)).resolves.toMatchObject({
      status: "rejected",
    });

    expect(set).toHaveBeenCalledWith({ status: "rejected" });
    expect(insert).not.toHaveBeenCalled();
    expect(storedRows).toHaveLength(1);
  });

  it("does not reject approved suggestions", async () => {
    const { db, update } = createSuggestedEventWorkflowDb([
      suggestedEvent({
        id: 22,
        status: "approved",
        confirmedVodEventId: 101,
      }),
    ]);

    await expect(rejectVodSuggestedEvent(22, db)).rejects.toThrow(
      "Approved suggested events cannot be rejected."
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe("listVodSuggestedEvents", () => {
  it("sorts pending suggestions first, then timestamp, then id", async () => {
    const rows = [
      suggestedEvent({ id: 3, status: "rejected", timestampSeconds: 1 }),
      suggestedEvent({ id: 2, status: "pending", timestampSeconds: 20 }),
      suggestedEvent({ id: 1, status: "pending", timestampSeconds: 10 }),
      suggestedEvent({ id: 4, status: "approved", timestampSeconds: 5 }),
    ];
    const { db, from, orderBy } = createSuggestedEventListDb(rows);

    await expect(listVodSuggestedEvents(7, db)).resolves.toEqual([
      rows[2],
      rows[1],
      rows[3],
      rows[0],
    ]);

    expect(from).toHaveBeenCalledWith(vodSuggestedEvents);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(sortVodSuggestedEventRecords(rows).map(row => row.id)).toEqual([
      1, 2, 4, 3,
    ]);
  });
});

function createRefreshMetadataDb(rows: VodAnalysisRecord[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const whereSelect = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where: whereSelect }));
  const select = vi.fn(() => ({ from }));
  const whereUpdate = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where: whereUpdate }));
  const update = vi.fn(() => ({ set }));

  return {
    db: { select, update },
    select,
    from,
    limit,
    update,
    set,
    whereUpdate,
  };
}

describe("buildVodAnalysisMetadataUpdate", () => {
  it("does not include null or missing Twitch fields in the update shape", () => {
    expect(
      buildVodAnalysisMetadataUpdate({
        title: "   ",
        thumbnailUrl: undefined,
        durationSeconds: 0,
      })
    ).toEqual({});
  });

  it("includes thumbnailUrl when Twitch provides a usable thumbnail", () => {
    expect(
      buildVodAnalysisMetadataUpdate({
        thumbnailUrl: "https://example.com/thumb.jpg",
      })
    ).toEqual({
      thumbnailUrl: "https://example.com/thumb.jpg",
    });
  });

  it("does not set thumbnailUrl when Twitch omits a usable thumbnail", () => {
    expect(
      buildVodAnalysisMetadataUpdate({
        thumbnailUrl: "   ",
      })
    ).not.toHaveProperty("thumbnailUrl");
  });

  it("does not clear an existing thumbnail implicitly", () => {
    expect(
      buildVodAnalysisMetadataUpdate({
        title: "Updated Twitch title",
        durationSeconds: 120,
      })
    ).toEqual({
      title: "Updated Twitch title",
      durationSeconds: 120,
    });
  });

  it("maps successful Twitch metadata to VOD update fields", () => {
    expect(
      buildVodAnalysisMetadataUpdate({
        title: " Finals VOD ",
        thumbnailUrl: "https://example.com/thumb.jpg",
        durationSeconds: 3723,
      })
    ).toEqual({
      title: "Finals VOD",
      thumbnailUrl: "https://example.com/thumb.jpg",
      durationSeconds: 3723,
    });
  });
});

describe("refreshTwitchMetadataForVodAnalysis", () => {
  const createdAt = new Date("2026-01-02T00:00:00Z");
  const twitchVod: VodAnalysisRecord = {
    id: 77,
    title: "Existing title",
    sourceType: "twitch",
    sourceUrl: "https://www.twitch.tv/videos/1234567890",
    normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
    sourceId: "1234567890",
    sourceRef: "v1234567890",
    thumbnailUrl: "https://example.com/existing.jpg",
    durationSeconds: 60,
    videoPov: "player",
    status: "created",
    createdAt,
    updatedAt: createdAt,
  };

  it("returns not_twitch without calling Twitch for non-Twitch VODs", async () => {
    const youtubeVod: VodAnalysisRecord = {
      ...twitchVod,
      sourceType: "youtube",
      sourceUrl: "https://youtu.be/VIDEO_ID",
      normalizedSourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
      sourceId: "VIDEO_ID",
      sourceRef: "VIDEO_ID",
    };
    const { db, update } = createRefreshMetadataDb([youtubeVod]);
    const metadataFetcher = vi.fn();

    await expect(
      refreshTwitchMetadataForVodAnalysis(77, db, metadataFetcher)
    ).resolves.toEqual({ status: "not_twitch", vodAnalysis: youtubeVod });
    expect(metadataFetcher).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("does not wipe existing metadata when Twitch omits fields", async () => {
    const { db, update } = createRefreshMetadataDb([twitchVod]);
    const metadataFetcher = vi.fn().mockResolvedValue({
      status: "success",
      metadata: {},
    });

    await expect(
      refreshTwitchMetadataForVodAnalysis(77, db, metadataFetcher)
    ).resolves.toEqual({
      status: "updated",
      vodAnalysis: twitchVod,
      metadata: {},
      metadataSummary: {
        thumbnailUrlReturned: false,
        thumbnailUrlUpdated: false,
        thumbnailUrl: null,
        existingThumbnailUrl: "https://example.com/existing.jpg",
      },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("updates title, thumbnail, and duration on successful Twitch refresh", async () => {
    const { db, update, set } = createRefreshMetadataDb([twitchVod]);
    const metadataFetcher = vi.fn().mockResolvedValue({
      status: "success",
      metadata: {
        title: "Updated Twitch title",
        thumbnailUrl: "https://example.com/new.jpg",
        durationSeconds: 3723,
        videoType: "highlight",
        url: "https://www.twitch.tv/videos/1234567890",
      },
    });

    await expect(
      refreshTwitchMetadataForVodAnalysis(77, db, metadataFetcher)
    ).resolves.toMatchObject({
      status: "updated",
      vodAnalysis: {
        title: "Updated Twitch title",
        thumbnailUrl: "https://example.com/new.jpg",
        durationSeconds: 3723,
      },
      metadataSummary: {
        thumbnailUrlReturned: true,
        thumbnailUrlUpdated: true,
        thumbnailUrl: "https://example.com/new.jpg",
        existingThumbnailUrl: "https://example.com/existing.jpg",
        videoType: "highlight",
        url: "https://www.twitch.tv/videos/1234567890",
      },
    });
    expect(metadataFetcher).toHaveBeenCalledWith("1234567890");
    expect(update).toHaveBeenCalledWith(vodAnalyses);
    expect(set).toHaveBeenCalledWith({
      title: "Updated Twitch title",
      thumbnailUrl: "https://example.com/new.jpg",
      durationSeconds: 3723,
    });
  });

  it("returns credentials_missing from the Twitch helper without updating", async () => {
    const { db, update } = createRefreshMetadataDb([twitchVod]);
    const metadataFetcher = vi.fn().mockResolvedValue({
      status: "credentials_missing",
    });

    await expect(
      refreshTwitchMetadataForVodAnalysis(77, db, metadataFetcher)
    ).resolves.toEqual({
      status: "credentials_missing",
      vodAnalysis: twitchVod,
    });
    expect(update).not.toHaveBeenCalled();
  });
});

const captureJobCreatedAt = new Date("2026-02-01T00:00:00Z");

function captureReadyVod(
  overrides: Partial<VodAnalysisRecord> = {}
): VodAnalysisRecord {
  return {
    id: 44,
    title: "Ready Twitch VOD",
    sourceType: "twitch",
    sourceUrl: "https://www.twitch.tv/videos/1234567890",
    normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
    sourceId: "1234567890",
    sourceRef: "v1234567890",
    thumbnailUrl: null,
    durationSeconds: 95,
    videoPov: "spectator",
    status: "created",
    createdAt: captureJobCreatedAt,
    updatedAt: captureJobCreatedAt,
    ...overrides,
  };
}

function captureJob(
  overrides: Partial<VodCaptureJobRecord> = {}
): VodCaptureJobRecord {
  return {
    id: 1,
    vodAnalysisId: 44,
    status: "queued",
    source: "manual_debug",
    sampleIntervalSeconds: 30,
    plannedSamples: 4,
    processedSamples: 0,
    failedSamples: 0,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: captureJobCreatedAt,
    updatedAt: captureJobCreatedAt,
    ...overrides,
  };
}

describe("createVodCaptureJob", () => {
  it("rejects not-ready VODs", async () => {
    const { db, insert } = createCaptureJobDb([
      captureReadyVod({ durationSeconds: null }),
    ]);

    await expect(
      createVodCaptureJob(44, "manual_debug", db)
    ).resolves.toMatchObject({
      status: "not_ready",
      readiness: { status: "missing_duration", isReady: false },
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects missing VODs", async () => {
    const { db, insert } = createCaptureJobDb([]);

    await expect(createVodCaptureJob(44, "manual_debug", db)).resolves.toEqual({
      status: "not_found",
      vodAnalysis: null,
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("uses the sampling plan count and defaults status to queued", async () => {
    const { db, insert, values } = createCaptureJobDb([captureReadyVod()]);

    await expect(createVodCaptureJob(44, undefined, db)).resolves.toMatchObject(
      {
        status: "created",
        captureJob: {
          status: "queued",
          source: "manual_debug",
          sampleIntervalSeconds: 30,
          plannedSamples: 4,
          processedSamples: 0,
          failedSamples: 0,
        },
      }
    );

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(vodCaptureJobs);
    expect(insert).not.toHaveBeenCalledWith(vodAnalysisEvents);
    expect(insert).not.toHaveBeenCalledWith(vodSuggestedEvents);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        vodAnalysisId: 44,
        status: "queued",
        plannedSamples: 4,
      })
    );
  });

  it("does not create events or suggested events", async () => {
    const { db, insert } = createCaptureJobDb([captureReadyVod()]);

    await createVodCaptureJob(44, "automation", db);

    expect(insert).toHaveBeenCalledWith(vodCaptureJobs);
    expect(insert).not.toHaveBeenCalledWith(vodAnalysisEvents);
    expect(insert).not.toHaveBeenCalledWith(vodSuggestedEvents);
  });
});

describe("updateVodCaptureJobStatus", () => {
  it("scopes updates by id and vodAnalysisId", async () => {
    const { db, update, set, where } = createCaptureJobUpdateDb();

    await expect(
      updateVodCaptureJobStatus(
        { id: 99, vodAnalysisId: 44, status: "queued" },
        db
      )
    ).resolves.toMatchObject({
      status: "updated",
      id: 99,
      vodAnalysisId: 44,
      update: { status: "queued" },
    });

    expect(update).toHaveBeenCalledWith(vodCaptureJobs);
    expect(set).toHaveBeenCalledWith({ status: "queued" });
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("writes processing status without creating suggestions or manual events", async () => {
    const { db, set, insert } = createCaptureJobUpdateDb();

    const result = await updateVodCaptureJobStatus(
      {
        id: 99,
        vodAnalysisId: 44,
        status: "processing",
        processedSamples: 1,
      },
      db
    );

    expect(result.update).toMatchObject({
      status: "processing",
      processedSamples: 1,
      startedAt: expect.any(Date),
    });
    expect(result.update).not.toHaveProperty("completedAt");
    expect(set).toHaveBeenCalledWith(result.update);
    expect(insert).not.toHaveBeenCalled();
  });

  it("sets complete status and terminal timestamp", async () => {
    const { db } = createCaptureJobUpdateDb();

    await expect(
      updateVodCaptureJobStatus(
        { id: 99, vodAnalysisId: 44, status: "complete", processedSamples: 4 },
        db
      )
    ).resolves.toMatchObject({
      update: {
        status: "complete",
        processedSamples: 4,
        completedAt: expect.any(Date),
      },
    });
  });

  it("stores failed status error messages", async () => {
    const { db } = createCaptureJobUpdateDb();

    await expect(
      updateVodCaptureJobStatus(
        {
          id: 99,
          vodAnalysisId: 44,
          status: "failed",
          failedSamples: 2,
          errorMessage: " Mock capture failure. ",
        },
        db
      )
    ).resolves.toMatchObject({
      update: {
        status: "failed",
        failedSamples: 2,
        errorMessage: "Mock capture failure.",
        completedAt: expect.any(Date),
      },
    });
  });

  it("supports cancelled status", async () => {
    const { db } = createCaptureJobUpdateDb();

    await expect(
      updateVodCaptureJobStatus(
        { id: 99, vodAnalysisId: 44, status: "cancelled" },
        db
      )
    ).resolves.toMatchObject({
      update: { status: "cancelled", completedAt: expect.any(Date) },
    });
  });

  it("rejects negative sample counts before database writes", async () => {
    const { db, update } = createCaptureJobUpdateDb();

    await expect(
      updateVodCaptureJobStatus(
        {
          id: 99,
          vodAnalysisId: 44,
          status: "processing",
          processedSamples: -1,
        },
        db
      )
    ).rejects.toThrow();
    await expect(
      updateVodCaptureJobStatus(
        { id: 99, vodAnalysisId: 44, status: "processing", failedSamples: -1 },
        db
      )
    ).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects invalid statuses before database writes", async () => {
    const { db, update } = createCaptureJobUpdateDb();
    const input: UpdateVodCaptureJobStatusInput = {
      id: 99,
      vodAnalysisId: 44,
      status: "paused" as unknown as UpdateVodCaptureJobStatusInput["status"],
    };

    expect(() => buildVodCaptureJobStatusUpdate(input)).toThrow();
    expect(updateVodCaptureJobStatusInputSchema.safeParse(input).success).toBe(
      false
    );
    await expect(updateVodCaptureJobStatus(input, db)).rejects.toThrow();
    expect(update).not.toHaveBeenCalled();
  });

  it("rejects production tRPC access before running the service", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.vodAnalysis.updateCaptureJobStatus({
        id: 99,
        vodAnalysisId: 44,
        status: "processing",
      })
    ).rejects.toThrow(
      "Capture job status controls are only available in development."
    );
  });
});

describe("parseCenterEventTextToDetections", () => {
  it("returns no detections for empty or unknown text", () => {
    expect(parseCenterEventTextToDetections("", 12)).toEqual([]);
    expect(parseCenterEventTextToDetections("ROUND STARTING", 12)).toEqual([]);
  });

  it("maps CASHOUT COMPLETE to a valid cashout detection when required fields can be satisfied", () => {
    const [detection] = parseCenterEventTextToDetections(
      "CASHOUT COMPLETE",
      45,
      { targetLabel: "A", teamLabel: "The Live Wires" }
    );

    expect(detection).toMatchObject({
      eventType: "cashout",
      timestampSeconds: 45,
      targetLabel: "A",
      teamLabel: "The Live Wires",
    });
    expect(
      detectedAutomationEventInputSchema.safeParse(detection).success
    ).toBe(true);
  });

  it.each(["CASHOUT STOLEN", "STOLEN"])(
    "maps %s to a valid steal_flip detection when required fields can be satisfied",
    text => {
      const [detection] = parseCenterEventTextToDetections(text, 60, {
        targetLabel: "B",
        teamLabel: "The High Notes",
      });

      expect(detection).toMatchObject({
        eventType: "steal_flip",
        timestampSeconds: 60,
        targetLabel: "B",
        teamLabel: "The High Notes",
      });
      expect(
        detectedAutomationEventInputSchema.safeParse(detection).success
      ).toBe(true);
    }
  );

  it("does not emit invalid team_wipe detections when no team label is present", () => {
    expect(parseCenterEventTextToDetections("TEAM WIPED", 75)).toEqual([]);
  });

  it("emits a valid team_wipe when a team label can be safely provided", () => {
    const [detection] = parseCenterEventTextToDetections("TEAM WIPED", 75, {
      teamLabel: "The Big Splash",
    });

    expect(detection).toMatchObject({
      eventType: "team_wipe",
      timestampSeconds: 75,
      actorLabel: "The Big Splash",
      teamLabel: "The Big Splash",
    });
    expect(
      detectedAutomationEventInputSchema.safeParse(detection).success
    ).toBe(true);
  });
});

describe("processVodCaptureJob", () => {
  it("returns not_found for missing VODs and missing jobs", async () => {
    const missingVod = createProcessCaptureJobDb({
      vodRows: [],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        missingVod.db,
        undefined,
        skippedFrameExtractor
      )
    ).resolves.toMatchObject({
      status: "not_found",
      vodAnalysisId: 44,
      captureJobId: 99,
    });
    expect(missingVod.captureLimit).not.toHaveBeenCalled();
    expect(missingVod.update).not.toHaveBeenCalled();

    const missingJob = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        missingJob.db,
        undefined,
        skippedFrameExtractor
      )
    ).resolves.toMatchObject({ status: "not_found" });
    expect(missingJob.update).not.toHaveBeenCalled();
  });

  it("returns invalid_capture_job when the job belongs to a different VOD", async () => {
    const { db, update, insert } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99, vodAnalysisId: 45 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        undefined,
        skippedFrameExtractor
      )
    ).resolves.toMatchObject({ status: "invalid_capture_job" });

    expect(update).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("marks queued jobs processing and then complete", async () => {
    const { db, updateSets } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        undefined,
        skippedFrameExtractor
      )
    ).resolves.toMatchObject({
      status: "complete",
      processedSamples: 4,
      failedSamples: 0,
      createdSuggestionCount: 0,
    });

    expect(updateSets[0]).toMatchObject({
      status: "processing",
      processedSamples: 0,
      failedSamples: 0,
      errorMessage: null,
      startedAt: expect.any(Date),
    });
    expect(updateSets.at(-1)).toMatchObject({
      status: "complete",
      processedSamples: 4,
      failedSamples: 0,
      completedAt: expect.any(Date),
    });
  });

  it("updates processedSamples based on the sampling plan", async () => {
    const { db, updateSets } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod({ durationSeconds: 61 })],
      captureRows: [captureJob({ id: 99, sampleIntervalSeconds: 20 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        undefined,
        skippedFrameExtractor
      )
    ).resolves.toMatchObject({ processedSamples: 4 });

    expect(updateSets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ processedSamples: 1, failedSamples: 0 }),
        expect.objectContaining({ processedSamples: 2, failedSamples: 0 }),
        expect.objectContaining({ processedSamples: 3, failedSamples: 0 }),
        expect.objectContaining({ processedSamples: 4, failedSamples: 0 }),
      ])
    );
  });

  it("creates pending suggestions through automation ingestion when detections exist", async () => {
    const detector: VodCaptureSampleDetector = async ({ sampleIndex }) =>
      sampleIndex === 0
        ? [
            {
              eventType: "cashout",
              timestampSeconds: 0,
              targetLabel: "A",
              teamLabel: "The Live Wires",
              confidence: 80,
              metadata: { detector: "unit-test" },
            },
          ]
        : [];
    const { db, insert, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        detector,
        skippedFrameExtractor
      )
    ).resolves.toMatchObject({
      status: "complete",
      createdSuggestionCount: 1,
    });

    expect(insert).toHaveBeenCalledWith(vodSuggestedEvents);
    expect(insert).not.toHaveBeenCalledWith(vodAnalysisEvents);
    expect(insertedSuggestedEvents).toHaveLength(1);
    expect(insertedSuggestedEvents[0]).toMatchObject({
      vodAnalysisId: 44,
      source: "automation",
      status: "pending",
      metadata: JSON.stringify({
        captureJobId: 99,
        detectorMetadata: {
          detector: "unit-test",
          detectorVersion: "debug-frame-v1",
          sampleIndex: 0,
          timestampSeconds: 0,
          frameCaptureStatus: "skipped",
          frameCaptureMessage: "Frame extraction skipped in unit test.",
        },
      }),
    });
  });

  it("passes frame capture results into the detector", async () => {
    const capturedFrames: unknown[] = [];
    const frameExtractor: VodFrameExtractor = async input => ({
      status: "captured",
      timestampSeconds: input.timestampSeconds,
      sampleIndex: input.sampleIndex,
      framePath: `/workspace/murphtournaments-website/server/.cache/vod-capture/${input.vodAnalysisId}/${input.captureJobId}/sample-0001-000000.jpg`,
      relativeFramePath: `server/.cache/vod-capture/${input.vodAnalysisId}/${input.captureJobId}/sample-0001-000000.jpg`,
      fileName: "sample-0001-000000.jpg",
    });
    const detector: VodCaptureSampleDetector = async input => {
      capturedFrames.push(input.frameCapture);
      return [];
    };
    const { db } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        detector,
        frameExtractor
      )
    ).resolves.toMatchObject({ status: "complete", processedSamples: 4 });

    expect(capturedFrames).toHaveLength(4);
    expect(capturedFrames[0]).toMatchObject({
      status: "captured",
      relativeFramePath:
        "server/.cache/vod-capture/44/99/sample-0001-000000.jpg",
    });
  });

  it("tracks failed frame extractions without failing the whole job", async () => {
    const frameExtractor: VodFrameExtractor = async input => ({
      status: "failed",
      timestampSeconds: input.timestampSeconds,
      sampleIndex: input.sampleIndex,
      errorMessage:
        "Frame extraction requires missing system binaries: yt-dlp, ffmpeg.",
    });
    const { db, updateSets } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        undefined,
        frameExtractor
      )
    ).resolves.toMatchObject({
      status: "complete",
      processedSamples: 0,
      failedSamples: 4,
      createdSuggestionCount: 0,
      errorMessage:
        "Frame extraction requires missing system binaries: yt-dlp, ffmpeg.",
    });

    expect(updateSets.at(-1)).toMatchObject({
      status: "complete",
      processedSamples: 0,
      failedSamples: 4,
      errorMessage:
        "Frame extraction requires missing system binaries: yt-dlp, ffmpeg.",
    });
  });

  it("ingests center-event-text detector output into pending suggestions", async () => {
    const frameExtractor: VodFrameExtractor = async input => ({
      status: "captured",
      timestampSeconds: input.timestampSeconds,
      sampleIndex: input.sampleIndex,
      framePath:
        "/workspace/murphtournaments-website/server/.cache/vod-capture/44/99/sample-0001-000000.jpg",
      relativeFramePath:
        "server/.cache/vod-capture/44/99/sample-0001-000000.jpg",
      fileName: "sample-0001-000000.jpg",
    });
    const detector = createCenterEventTextSampleDetector({
      getText: ({ sampleIndex }) =>
        sampleIndex === 0 ? "CASHOUT COMPLETE" : null,
      parseContext: { targetLabel: "A", teamLabel: "The Live Wires" },
    });
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        detector,
        frameExtractor
      )
    ).resolves.toMatchObject({
      status: "complete",
      createdSuggestionCount: 1,
    });

    expect(insertedSuggestedEvents).toHaveLength(1);
    expect(insertedSuggestedEvents[0]).toMatchObject({
      eventType: "cashout",
      targetLabel: "A",
      teamLabel: "The Live Wires",
      source: "automation",
      status: "pending",
    });
    const metadata = JSON.parse(
      String((insertedSuggestedEvents[0] as { metadata: string }).metadata)
    );
    expect(metadata.detectorMetadata).toMatchObject({
      detectorVersion: "center-event-text-v1",
      hudZoneId: "center_event_text",
      sampleIndex: 0,
      timestampSeconds: 0,
      frameFileName: "sample-0001-000000.jpg",
      relativeFramePath:
        "server/.cache/vod-capture/44/99/sample-0001-000000.jpg",
      matchedText: "CASHOUT COMPLETE",
    });
  });

  it("does not attempt OCR when OCR is disabled and preserves existing empty detector behavior", async () => {
    const getOcrResult = vi.fn(async () =>
      mockedCenterEventOcrResult("CASHOUT COMPLETE")
    );
    const detector = createCenterEventTextSampleDetector({
      ocrEnabled: false,
      getOcrResult,
      parseContext: { targetLabel: "A", teamLabel: "The Live Wires" },
    });
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        detector,
        capturedFrameExtractor
      )
    ).resolves.toMatchObject({
      status: "complete",
      createdSuggestionCount: 0,
    });

    expect(getOcrResult).not.toHaveBeenCalled();
    expect(insertedSuggestedEvents).toHaveLength(0);
  });

  it("creates a pending cashout suggestion from confident OCR text", async () => {
    const detector = createCenterEventTextSampleDetector({
      ocrEnabled: true,
      getOcrResult: async ({ sampleIndex }) =>
        sampleIndex === 0
          ? mockedCenterEventOcrResult("CASHOUT COMPLETE")
          : null,
      parseContext: { targetLabel: "A", teamLabel: "The Live Wires" },
    });
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        detector,
        capturedFrameExtractor
      )
    ).resolves.toMatchObject({
      status: "complete",
      createdSuggestionCount: 1,
    });

    expect(insertedSuggestedEvents[0]).toMatchObject({
      eventType: "cashout",
      targetLabel: "A",
      teamLabel: "The Live Wires",
      source: "automation",
      status: "pending",
    });
    expect(
      JSON.parse(
        String((insertedSuggestedEvents[0] as { metadata: string }).metadata)
      ).detectorMetadata.ocr
    ).toMatchObject({
      enabled: true,
      confidence: 92,
      normalizedText: "CASHOUT COMPLETE",
      engine: "tesseract.js",
    });
  });

  it.each(["CASHOUT STOLEN", "STOLEN"])(
    "creates a pending steal suggestion from confident OCR text %s",
    async ocrText => {
      const detector = createCenterEventTextSampleDetector({
        ocrEnabled: true,
        getOcrResult: async ({ sampleIndex }) =>
          sampleIndex === 0 ? mockedCenterEventOcrResult(ocrText) : null,
        parseContext: { targetLabel: "B", teamLabel: "The High Notes" },
      });
      const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
        vodRows: [captureReadyVod()],
        captureRows: [captureJob({ id: 99 })],
      });

      await expect(
        processVodCaptureJob(
          { vodAnalysisId: 44, captureJobId: 99 },
          db,
          detector,
          capturedFrameExtractor
        )
      ).resolves.toMatchObject({
        status: "complete",
        createdSuggestionCount: 1,
      });

      expect(insertedSuggestedEvents[0]).toMatchObject({
        eventType: "steal_flip",
        targetLabel: "B",
        teamLabel: "The High Notes",
        source: "automation",
        status: "pending",
      });
    }
  );

  it("does not create a team wipe suggestion without a safe team label", async () => {
    const detector = createCenterEventTextSampleDetector({
      ocrEnabled: true,
      getOcrResult: async ({ sampleIndex }) =>
        sampleIndex === 0 ? mockedCenterEventOcrResult("TEAM WIPED") : null,
    });
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await processVodCaptureJob(
      { vodAnalysisId: 44, captureJobId: 99 },
      db,
      detector,
      capturedFrameExtractor
    );

    expect(insertedSuggestedEvents).toHaveLength(0);
  });

  it("does not create suggestions from low-confidence OCR", async () => {
    const detector = createCenterEventTextSampleDetector({
      ocrEnabled: true,
      ocrConfidenceThreshold: 70,
      getOcrResult: async ({ sampleIndex }) =>
        sampleIndex === 0
          ? mockedCenterEventOcrResult("CASHOUT COMPLETE", 69)
          : null,
      parseContext: { targetLabel: "A", teamLabel: "The Live Wires" },
    });
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await processVodCaptureJob(
      { vodAnalysisId: 44, captureJobId: 99 },
      db,
      detector,
      capturedFrameExtractor
    );

    expect(insertedSuggestedEvents).toHaveLength(0);
  });

  it("does not create suggestions from unknown OCR text", async () => {
    const detector = createCenterEventTextSampleDetector({
      ocrEnabled: true,
      getOcrResult: async ({ sampleIndex }) =>
        sampleIndex === 0 ? mockedCenterEventOcrResult("ROUND STARTING") : null,
      parseContext: { targetLabel: "A", teamLabel: "The Live Wires" },
    });
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await processVodCaptureJob(
      { vodAnalysisId: 44, captureJobId: 99 },
      db,
      detector,
      capturedFrameExtractor
    );

    expect(insertedSuggestedEvents).toHaveLength(0);
  });

  it("dedupes repeated OCR text across adjacent frames", async () => {
    const detector = createCenterEventTextSampleDetector({
      ocrEnabled: true,
      getOcrResult: async () => mockedCenterEventOcrResult("CASHOUT COMPLETE"),
      parseContext: { targetLabel: "A", teamLabel: "The Live Wires" },
      dedupeCooldownSeconds: 4,
    });
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod({ durationSeconds: 4 })],
      captureRows: [captureJob({ id: 99, sampleIntervalSeconds: 2 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        detector,
        capturedFrameExtractor
      )
    ).resolves.toMatchObject({
      status: "complete",
      createdSuggestionCount: 1,
    });

    expect(insertedSuggestedEvents).toHaveLength(1);
  });

  it("keeps OCR capture job ingestion on the pending suggestion path", async () => {
    const detector = createCenterEventTextSampleDetector({
      ocrEnabled: true,
      getOcrResult: async ({ sampleIndex }) =>
        sampleIndex === 0
          ? mockedCenterEventOcrResult("CASHOUT COMPLETE")
          : null,
      parseContext: { targetLabel: "C", teamLabel: "The Retros" },
    });
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await processVodCaptureJob(
      { vodAnalysisId: 44, captureJobId: 99 },
      db,
      detector,
      capturedFrameExtractor
    );

    expect(insertedSuggestedEvents).toHaveLength(1);
    expect(insertedSuggestedEvents[0]).toMatchObject({
      source: "automation",
      status: "pending",
    });
  });

  it("adds debug frame metadata to detector-created suggestions", async () => {
    const frameExtractor: VodFrameExtractor = async input => ({
      status: "captured",
      timestampSeconds: input.timestampSeconds,
      sampleIndex: input.sampleIndex,
      framePath:
        "/workspace/murphtournaments-website/server/.cache/vod-capture/44/99/sample-0001-000000.jpg",
      relativeFramePath:
        "server/.cache/vod-capture/44/99/sample-0001-000000.jpg",
      fileName: "sample-0001-000000.jpg",
    });
    const detector: VodCaptureSampleDetector = async ({ sampleIndex }) =>
      sampleIndex === 0
        ? [
            {
              eventType: "cashout",
              timestampSeconds: 0,
              targetLabel: "A",
              teamLabel: "The Live Wires",
              confidence: 80,
            },
          ]
        : [];
    const { db, insertedSuggestedEvents } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await processVodCaptureJob(
      { vodAnalysisId: 44, captureJobId: 99 },
      db,
      detector,
      frameExtractor
    );

    expect(insertedSuggestedEvents).toHaveLength(1);
    expect(
      JSON.parse(
        String((insertedSuggestedEvents[0] as { metadata: string }).metadata)
      )
    ).toEqual({
      captureJobId: 99,
      detectorMetadata: {
        detectorVersion: "debug-frame-v1",
        sampleIndex: 0,
        timestampSeconds: 0,
        frameCaptureStatus: "captured",
        relativeFramePath:
          "server/.cache/vod-capture/44/99/sample-0001-000000.jpg",
        fileName: "sample-0001-000000.jpg",
      },
    });
  });

  it("marks failed with errorMessage when the detector throws", async () => {
    const detector: VodCaptureSampleDetector = async () => {
      throw new Error("OCR engine unavailable");
    };
    const { db, updateSets } = createProcessCaptureJobDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99 })],
    });

    await expect(
      processVodCaptureJob(
        { vodAnalysisId: 44, captureJobId: 99 },
        db,
        detector,
        skippedFrameExtractor
      )
    ).resolves.toMatchObject({
      status: "failed",
      processedSamples: 1,
      failedSamples: 1,
      errorMessage: "Capture sample 1 at 0s failed: OCR engine unavailable",
    });

    expect(updateSets.at(-1)).toMatchObject({
      status: "failed",
      processedSamples: 1,
      failedSamples: 1,
      errorMessage: "Capture sample 1 at 0s failed: OCR engine unavailable",
      completedAt: expect.any(Date),
    });
  });
});

describe("ingestAutomationDetections", () => {
  const baseDetection = {
    eventType: "cashout",
    timestampSeconds: 30,
    targetLabel: "A",
    teamLabel: " The Live Wires ",
    confidence: 82,
    metadata: { detector: "scoreboard-v1", frameNumber: 120 },
  } as const;

  it("creates pending automation suggested events", async () => {
    const { db, insert, values, insertedSuggestedEvents } =
      createAutomationDetectionIngestDb({
        vodRows: [captureReadyVod()],
        captureRows: [captureJob({ id: 99, vodAnalysisId: 44 })],
      });

    await expect(
      ingestAutomationDetections(
        {
          vodAnalysisId: 44,
          captureJobId: 99,
          detections: [baseDetection],
        },
        db
      )
    ).resolves.toMatchObject({
      status: "created",
      vodAnalysisId: 44,
      captureJobId: 99,
      createdCount: 1,
      suggestedEvents: [
        {
          eventType: "cashout",
          source: "automation",
          status: "pending",
          confirmedVodEventId: null,
          targetLabel: "A",
          teamLabel: "The Live Wires",
          confidence: 82,
        },
      ],
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(vodSuggestedEvents);
    expect(insert).not.toHaveBeenCalledWith(vodAnalysisEvents);
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        vodAnalysisId: 44,
        source: "automation",
        status: "pending",
      })
    );
    expect(insertedSuggestedEvents).toHaveLength(1);
  });

  it("validates detections with the same required-field rules as suggested events", () => {
    const result = ingestAutomationDetectionsInputSchema.safeParse({
      vodAnalysisId: 44,
      captureJobId: 99,
      detections: [
        {
          eventType: "team_wipe",
          timestampSeconds: 45,
          teamLabel: "The High Notes",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(
      result.error?.issues.some(issue => issue.path.includes("actorLabel"))
    ).toBe(true);
  });

  it.each([
    ["cashout", { teamLabel: "The Live Wires" }],
    ["steal_flip", { teamLabel: "The High Notes" }],
    ["tap", { actorLabel: "Player A", teamLabel: "The Live Wires" }],
    ["plug", { actorLabel: "Player A", teamLabel: "The Live Wires" }],
  ] as const)(
    "rejects %s detections without targetLabel",
    (eventType, fields) => {
      expect(
        ingestAutomationDetectionsInputSchema.safeParse({
          vodAnalysisId: 44,
          captureJobId: 99,
          detections: [
            {
              eventType,
              timestampSeconds: 60,
              ...fields,
            },
          ],
        }).success
      ).toBe(false);
    }
  );

  it("does not write when the capture job belongs to a different VOD", async () => {
    const { db, insert } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99, vodAnalysisId: 45 })],
    });

    await expect(
      ingestAutomationDetections(
        {
          vodAnalysisId: 44,
          captureJobId: 99,
          detections: [baseDetection],
        },
        db
      )
    ).resolves.toMatchObject({
      status: "invalid_capture_job",
      createdCount: 0,
      suggestedEvents: [],
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects cancelled capture jobs", async () => {
    const { db, insert } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [
        captureJob({ id: 99, vodAnalysisId: 44, status: "cancelled" }),
      ],
    });

    await expect(
      ingestAutomationDetections(
        {
          vodAnalysisId: 44,
          captureJobId: 99,
          detections: [baseDetection],
        },
        db
      )
    ).resolves.toMatchObject({ status: "invalid_capture_job" });
    expect(insert).not.toHaveBeenCalled();
  });

  it("allows completed capture jobs so workers can finish after writing", async () => {
    const { db, insert } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [
        captureJob({ id: 99, vodAnalysisId: 44, status: "complete" }),
      ],
    });

    await expect(
      ingestAutomationDetections(
        {
          vodAnalysisId: 44,
          captureJobId: 99,
          detections: [baseDetection],
        },
        db
      )
    ).resolves.toMatchObject({ status: "created", createdCount: 1 });
    expect(insert).toHaveBeenCalledWith(vodSuggestedEvents);
  });

  it("does not create manual events", async () => {
    const { db, insert } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99, vodAnalysisId: 44 })],
    });

    await ingestAutomationDetections(
      {
        vodAnalysisId: 44,
        captureJobId: 99,
        detections: [baseDetection],
      },
      db
    );

    expect(insert).not.toHaveBeenCalledWith(vodAnalysisEvents);
  });

  it("preserves captureJobId and detector metadata", () => {
    expect(
      buildAutomationDetectionSuggestedEventInserts({
        vodAnalysisId: 44,
        captureJobId: 99,
        detections: [baseDetection],
      })[0]
    ).toMatchObject({
      metadata: JSON.stringify({
        captureJobId: 99,
        detectorMetadata: { detector: "scoreboard-v1", frameNumber: 120 },
      }),
    });
  });

  it("returns not_found for missing VODs before writes", async () => {
    const { db, insert, captureLimit } = createAutomationDetectionIngestDb({
      vodRows: [],
      captureRows: [captureJob({ id: 99, vodAnalysisId: 44 })],
    });

    await expect(
      ingestAutomationDetections(
        {
          vodAnalysisId: 44,
          captureJobId: 99,
          detections: [baseDetection],
        },
        db
      )
    ).resolves.toMatchObject({ status: "not_found", createdCount: 0 });

    expect(captureLimit).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns invalid_capture_job for missing capture jobs before writes", async () => {
    const { db, insert } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [],
    });

    await expect(
      ingestAutomationDetections(
        {
          vodAnalysisId: 44,
          captureJobId: 99,
          detections: [baseDetection],
        },
        db
      )
    ).resolves.toMatchObject({
      status: "invalid_capture_job",
      createdCount: 0,
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects invalid VOD and capture ids before database access", async () => {
    const { db, select } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99, vodAnalysisId: 44 })],
    });

    await expect(
      ingestAutomationDetections(
        { vodAnalysisId: 0, captureJobId: 99, detections: [baseDetection] },
        db
      )
    ).rejects.toThrow();
    await expect(
      ingestAutomationDetections(
        { vodAnalysisId: 44, captureJobId: 0, detections: [baseDetection] },
        db
      )
    ).rejects.toThrow();
    expect(select).not.toHaveBeenCalled();
  });
});

describe("runMockVodAutomationDetections", () => {
  it("creates four pending automation suggestions without manual events", async () => {
    const { db, insert, insertedSuggestedEvents } =
      createAutomationDetectionIngestDb({
        vodRows: [captureReadyVod()],
        captureRows: [captureJob({ id: 99, vodAnalysisId: 44 })],
      });

    await expect(
      runMockVodAutomationDetections(
        { vodAnalysisId: 44, captureJobId: 99 },
        db
      )
    ).resolves.toEqual({
      status: "created",
      vodAnalysisId: 44,
      captureJobId: 99,
      createdCount: 4,
    });

    expect(insert).toHaveBeenCalledTimes(4);
    expect(insert).toHaveBeenCalledWith(vodSuggestedEvents);
    expect(insert).not.toHaveBeenCalledWith(vodAnalysisEvents);
    expect(insertedSuggestedEvents).toHaveLength(4);
    expect(insertedSuggestedEvents).toEqual([
      expect.objectContaining({
        eventType: "tap",
        timestampSeconds: 30,
        actorLabel: "Mock Player 1",
        targetLabel: "1",
        teamLabel: "The Live Wires",
        confidence: 72,
        source: "automation",
        status: "pending",
        confirmedVodEventId: null,
      }),
      expect.objectContaining({
        eventType: "plug",
        timestampSeconds: 45,
        actorLabel: "Mock Player 1",
        targetLabel: "A",
        teamLabel: "The Live Wires",
        confidence: 76,
        source: "automation",
        status: "pending",
        confirmedVodEventId: null,
      }),
      expect.objectContaining({
        eventType: "steal_flip",
        timestampSeconds: 75,
        actorLabel: null,
        targetLabel: "A",
        teamLabel: "The High Notes",
        confidence: 81,
        source: "automation",
        status: "pending",
        confirmedVodEventId: null,
      }),
      expect.objectContaining({
        eventType: "cashout",
        timestampSeconds: 120,
        actorLabel: null,
        targetLabel: "A",
        teamLabel: "The High Notes",
        confidence: 88,
        source: "automation",
        status: "pending",
        confirmedVodEventId: null,
      }),
    ]);
  });

  it("uses valid target selectors for Vault 1 and Cashout A", async () => {
    const { db, insertedSuggestedEvents } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99, vodAnalysisId: 44 })],
    });

    await runMockVodAutomationDetections(
      { vodAnalysisId: 44, captureJobId: 99 },
      db
    );

    expect(insertedSuggestedEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventType: "tap", targetLabel: "1" }),
        expect.objectContaining({ eventType: "plug", targetLabel: "A" }),
        expect.objectContaining({ eventType: "steal_flip", targetLabel: "A" }),
        expect.objectContaining({ eventType: "cashout", targetLabel: "A" }),
      ])
    );
  });

  it("marks detector metadata as mock/dev generated", async () => {
    const { db, insertedSuggestedEvents } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99, vodAnalysisId: 44 })],
    });

    await runMockVodAutomationDetections(
      { vodAnalysisId: 44, captureJobId: 99 },
      db
    );

    for (const event of insertedSuggestedEvents) {
      expect(event).toEqual(
        expect.objectContaining({ metadata: expect.any(String) })
      );
      const metadata = JSON.parse((event as { metadata: string }).metadata) as {
        captureJobId: number;
        detectorMetadata: {
          mockAutomation: boolean;
          devOnly: boolean;
          generator: string;
        };
      };

      expect(metadata.captureJobId).toBe(99);
      expect(metadata.detectorMetadata).toMatchObject({
        mockAutomation: true,
        devOnly: true,
        generator: "runMockVodAutomationDetections",
      });
    }
  });

  it("returns invalid_capture_job for invalid capture jobs before writes", async () => {
    const { db, insert } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [],
    });

    await expect(
      runMockVodAutomationDetections(
        { vodAnalysisId: 44, captureJobId: 99 },
        db
      )
    ).resolves.toEqual({
      status: "invalid_capture_job",
      vodAnalysisId: 44,
      captureJobId: 99,
      createdCount: 0,
    });

    expect(insert).not.toHaveBeenCalled();
  });

  it("rejects invalid VOD and capture ids before database access", async () => {
    const { db, select } = createAutomationDetectionIngestDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob({ id: 99, vodAnalysisId: 44 })],
    });

    await expect(
      runMockVodAutomationDetections({ vodAnalysisId: 0, captureJobId: 99 }, db)
    ).rejects.toThrow();
    await expect(
      runMockVodAutomationDetections({ vodAnalysisId: 44, captureJobId: 0 }, db)
    ).rejects.toThrow();
    expect(select).not.toHaveBeenCalled();
  });
});

describe("listVodCaptureJobs", () => {
  it("lists capture jobs newest-first", async () => {
    const rows = [
      captureJob({ id: 3, createdAt: new Date("2026-02-03T00:00:00Z") }),
      captureJob({ id: 2, createdAt: new Date("2026-02-02T00:00:00Z") }),
    ];
    const { db, from, orderBy } = createCaptureJobListDb(rows);

    await expect(listVodCaptureJobs(44, db)).resolves.toEqual(rows);
    expect(from).toHaveBeenCalledWith(vodCaptureJobs);
    expect(orderBy).toHaveBeenCalledTimes(1);
  });
});

describe("getLatestVodCaptureJob", () => {
  it("returns the newest job", async () => {
    const newest = captureJob({ id: 5 });
    const { db, from, orderBy, limit } = createLatestCaptureJobDb([newest]);

    await expect(getLatestVodCaptureJob(44, db)).resolves.toEqual(newest);
    expect(from).toHaveBeenCalledWith(vodCaptureJobs);
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(1);
  });
});

describe("getVodAutomationStatus", () => {
  it("returns the latest capture job and counts by suggestion status", async () => {
    const latestCaptureJob = captureJob({
      id: 9,
      status: "processing",
      processedSamples: 2,
      failedSamples: 1,
    });
    const { db, captureOrderBy, captureLimit, suggestedGroupBy } =
      createAutomationStatusDb({
        vodRows: [captureReadyVod()],
        captureRows: [latestCaptureJob],
        suggestedCountRows: [
          { status: "pending", suggestedCount: 3 },
          { status: "approved", suggestedCount: "2" },
          { status: "rejected", suggestedCount: BigInt(1) },
        ],
        manualCountRows: [{ confirmedManualEventCount: 6 }],
      });

    await expect(
      getVodAutomationStatus(44, db, async () => ({
        available: true,
        missing: [],
      }))
    ).resolves.toMatchObject({
      vodAnalysisId: 44,
      readiness: { status: "ready", isReady: true },
      frameCaptureBinaries: { available: true, missing: [] },
      latestCaptureJob,
      pendingSuggestedCount: 3,
      approvedSuggestedCount: 2,
      rejectedSuggestedCount: 1,
      confirmedManualEventCount: 6,
    });

    expect(captureOrderBy).toHaveBeenCalledTimes(1);
    expect(captureLimit).toHaveBeenCalledWith(1);
    expect(suggestedGroupBy).toHaveBeenCalledTimes(1);
  });

  it("handles no capture job", async () => {
    const { db } = createAutomationStatusDb({
      vodRows: [captureReadyVod()],
      captureRows: [],
    });

    await expect(
      getVodAutomationStatus(44, db, async () => ({
        available: false,
        missing: ["ffmpeg"],
      }))
    ).resolves.toMatchObject({
      frameCaptureBinaries: { available: false, missing: ["ffmpeg"] },
      latestCaptureJob: null,
      pendingSuggestedCount: 0,
      approvedSuggestedCount: 0,
      rejectedSuggestedCount: 0,
    });
  });

  it("handles no suggestions", async () => {
    const { db } = createAutomationStatusDb({
      vodRows: [captureReadyVod()],
      captureRows: [captureJob()],
      suggestedCountRows: [],
      manualCountRows: [],
    });

    await expect(
      getVodAutomationStatus(44, db, async () => ({
        available: true,
        missing: [],
      }))
    ).resolves.toMatchObject({
      pendingSuggestedCount: 0,
      approvedSuggestedCount: 0,
      rejectedSuggestedCount: 0,
      confirmedManualEventCount: 0,
    });
  });

  it("returns null when the VOD does not exist", async () => {
    const { db, captureOrderBy, suggestedGroupBy, manualWhere } =
      createAutomationStatusDb({ vodRows: [] });

    await expect(
      getVodAutomationStatus(44, db, async () => ({
        available: true,
        missing: [],
      }))
    ).resolves.toBeNull();
    expect(captureOrderBy).not.toHaveBeenCalled();
    expect(suggestedGroupBy).not.toHaveBeenCalled();
    expect(manualWhere).not.toHaveBeenCalled();
  });

  it("rejects invalid ids before DB query", async () => {
    const { db, select } = createAutomationStatusDb({
      vodRows: [captureReadyVod()],
    });

    await expect(
      getVodAutomationStatus(0, db, async () => ({
        available: true,
        missing: [],
      }))
    ).rejects.toThrow();
    expect(select).not.toHaveBeenCalled();
  });
});

describe("VOD HUD zone presets", () => {
  it.each(["player", "spectator"] as const)(
    "returns normalized zones for %s POV",
    videoPov => {
      const preset = getVodHudZonePreset(videoPov);

      expect(preset.id).toBe(videoPov);
      expect(preset.zones.map(zone => zone.id).sort()).toEqual(
        [...VOD_HUD_ZONE_IDS].sort()
      );

      for (const zone of preset.zones) {
        expect(zone.label).toBeTruthy();
        expect(zone.purpose).toBeTruthy();
        expect(zone.rect.x).toBeGreaterThanOrEqual(0);
        expect(zone.rect.y).toBeGreaterThanOrEqual(0);
        expect(zone.rect.width).toBeGreaterThan(0);
        expect(zone.rect.height).toBeGreaterThan(0);
        expect(zone.rect.x + zone.rect.width).toBeLessThanOrEqual(1);
        expect(zone.rect.y + zone.rect.height).toBeLessThanOrEqual(1);
      }
    }
  );
});

describe("VOD capture frame preview", () => {
  it("returns not_found when no cached frame exists", async () => {
    const vodId = 404044;
    const captureId = 990099;
    const cacheDir = path.join(
      process.cwd(),
      "server",
      ".cache",
      "vod-capture",
      String(vodId)
    );
    await rm(cacheDir, { recursive: true, force: true });

    const { db } = createAutomationStatusDb({
      vodRows: [captureReadyVod({ id: vodId, videoPov: "player" })],
      captureRows: [captureJob({ id: captureId, vodAnalysisId: vodId })],
    });

    await expect(
      getLatestCaptureFramePreview({ vodAnalysisId: vodId }, db)
    ).resolves.toMatchObject({
      status: "not_found",
      vodAnalysisId: vodId,
      captureJobId: captureId,
      frameUrl: null,
      zones: getVodHudZonePreset("player").zones,
    });
  });

  it("rejects path traversal and invalid frame filenames", async () => {
    const tempRoot = await mkdtemp(path.join(os.tmpdir(), "vod-preview-safe-"));
    try {
      expect(
        resolveVodCaptureFramePath(44, 99, "../secret.jpg", tempRoot)
      ).toBeNull();
      expect(
        resolveVodCaptureFramePath(44, 99, "sample-0001-000000.png", tempRoot)
      ).toBeNull();
      expect(
        resolveVodCaptureFramePath(
          "44/../45",
          99,
          "sample-0001-000000.jpg",
          tempRoot
        )
      ).toBeNull();
      await expect(
        getSafeVodCaptureFramePathForRequest(
          "44",
          "99",
          "../../package.json",
          tempRoot
        )
      ).resolves.toBeNull();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("returns an available frame URL when a cached sample frame exists", async () => {
    const vodId = 505044;
    const captureId = 990100;
    const fileName = "sample-0002-000030.jpg";
    const cacheRoot = path.join(
      process.cwd(),
      "server",
      ".cache",
      "vod-capture"
    );
    const frameDir = path.join(cacheRoot, String(vodId), String(captureId));
    await rm(path.join(cacheRoot, String(vodId)), {
      recursive: true,
      force: true,
    });
    await mkdir(frameDir, { recursive: true });
    await writeFile(path.join(frameDir, fileName), "fake jpg bytes");

    try {
      const { db } = createAutomationStatusDb({
        vodRows: [captureReadyVod({ id: vodId, videoPov: "spectator" })],
        captureRows: [captureJob({ id: captureId, vodAnalysisId: vodId })],
      });

      await expect(
        getLatestCaptureFramePreview({ vodAnalysisId: vodId }, db)
      ).resolves.toMatchObject({
        status: "available",
        vodAnalysisId: vodId,
        captureJobId: captureId,
        frameUrl: `/api/vod-capture-frame/${vodId}/${captureId}/${fileName}`,
        fileName,
        timestampSeconds: 30,
        zones: getVodHudZonePreset("spectator").zones,
      });
      await expect(
        getSafeVodCaptureFramePathForRequest(
          String(vodId),
          String(captureId),
          fileName,
          cacheRoot
        )
      ).resolves.toBe(path.join(frameDir, fileName));
    } finally {
      await rm(path.join(cacheRoot, String(vodId)), {
        recursive: true,
        force: true,
      });
    }
  });
});
