import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for the patchNotes tRPC router.
 * - patchNotes.getAll: returns patch notes from the database
 * - patchNotes.scrapeAndStore: triggers the wiki scraper
 */

// Mock the db module
vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAllPatchNotes: vi.fn(),
  };
});

// Mock the patchNoteScraper module
vi.mock("./patchNoteScraper", () => ({
  scrapeAndStorePatchNotes: vi.fn(),
}));

import { getAllPatchNotes } from "./db";
import { scrapeAndStorePatchNotes } from "./patchNoteScraper";

const mockedGetAllPatchNotes = vi.mocked(getAllPatchNotes);
const mockedScrapeAndStore = vi.mocked(scrapeAndStorePatchNotes);

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

describe("patchNotes.getAll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mapped patch notes from the database", async () => {
    const mockNotes = [
      {
        id: 5,
        title: "UPDATE 10.3.0",
        date: "2026.04.17",
        content: "<noinclude></noinclude>Respec Order adjusts health values...",
        url: "https://www.reachthefinals.com/patchnotes/1030",
        sourceUrl: "https://www.thefinals.wiki/wiki/Update_10.3.0",
        version: "10.3.0",
        isGameUpdate: 1,
        createdAt: new Date("2026-04-17T00:00:00Z"),
        updatedAt: new Date("2026-04-17T00:00:00Z"),
      },
      {
        id: 4,
        title: "SEASON 10 | FANTASY LEAGUE",
        date: "2026.03.26",
        content: "Season 10 brings Fantasy League...",
        url: "https://www.reachthefinals.com/patchnotes/1000",
        sourceUrl: "https://www.thefinals.wiki/wiki/Season_10",
        version: "10.0.0",
        isGameUpdate: 1,
        createdAt: new Date("2026-03-26T00:00:00Z"),
        updatedAt: new Date("2026-03-26T00:00:00Z"),
      },
    ];

    mockedGetAllPatchNotes.mockResolvedValue(mockNotes);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.patchNotes.getAll();

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: -1060,
      title: "Midseason Update 10.6.0",
      date: "2026.05.07",
      url: "https://www.reachthefinals.com/patchnotes/10-60",
      version: "10.6.0",
    });
    expect(result[0].content).toContain("Dragon’s Claim Limited-Time Mode");
    expect(result[0].content).toContain(
      "V9S: magazine size decreased from 20 to 18."
    );
    expect(result[1]).toEqual({
      id: 5,
      title: "UPDATE 10.3.0",
      date: "2026.04.17",
      content: "Respec Order adjusts health values...",
      url: "https://www.reachthefinals.com/patchnotes/1030",
      version: "10.3.0",
    });
    expect(result[2]).toEqual({
      id: 4,
      title: "SEASON 10 | FANTASY LEAGUE",
      date: "2026.03.26",
      content: "Season 10 brings Fantasy League...",
      url: "https://www.reachthefinals.com/patchnotes/1000",
      version: "10.0.0",
    });

    // Should not include sourceUrl, isGameUpdate, createdAt, updatedAt in the response
    expect(result[0]).not.toHaveProperty("sourceUrl");
    expect(result[0]).not.toHaveProperty("isGameUpdate");
    expect(result[0]).not.toHaveProperty("createdAt");
  });

  it("returns website patch notes when database is empty", async () => {
    mockedGetAllPatchNotes.mockResolvedValue([]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.patchNotes.getAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: -1060,
      title: "Midseason Update 10.6.0",
      version: "10.6.0",
    });
  });

  it("returns website patch notes on database error", async () => {
    mockedGetAllPatchNotes.mockRejectedValue(new Error("DB connection failed"));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.patchNotes.getAll();

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: -1060,
      title: "Midseason Update 10.6.0",
      version: "10.6.0",
    });
  });
});

describe("patchNotes.scrapeAndStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the scraper and returns results", async () => {
    const mockResult = { added: 3, skipped: 5, errors: 0 };
    mockedScrapeAndStore.mockResolvedValue(mockResult);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.patchNotes.scrapeAndStore();

    expect(mockedScrapeAndStore).toHaveBeenCalledOnce();
    expect(result).toEqual({ added: 3, skipped: 5, errors: 0 });
  });

  it("returns error result when scraper fails", async () => {
    const mockResult = {
      added: 0,
      skipped: 0,
      errors: 0,
      error: "Wiki index fetch failed: 500",
    };
    mockedScrapeAndStore.mockResolvedValue(mockResult);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.patchNotes.scrapeAndStore();

    expect(result).toHaveProperty("error");
    expect(result.error).toBe("Wiki index fetch failed: 500");
  });
});
