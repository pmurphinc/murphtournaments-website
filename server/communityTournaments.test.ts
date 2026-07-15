import { afterEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./_core/context";

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

function thenableSelect(result: unknown[] | (() => never)) {
  const builder: {
    from: () => typeof builder;
    leftJoin: () => typeof builder;
    innerJoin: () => typeof builder;
    where: () => typeof builder;
    limit: () => typeof builder;
    then: (
      resolve: (rows: unknown[]) => unknown,
      reject: (error: unknown) => unknown
    ) => Promise<unknown>;
  } = {
    from: () => builder,
    leftJoin: () => builder,
    innerJoin: () => builder,
    where: () => builder,
    limit: () => builder,
    then: (resolve, reject) => {
      if (typeof result === "function") {
        try {
          result();
          return Promise.resolve([]).then(resolve, reject);
        } catch (error) {
          return Promise.reject(error).then(resolve, reject);
        }
      }
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return builder;
}

/** Fake db whose every `select()` resolves to the same fixed row set — enough
 * to exercise the NOT_FOUND / real-error branches without re-testing drizzle's
 * own SQL filtering (unchanged, existing code). */
function fakeDbReturning(rows: unknown[]) {
  return { select: () => thenableSelect(rows) };
}

function fakeDbThrowing(error: Error) {
  return {
    select: () =>
      thenableSelect(() => {
        throw error;
      }),
  };
}

const dbState: { current: unknown } = { current: null };

vi.mock("./db", () => ({
  getDb: vi.fn(async () => dbState.current),
}));

describe("communityTournaments public read reliability", () => {
  afterEach(() => {
    dbState.current = null;
    vi.restoreAllMocks();
  });

  it("list() degrades to an empty array when the database is unavailable, instead of throwing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    dbState.current = null;

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.communityTournaments.list()).resolves.toEqual([]);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        "[Database] Cannot list community tournaments: database not available"
      )
    );
  });

  it("list() still throws a real error when the database is available but the query fails", async () => {
    dbState.current = fakeDbThrowing(new Error("connection reset"));

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicContext());

    await expect(caller.communityTournaments.list()).rejects.toThrow(
      "connection reset"
    );
  });

  it("getBySlug() throws a distinguishable, logged error when the database is unavailable (not a fake 404)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    dbState.current = null;

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.communityTournaments.getBySlug({ slug: "real-tournament" })
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("temporarily unavailable"),
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("getBySlug(slug=real-tournament)")
    );
  });

  it("getBySlug() still throws a typed NOT_FOUND for a genuinely missing slug when the database is available", async () => {
    dbState.current = fakeDbReturning([]);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.communityTournaments.getBySlug({ slug: "does-not-exist" })
    ).rejects.toMatchObject(
      new TRPCError({ code: "NOT_FOUND", message: "Tournament not found." })
    );
  });

  it("getResultsArchive() throws a distinguishable, logged error when the database is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    dbState.current = null;

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.communityTournaments.getResultsArchive({ tournamentId: 42 })
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: expect.stringContaining("temporarily unavailable"),
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("getResultsArchive(tournamentId=42)")
    );
  });

  it("getResultsArchive() still throws a typed NOT_FOUND when the tournament isn't finalized, database available", async () => {
    dbState.current = fakeDbReturning([]);

    const { appRouter } = await import("./routers");
    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.communityTournaments.getResultsArchive({ tournamentId: 99 })
    ).rejects.toMatchObject(
      new TRPCError({
        code: "NOT_FOUND",
        message: "Finalized results not found.",
      })
    );
  });
});
