import { execFile } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const execFileMock = vi.mocked(execFile);

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      get: () => "localhost",
    },
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    },
  } as unknown as TrpcContext;
}

describe("VOD automation tRPC guards", () => {
  it("blocks capture job processing before service work when runtime binaries are missing", async () => {
    execFileMock.mockImplementation(((_binary, _args, _options, callback) => {
      const done = callback as (error: Error | null) => void;
      done(new Error("spawn ENOENT"));
      return {};
    }) as typeof execFile);

    const caller = appRouter.createCaller(createPublicContext());

    await expect(
      caller.vodAnalysis.processCaptureJob({
        vodAnalysisId: 44,
        captureJobId: 99,
      })
    ).rejects.toThrow(
      "Capture job processing is blocked until ffmpeg and yt-dlp are available in the Railway runtime. Missing: ffmpeg, yt-dlp."
    );
  });
});
