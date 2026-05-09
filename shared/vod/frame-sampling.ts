import type { VodSourceType } from "./source";

export type VodCaptureReadinessStatus =
  | "ready"
  | "missing_source_url"
  | "missing_duration"
  | "not_implemented"
  | "unsupported_source";

export type VodCaptureReadinessVod = {
  sourceType: VodSourceType | string;
  sourceUrl?: string | null;
  normalizedSourceUrl?: string | null;
  durationSeconds?: number | null;
};

export type FrameSamplingPlan = {
  durationSeconds: number;
  intervalSeconds: number;
  maxSamples: number;
  timestamps: number[];
};

export type VodCaptureReadiness = {
  status: VodCaptureReadinessStatus;
  isReady: boolean;
  reason: string;
  samplePlan: FrameSamplingPlan;
};

const DEFAULT_FRAME_SAMPLING_INTERVAL_SECONDS = 30;
const DEFAULT_FRAME_SAMPLING_MAX_SAMPLES = 200;

const CAPTURE_READINESS_LABELS: Record<VodCaptureReadinessStatus, string> = {
  ready: "Ready",
  missing_source_url: "Missing source URL",
  missing_duration: "Missing duration",
  not_implemented: "Not implemented",
  unsupported_source: "Unsupported source",
};

const CAPTURE_READINESS_REASONS: Record<VodCaptureReadinessStatus, string> = {
  ready:
    "This Twitch VOD has a usable URL and duration for future capture planning.",
  missing_source_url:
    "This Twitch VOD needs a valid source URL before future capture can be planned.",
  missing_duration:
    "This Twitch VOD needs duration metadata before future capture can be planned.",
  not_implemented:
    "Future capture planning is not implemented for this source type yet.",
  unsupported_source:
    "Future capture planning only supports known Twitch VOD sources right now.",
};

function normalizePositiveInteger(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.floor(value);
}

function hasUsableVodUrl(vod: VodCaptureReadinessVod): boolean {
  const candidate = (vod.normalizedSourceUrl || vod.sourceUrl || "").trim();

  if (!candidate) {
    return false;
  }

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function buildFrameSamplingPlan(
  durationSeconds: number | null | undefined,
  intervalSeconds = DEFAULT_FRAME_SAMPLING_INTERVAL_SECONDS,
  maxSamples = DEFAULT_FRAME_SAMPLING_MAX_SAMPLES
): FrameSamplingPlan {
  const normalizedDurationSeconds = normalizePositiveInteger(durationSeconds);
  const normalizedIntervalSeconds = Math.max(
    1,
    normalizePositiveInteger(intervalSeconds) || 1
  );
  const normalizedMaxSamples = Math.max(
    0,
    Math.floor(Number.isFinite(maxSamples) ? maxSamples : 0)
  );
  const timestamps: number[] = [];

  if (normalizedDurationSeconds <= 0 || normalizedMaxSamples <= 0) {
    return {
      durationSeconds: normalizedDurationSeconds,
      intervalSeconds: normalizedIntervalSeconds,
      maxSamples: normalizedMaxSamples,
      timestamps,
    };
  }

  for (
    let timestamp = 0;
    timestamp <= normalizedDurationSeconds &&
    timestamps.length < normalizedMaxSamples;
    timestamp += normalizedIntervalSeconds
  ) {
    timestamps.push(timestamp);
  }

  return {
    durationSeconds: normalizedDurationSeconds,
    intervalSeconds: normalizedIntervalSeconds,
    maxSamples: normalizedMaxSamples,
    timestamps,
  };
}

export function getVodCaptureReadiness(
  vod: VodCaptureReadinessVod
): VodCaptureReadiness {
  const samplePlan = buildFrameSamplingPlan(vod.durationSeconds);
  let status: VodCaptureReadinessStatus;

  if (vod.sourceType === "twitch") {
    if (!hasUsableVodUrl(vod)) {
      status = "missing_source_url";
    } else if (samplePlan.durationSeconds <= 0) {
      status = "missing_duration";
    } else {
      status = "ready";
    }
  } else if (
    vod.sourceType === "youtube" ||
    vod.sourceType === "google_drive"
  ) {
    status = "not_implemented";
  } else {
    status = "unsupported_source";
  }

  return {
    status,
    isReady: status === "ready",
    reason: CAPTURE_READINESS_REASONS[status],
    samplePlan,
  };
}

export function formatCaptureReadinessLabel(
  status: VodCaptureReadinessStatus
): string {
  return CAPTURE_READINESS_LABELS[status];
}
