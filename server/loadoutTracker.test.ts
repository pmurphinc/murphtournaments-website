import { afterEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("node:fs/promises", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn().mockRejectedValue(new Error("cache miss")),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
  };
});

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

describe("loadoutTracker.getItems", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("allows unauthenticated read-only balance archive access", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.loadoutTracker.getItems();

    expect(result).toEqual({
      items: [],
      metadata: {
        lastUpdated: null,
        dataSourceStatus: "empty",
        isFromCache: false,
        currentPatch: null,
        cacheAgeMinutes: null,
      },
    });
  });
});
