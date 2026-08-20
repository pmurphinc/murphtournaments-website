import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for the patchNotes tRPC router.
 * - patchNotes.getAll: returns patch notes from the database plus website fallbacks
 * - patchNotes.scrapeAndStore: triggers the wiki scraper
 */

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAllPatchNotes: vi.fn(),
  };
});

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

  it("returns mapped patch notes from the database with current website fallbacks", async () => {
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

    expect(result).toHaveLength(7);
    expect(result[0]).toMatchObject({
      id: -1160,
      title: "Update 11.6.0",
      date: "2026.08.20",
      url: "https://www.reachthefinals.com/patchnotes/11-60",
      version: "11.6.0",
    });

    const update116 = result.find(note => note.version === "11.6.0");
    expect(update116).toBeDefined();
    for (const expectedContent of [
      "Orbital Hitters",
      "Deep Signal",
      "Sugar Shocker / Sugar Crasher Sets",
      "Hullwalker Set",
      "Connection Complete Sticker",
      "Lockbolt: reload animation duration decreased from 2.2s to 1.75s",
      "Dematerializer: cooldown decreased from 20s to 15s per charge",
      "Guardian Turret: activation time decreased from 3.5s to 3s",
      "AKM: damage increased from 20 to 21",
      "ARN-220: fire rate increased from 725 RPM to 750 RPM",
      "BFR Titan: damage falloff multiplier increased from 0.65 to 0.7",
      "Cerberus 12GA: pellet damage increased from 8 to 9",
      "Dagger — Primary: base damage increased from 42 to 49",
      "Dual Blades: primary Precision zone angle increased from 9° to 12°",
      "KS-23: damage falloff multiplier decreased from 0.675 to 0.58",
      "M11: hip-fire recoil increased by approximately 75%",
      "Recurve Bow: maximum-draw damage increased from 124 to 126",
      "Shield Bash: damage increased from 40 to 50",
      "Spear — Primary: damage sweep box increased by 60%",
      "XP-54: recoil curve updated",
      "gyro-controller users",
      "KB5121003",
      "Upgraded Unreal Engine from 5.3 to 5.7",
      "Dual Blades Deflect",
      "Riot Shield: fixed missing third-person visual and sound effects",
    ]) {
      expect(update116?.content).toContain(expectedContent);
    }

    const update113 = result.find(note => note.version === "11.3.0");
    expect(update113).toBeDefined();
    expect(update113?.content).toContain(
      "C4: cooldown increased from 30s to 45s."
    );
    expect(update113?.content).toContain(
      "Dome Shield: fixed friendly melee attacks damaging the shield."
    );
    for (const expectedChange of [
      "Grappling Hook: cooldown decreased from 7s to 6s.",
      "BFR: damage increased from 88 to 90",
      "Dagger: primary and secondary lunge distance increased from 4.5m to 5m",
      "Dual Blades: Precision zone angle increased from 8° to 9°",
      "FAMAS: damage increased from 23 to 24",
      "KS-23: damage decreased from 110 to 104",
      "Riot Shield: Precision zone angle increased from 9° to 10°",
      "Spear: primary precise damage increased from 74 to 82",
    ]) {
      expect(update113?.content).toContain(expectedChange);
    }

    expect(result.find(note => note.version === "10.3.0")).toEqual({
      id: 5,
      title: "UPDATE 10.3.0",
      date: "2026.04.17",
      content: "Respec Order adjusts health values...",
      url: "https://www.reachthefinals.com/patchnotes/1030",
      version: "10.3.0",
    });
    expect(result.find(note => note.version === "10.0.0")).toEqual({
      id: 4,
      title: "SEASON 10 | FANTASY LEAGUE",
      date: "2026.03.26",
      content: "Season 10 brings Fantasy League...",
      url: "https://www.reachthefinals.com/patchnotes/1000",
      version: "10.0.0",
    });

    expect(result[0]).not.toHaveProperty("sourceUrl");
    expect(result[0]).not.toHaveProperty("isGameUpdate");
    expect(result[0]).not.toHaveProperty("createdAt");
  });

  it("returns website patch notes when database is empty", async () => {
    mockedGetAllPatchNotes.mockResolvedValue([]);

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.patchNotes.getAll();

    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({
      id: -1160,
      title: "Update 11.6.0",
      version: "11.6.0",
    });
  });

  it("returns website patch notes on database error", async () => {
    mockedGetAllPatchNotes.mockRejectedValue(new Error("DB connection failed"));

    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.patchNotes.getAll();

    expect(result).toHaveLength(5);
    expect(result[0]).toMatchObject({
      id: -1160,
      title: "Update 11.6.0",
      version: "11.6.0",
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
