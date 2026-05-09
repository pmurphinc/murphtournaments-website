import { describe, expect, it, vi } from "vitest";
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
  buildVodSuggestedEventInsert,
  createVodAnalysis,
  createVodAnalysisEvent,
  createVodAnalysisEventInputSchema,
  createVodAnalysisInputSchema,
  createVodCaptureJob,
  deleteVodAnalysisEvent,
  deleteVodAnalysisEventInputSchema,
  createVodSuggestedEvent,
  createVodSuggestedEventInputSchema,
  getLatestVodCaptureJob,
  getPendingSuggestedEventCountsByVodAnalysisIds,
  getVodAnalysisById,
  listVodAnalysisEvents,
  listVodAnalyses,
  listVodCaptureJobs,
  listVodSuggestedEvents,
  rejectVodSuggestedEvent,
  refreshTwitchMetadataForVodAnalysis,
  updateVodAnalysisEvent,
  updateVodAnalysisEventInputSchema,
  sortVodSuggestedEventRecords,
  vodAnalysisIdInputSchema,
  type VodAnalysisEventRecord,
  type VodCaptureJobRecord,
  type PendingSuggestedEventCountRow,
  type VodAnalysisRecord,
  type VodSuggestedEventRecord,
} from "./vodAnalysis";

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

function createSuggestedEventInsertDb() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn(() => ({ values }));

  return { db: { insert }, insert, values };
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
    ["tap", { actorLabel: "A", targetLabel: "Vault", teamLabel: "Orange" }],
    ["plug", { actorLabel: "A", targetLabel: "Cashout", teamLabel: "Orange" }],
    ["cashout", { teamLabel: "Orange" }],
    ["team_wipe", { actorLabel: "Orange", teamLabel: "Purple" }],
    ["team_spawn", { teamLabel: "Orange" }],
    ["steal_flip", { teamLabel: "The Live Wires" }],
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
    ["tap", { actorLabel: "A", targetLabel: "Vault" }],
    ["plug", { actorLabel: "A", teamLabel: "Orange" }],
    ["cashout", {}],
    ["team_wipe", { teamLabel: "Purple" }],
    ["team_spawn", {}],
    ["steal_flip", {}],
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
        targetLabel: undefined,
        teamLabel: "Orange",
      }).success
    ).toBe(true);

    expect(
      updateVodAnalysisEventInputSchema.safeParse({
        ...baseInput,
        eventType: "steal_flip",
        actorLabel: undefined,
        targetLabel: undefined,
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

  it("accepts steal_flip suggestions with the required teamLabel", () => {
    expect(
      createVodSuggestedEventInputSchema.safeParse({
        vodAnalysisId: 7,
        eventType: "steal_flip",
        timestampSeconds: 30,
        teamLabel: "The Live Wires",
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
  it("marks pending suggestions rejected without deleting them", async () => {
    const { db, set, storedRows } = createSuggestedEventWorkflowDb([
      suggestedEvent({ id: 22 }),
    ]);

    await expect(rejectVodSuggestedEvent(22, db)).resolves.toMatchObject({
      status: "rejected",
    });

    expect(set).toHaveBeenCalledWith({ status: "rejected" });
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
