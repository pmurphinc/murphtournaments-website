import { describe, expect, it, vi } from "vitest";
import { vodAnalyses, vodAnalysisEvents } from "../drizzle/schema";
import {
  buildVodAnalysisEventInsert,
  buildVodAnalysisInsert,
  createVodAnalysis,
  createVodAnalysisEvent,
  createVodAnalysisEventInputSchema,
  createVodAnalysisInputSchema,
  getVodAnalysisById,
  listVodAnalysisEvents,
  listVodAnalyses,
  vodAnalysisIdInputSchema,
  type VodAnalysisEventRecord,
  type VodAnalysisListItem,
  type VodAnalysisRecord,
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

function createListDb(rows: VodAnalysisListItem[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const from = vi.fn(() => ({ orderBy }));
  const select = vi.fn(() => ({ from }));

  return { db: { select }, select, from, orderBy };
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

describe("listVodAnalyses", () => {
  it("selects list card fields newest-first", async () => {
    const firstCreatedAt = new Date("2026-01-02T00:00:00Z");
    const secondCreatedAt = new Date("2026-01-01T00:00:00Z");
    const rows: VodAnalysisListItem[] = [
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
    const { db, select, from, orderBy } = createListDb(rows);

    await expect(listVodAnalyses(db)).resolves.toEqual(rows);

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
    expect(orderBy).toHaveBeenCalledTimes(1);
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
