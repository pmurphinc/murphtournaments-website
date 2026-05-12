import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
const VOD_CAPTURE_CACHE_ROOT = path.join(
  process.cwd(),
  "server",
  ".cache",
  "vod-capture"
);
const CHILD_PROCESS_TIMEOUT_MS = 30_000;

export type VodFrameCaptureInput = {
  vodAnalysisId: number;
  captureJobId: number;
  sourceUrl: string;
  timestampSeconds: number;
  sampleIndex: number;
};

export type VodFrameCaptureResult =
  | {
      status: "captured";
      timestampSeconds: number;
      sampleIndex: number;
      framePath: string;
      relativeFramePath: string;
      fileName: string;
    }
  | {
      status: "skipped" | "failed";
      timestampSeconds: number;
      sampleIndex: number;
      errorMessage: string;
    };

type RequiredBinary = "yt-dlp" | "ffmpeg";

export type VodFrameCaptureBinaryCheck = {
  available: boolean;
  missing: RequiredBinary[];
};

function baseCaptureResult(input: VodFrameCaptureInput) {
  return {
    timestampSeconds: input.timestampSeconds,
    sampleIndex: input.sampleIndex,
  };
}

function getChildProcessErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown frame extraction process error.";
}

async function isBinaryAvailable(binary: RequiredBinary): Promise<boolean> {
  try {
    await execFileAsync(binary, ["--version"], {
      timeout: CHILD_PROCESS_TIMEOUT_MS,
    });
    return true;
  } catch {
    return false;
  }
}

export async function checkVodFrameCaptureBinaries(): Promise<VodFrameCaptureBinaryCheck> {
  const checks = await Promise.all([
    isBinaryAvailable("yt-dlp"),
    isBinaryAvailable("ffmpeg"),
  ]);
  const missing: RequiredBinary[] = [];

  if (!checks[0]) missing.push("yt-dlp");
  if (!checks[1]) missing.push("ffmpeg");

  return { available: missing.length === 0, missing };
}

export function isTwitchVodSource(sourceUrl: string): boolean {
  try {
    const parsedUrl = new URL(sourceUrl);
    const host = parsedUrl.hostname.toLowerCase();
    return (
      (host === "twitch.tv" || host.endsWith(".twitch.tv")) &&
      /^\/videos\/\d+\/?$/.test(parsedUrl.pathname)
    );
  } catch {
    return false;
  }
}

function padNumber(value: number, width: number): string {
  return String(Math.max(0, Math.trunc(value))).padStart(width, "0");
}

export function buildVodFrameCapturePath(input: VodFrameCaptureInput): {
  directoryPath: string;
  framePath: string;
  relativeFramePath: string;
  fileName: string;
} {
  const safeVodAnalysisId = padNumber(input.vodAnalysisId, 1);
  const safeCaptureJobId = padNumber(input.captureJobId, 1);
  const sampleNumber = padNumber(input.sampleIndex + 1, 4);
  const timestamp = padNumber(input.timestampSeconds, 6);
  const fileName = `sample-${sampleNumber}-${timestamp}.jpg`;
  const directoryPath = path.join(
    VOD_CAPTURE_CACHE_ROOT,
    safeVodAnalysisId,
    safeCaptureJobId
  );
  const framePath = path.join(directoryPath, fileName);
  const relativeFramePath = path.relative(process.cwd(), framePath);

  return { directoryPath, framePath, relativeFramePath, fileName };
}

export async function extractVodFrame(
  input: VodFrameCaptureInput
): Promise<VodFrameCaptureResult> {
  const sourceUrl = input.sourceUrl.trim();

  if (!sourceUrl) {
    return {
      ...baseCaptureResult(input),
      status: "skipped",
      errorMessage:
        "Frame extraction skipped because the VOD source URL is missing.",
    };
  }

  if (!isTwitchVodSource(sourceUrl)) {
    return {
      ...baseCaptureResult(input),
      status: "skipped",
      errorMessage:
        "Frame extraction skipped because only Twitch VOD sources are supported in this pass.",
    };
  }

  const binaryCheck = await checkVodFrameCaptureBinaries();

  if (!binaryCheck.available) {
    return {
      ...baseCaptureResult(input),
      status: "failed",
      errorMessage: `Frame extraction requires missing system binaries: ${binaryCheck.missing.join(
        ", "
      )}. Install yt-dlp and ffmpeg on the server to enable Twitch frame capture.`,
    };
  }

  try {
    const paths = buildVodFrameCapturePath(input);
    await mkdir(paths.directoryPath, { recursive: true });

    const ytDlpOutput = await execFileAsync(
      "yt-dlp",
      ["--no-warnings", "--get-url", sourceUrl],
      {
        timeout: CHILD_PROCESS_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
      }
    );
    const ytDlpStdout =
      typeof ytDlpOutput === "string" ? ytDlpOutput : ytDlpOutput.stdout;
    const streamUrl = ytDlpStdout.toString().trim().split("\n").find(Boolean);

    if (!streamUrl) {
      return {
        ...baseCaptureResult(input),
        status: "failed",
        errorMessage: "yt-dlp did not return a playable Twitch VOD stream URL.",
      };
    }

    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(Math.max(0, Math.trunc(input.timestampSeconds))),
        "-i",
        streamUrl,
        "-frames:v",
        "1",
        "-q:v",
        "2",
        paths.framePath,
      ],
      {
        timeout: CHILD_PROCESS_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
      }
    );

    return {
      ...baseCaptureResult(input),
      status: "captured",
      framePath: paths.framePath,
      relativeFramePath: paths.relativeFramePath,
      fileName: paths.fileName,
    };
  } catch (error) {
    return {
      ...baseCaptureResult(input),
      status: "failed",
      errorMessage: `Frame extraction failed: ${getChildProcessErrorMessage(error)}`,
    };
  }
}
