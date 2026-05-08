import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "./db";
import {
  createVodAnalysis,
  getVodAnalysisById,
  listVodAnalyses,
} from "./vodAnalysis";
import { vodAnalyses } from "../drizzle/schema";

const mockedGetDb = vi.mocked(getDb);

function createMockDb(
  options: {
    insertedRows?: unknown[];
    selectedRows?: unknown[];
    selectRows?: unknown[];
  } = {}
) {
  const values = vi.fn().mockResolvedValue(options.insertedRows ?? []);
  const insert = vi.fn(() => ({ values }));

  const limit = vi.fn().mockResolvedValue(options.selectedRows ?? []);
  const orderBy = vi.fn(() => ({ limit }));
  const whereLimit = vi
    .fn()
    .mockResolvedValue(options.selectRows ?? options.selectedRows ?? []);
  const where = vi.fn(() => ({ limit: whereLimit }));
  const selectOrderBy = vi.fn().mockResolvedValue(options.selectRows ?? []);
  const from = vi.fn(() => ({ orderBy, where }));
  const select = vi.fn(() => ({ from }));

  return {
    db: { insert, select },
    insert,
    values,
    select,
    from,
    orderBy,
    limit,
    where,
    whereLimit,
    selectOrderBy,
  };
}

describe("VOD analysis DB helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a VOD analysis from a parsed source URL", async () => {
    const created = {
      id: 1,
      title: "Finals week 1",
      sourceType: "twitch",
      sourceId: "1234567890",
      sourceRef: "v1234567890",
      sourceUrl: "https://twitch.tv/videos/1234567890?t=1h23m45s",
      normalizedUrl: "https://www.twitch.tv/videos/1234567890",
      createdAt: new Date("2026-05-08T00:00:00Z"),
      updatedAt: new Date("2026-05-08T00:00:00Z"),
    };
    const mock = createMockDb({ selectedRows: [created] });
    mockedGetDb.mockResolvedValue(mock.db as Awaited<ReturnType<typeof getDb>>);

    const result = await createVodAnalysis({
      title: "Finals week 1",
      sourceUrl: "https://twitch.tv/videos/1234567890?t=1h23m45s",
    });

    expect(mock.insert).toHaveBeenCalledWith(vodAnalyses);
    expect(mock.values).toHaveBeenCalledWith({
      title: "Finals week 1",
      sourceType: "twitch",
      sourceId: "1234567890",
      sourceRef: "v1234567890",
      sourceUrl: "https://twitch.tv/videos/1234567890?t=1h23m45s",
      normalizedUrl: "https://www.twitch.tv/videos/1234567890",
    });
    expect(result).toBe(created);
  });

  it("throws before touching the database for invalid source URLs", async () => {
    await expect(createVodAnalysis({ sourceUrl: "not a url" })).rejects.toThrow(
      "Enter a valid video URL."
    );
    expect(mockedGetDb).not.toHaveBeenCalled();
  });

  it("returns undefined when creating without a database connection", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockedGetDb.mockResolvedValue(null);

    await expect(
      createVodAnalysis({ sourceUrl: "https://example.com/video/123" })
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledWith(
      "[Database] Cannot create VOD analysis: database not available"
    );
    warn.mockRestore();
  });

  it("gets a VOD analysis by id", async () => {
    const found = {
      id: 2,
      title: null,
      sourceType: "youtube",
      sourceId: "VIDEO_ID",
      sourceRef: "VIDEO_ID",
      sourceUrl: "https://youtu.be/VIDEO_ID",
      normalizedUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
      createdAt: new Date("2026-05-08T00:00:00Z"),
      updatedAt: new Date("2026-05-08T00:00:00Z"),
    };
    const mock = createMockDb({ selectRows: [found] });
    mockedGetDb.mockResolvedValue(mock.db as Awaited<ReturnType<typeof getDb>>);

    await expect(getVodAnalysisById(2)).resolves.toBe(found);

    expect(mock.from).toHaveBeenCalledWith(vodAnalyses);
    expect(mock.where).toHaveBeenCalledTimes(1);
    expect(mock.whereLimit).toHaveBeenCalledWith(1);
  });

  it("lists VOD analyses in newest-first order", async () => {
    const rows = [
      {
        id: 3,
        title: "Drive VOD",
        sourceType: "google_drive",
        sourceId: "FILE_ID",
        sourceRef: "FILE_ID",
        sourceUrl: "https://drive.google.com/file/d/FILE_ID/view",
        normalizedUrl: "https://drive.google.com/file/d/FILE_ID/view",
        createdAt: new Date("2026-05-08T00:00:00Z"),
        updatedAt: new Date("2026-05-08T00:00:00Z"),
      },
    ];
    const mock = createMockDb({ selectRows: rows });
    mock.from.mockReturnValueOnce({ orderBy: vi.fn().mockResolvedValue(rows) });
    mockedGetDb.mockResolvedValue(mock.db as Awaited<ReturnType<typeof getDb>>);

    await expect(listVodAnalyses()).resolves.toBe(rows);

    expect(mock.select).toHaveBeenCalledTimes(1);
    expect(mock.from).toHaveBeenCalledWith(vodAnalyses);
  });
});
