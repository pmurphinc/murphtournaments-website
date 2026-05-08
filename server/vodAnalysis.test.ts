import { describe, expect, it, vi } from "vitest";
import { vodAnalyses } from "../drizzle/schema";
import {
  buildVodAnalysisInsert,
  createVodAnalysis,
  createVodAnalysisInputSchema,
  listVodAnalyses,
  type VodAnalysisListItem,
} from "./vodAnalysis";

function createInsertDb() {
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
