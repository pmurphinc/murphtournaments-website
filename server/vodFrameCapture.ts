import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

const execFileAsync = promisify(execFile);
export const VOD_CAPTURE_CACHE_ROOT = path.join(
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

export type VodCaptureFrameFilePreview = {
  vodAnalysisId: number;
  captureJobId: number;
  fileName: string;
  relativeFramePath: string;
  framePath: string;
  timestampSeconds: number | null;
};

const VOD_CAPTURE_FRAME_FILE_NAME_PATTERN = /^sample-\d{4}-(\d{6})\.jpg$/;

export function parseVodCaptureFrameTimestamp(fileName: string): number | null {
  const match = VOD_CAPTURE_FRAME_FILE_NAME_PATTERN.exec(fileName);
  if (!match) return null;

  return Number(match[1]);
}

export function isSafeVodCaptureFrameRequestPart(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) > 0;
}

export function isSafeVodCaptureFrameFileName(fileName: string): boolean {
  return VOD_CAPTURE_FRAME_FILE_NAME_PATTERN.test(fileName);
}

export function resolveVodCaptureFramePath(
  vodAnalysisId: string | number,
  captureJobId: string | number,
  fileName: string,
  cacheRoot: string = VOD_CAPTURE_CACHE_ROOT
): string | null {
  const vodAnalysisIdPart = String(vodAnalysisId);
  const captureJobIdPart = String(captureJobId);

  if (
    !isSafeVodCaptureFrameRequestPart(vodAnalysisIdPart) ||
    !isSafeVodCaptureFrameRequestPart(captureJobIdPart) ||
    !isSafeVodCaptureFrameFileName(fileName)
  ) {
    return null;
  }

  const rootPath = path.resolve(cacheRoot);
  const framePath = path.resolve(
    rootPath,
    vodAnalysisIdPart,
    captureJobIdPart,
    fileName
  );
  const relativeToRoot = path.relative(rootPath, framePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return framePath;
}

export function buildVodCaptureFrameUrl(
  vodAnalysisId: number,
  captureJobId: number,
  fileName: string
): string {
  return `/api/vod-capture-frame/${vodAnalysisId}/${captureJobId}/${encodeURIComponent(
    fileName
  )}`;
}

export async function getLatestVodCaptureFrameFile(
  vodAnalysisId: number,
  captureJobId: number,
  cacheRoot: string = VOD_CAPTURE_CACHE_ROOT
): Promise<VodCaptureFrameFilePreview | null> {
  const directoryPath = path.join(
    cacheRoot,
    String(vodAnalysisId),
    String(captureJobId)
  );

  let entries: string[];
  try {
    entries = await readdir(directoryPath);
  } catch {
    return null;
  }

  const candidates = await Promise.all(
    entries.filter(isSafeVodCaptureFrameFileName).map(async fileName => {
      const framePath = resolveVodCaptureFramePath(
        vodAnalysisId,
        captureJobId,
        fileName,
        cacheRoot
      );

      if (!framePath) return null;

      try {
        const fileStat = await stat(framePath);
        if (!fileStat.isFile()) return null;

        return { fileName, framePath, mtimeMs: fileStat.mtimeMs };
      } catch {
        return null;
      }
    })
  );
  const latest = candidates
    .filter((candidate): candidate is NonNullable<typeof candidate> =>
      Boolean(candidate)
    )
    .sort((left, right) => {
      const timestampDiff =
        (parseVodCaptureFrameTimestamp(right.fileName) ?? -1) -
        (parseVodCaptureFrameTimestamp(left.fileName) ?? -1);
      if (timestampDiff !== 0) return timestampDiff;

      return right.mtimeMs - left.mtimeMs;
    })[0];

  if (!latest) return null;

  return {
    vodAnalysisId,
    captureJobId,
    fileName: latest.fileName,
    framePath: latest.framePath,
    relativeFramePath: path.relative(process.cwd(), latest.framePath),
    timestampSeconds: parseVodCaptureFrameTimestamp(latest.fileName),
  };
}

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
