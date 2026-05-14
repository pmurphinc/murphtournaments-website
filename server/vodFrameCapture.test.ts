import { describe, expect, it, vi, beforeEach } from "vitest";
import { execFile } from "node:child_process";
import {
  buildVodFrameCapturePath,
  checkVodFrameCaptureBinaries,
  extractVodFrame,
  isTwitchVodSource,
} from "./vodFrameCapture";

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

const execFileMock = vi.mocked(execFile);

function mockExecFileResults(
  results: Array<{ error?: Error; stdout?: string; stderr?: string }>
) {
  execFileMock.mockImplementation(((_binary, _args, _options, callback) => {
    const result = results.shift() ?? { stdout: "" };
    const done = callback as (
      error: Error | null,
      stdout?: string,
      stderr?: string
    ) => void;

    done(result.error ?? null, result.stdout ?? "", result.stderr ?? "");
    return {};
  }) as typeof execFile);
}

describe("vodFrameCapture", () => {
  beforeEach(() => {
    execFileMock.mockReset();
  });

  it("skips non-Twitch sources without shelling out", async () => {
    await expect(
      extractVodFrame({
        vodAnalysisId: 44,
        captureJobId: 99,
        sourceUrl: "https://www.youtube.com/watch?v=abc123",
        timestampSeconds: 30,
        sampleIndex: 1,
      })
    ).resolves.toMatchObject({
      status: "skipped",
      timestampSeconds: 30,
      sampleIndex: 1,
      errorMessage:
        "Frame extraction skipped because only Twitch VOD sources are supported in this pass.",
    });

    expect(execFileMock).not.toHaveBeenCalled();
  });

  it("returns a clean failed result when required binaries are unavailable", async () => {
    mockExecFileResults([
      { error: new Error("spawn yt-dlp ENOENT") },
      { error: new Error("spawn ffmpeg ENOENT") },
    ]);

    await expect(
      extractVodFrame({
        vodAnalysisId: 44,
        captureJobId: 99,
        sourceUrl: "https://www.twitch.tv/videos/1234567890",
        timestampSeconds: 30,
        sampleIndex: 1,
      })
    ).resolves.toMatchObject({
      status: "failed",
      timestampSeconds: 30,
      sampleIndex: 1,
      errorMessage:
        "Frame extraction requires missing system binaries: ffmpeg, yt-dlp. Install yt-dlp and ffmpeg on the server to enable Twitch frame capture.",
    });
  });

  it("checks required runtime binaries with their supported version flags", async () => {
    mockExecFileResults([
      { stdout: "ffmpeg version 8" },
      { stdout: "2026.01.01" },
    ]);

    await expect(checkVodFrameCaptureBinaries()).resolves.toEqual({
      available: true,
      missing: [],
    });

    expect(execFileMock).toHaveBeenNthCalledWith(
      1,
      "ffmpeg",
      ["-version"],
      expect.objectContaining({ timeout: 30_000 }),
      expect.any(Function)
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      2,
      "yt-dlp",
      ["--version"],
      expect.objectContaining({ timeout: 30_000 }),
      expect.any(Function)
    );
  });

  it("can include safe binary check failure reasons for server diagnostics", async () => {
    mockExecFileResults([
      { error: new Error("spawn ffmpeg ENOENT") },
      { error: new Error("spawn yt-dlp ENOENT") },
    ]);

    await expect(
      checkVodFrameCaptureBinaries({ includeFailureReasons: true })
    ).resolves.toEqual({
      available: false,
      missing: ["ffmpeg", "yt-dlp"],
      failureReasons: {
        ffmpeg: "not found on PATH",
        "yt-dlp": "not found on PATH",
      },
    });
  });

  it("builds safe repo-local cache paths and filenames", () => {
    const paths = buildVodFrameCapturePath({
      vodAnalysisId: 44,
      captureJobId: 99,
      sourceUrl: "https://www.twitch.tv/videos/1234567890",
      timestampSeconds: 30,
      sampleIndex: 0,
    });

    expect(paths.fileName).toBe("sample-0001-000030.jpg");
    expect(paths.relativeFramePath).toBe(
      "server/.cache/vod-capture/44/99/sample-0001-000030.jpg"
    );
    expect(paths.framePath).toContain(
      "server/.cache/vod-capture/44/99/sample-0001-000030.jpg"
    );
    expect(paths.fileName).not.toContain("/");
  });

  it("captures Twitch frames through yt-dlp and ffmpeg when binaries are available", async () => {
    mockExecFileResults([
      { stdout: "ffmpeg version 8" },
      { stdout: "yt-dlp 2026.01.01" },
      { stdout: "https://vod-secure.twitch.tv/example.m3u8\n" },
      { stdout: "" },
    ]);

    const captureResult = await extractVodFrame({
      vodAnalysisId: 44,
      captureJobId: 99,
      sourceUrl: "https://www.twitch.tv/videos/1234567890",
      timestampSeconds: 30,
      sampleIndex: 0,
    });
    expect(captureResult).toMatchObject({
      status: "captured",
      timestampSeconds: 30,
      sampleIndex: 0,
      relativeFramePath:
        "server/.cache/vod-capture/44/99/sample-0001-000030.jpg",
      fileName: "sample-0001-000030.jpg",
    });

    expect(execFileMock).toHaveBeenNthCalledWith(
      3,
      "yt-dlp",
      ["--no-warnings", "--get-url", "https://www.twitch.tv/videos/1234567890"],
      expect.any(Object),
      expect.any(Function)
    );
    expect(execFileMock).toHaveBeenNthCalledWith(
      4,
      "ffmpeg",
      expect.arrayContaining([
        "-ss",
        "30",
        "-i",
        "https://vod-secure.twitch.tv/example.m3u8",
        "-frames:v",
        "1",
      ]),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it("recognizes Twitch VOD URLs only", () => {
    expect(isTwitchVodSource("https://www.twitch.tv/videos/1234567890")).toBe(
      true
    );
    expect(isTwitchVodSource("https://clips.twitch.tv/example")).toBe(false);
    expect(isTwitchVodSource("not a url")).toBe(false);
  });
});
