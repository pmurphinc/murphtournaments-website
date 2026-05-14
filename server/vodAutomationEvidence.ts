import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  isSafeVodCaptureFrameRequestPart,
  isSafeVodCaptureFrameFileName,
  VOD_CAPTURE_CACHE_ROOT,
} from "./vodFrameCapture";

export const VOD_AUTOMATION_EVIDENCE_FILE_NAME = "automation-evidence.json";
export const VOD_AUTOMATION_EVIDENCE_RECENT_SAMPLE_LIMIT = 10;

export const VOD_AUTOMATION_DETECTION_OUTCOMES = [
  "suggestion_created",
  "no_text",
  "low_confidence",
  "no_pattern_match",
  "missing_required_fields",
  "matched_missing_required_fields",
  "evidence_only_assist_text",
  "frame_failed",
  "ocr_failed",
] as const;

export type VodAutomationDetectionOutcome =
  (typeof VOD_AUTOMATION_DETECTION_OUTCOMES)[number];

export type VodAutomationFrameCaptureStatus = "captured" | "failed" | "skipped";

export type VodAutomationSampleEvidence = {
  sampleIndex: number;
  timestampSeconds: number;
  frameFileName?: string;
  frameCaptureStatus: VodAutomationFrameCaptureStatus;
  ocrAttempted: boolean;
  ocrConfidence?: number | null;
  ocrNormalizedText?: string;
  matchedPattern?: string;
  detectionOutcome: VodAutomationDetectionOutcome;
  safeMessage?: string;
};

export type VodAutomationScanEvidence = {
  captureJobId: number;
  plannedSamples: number;
  processedSamples: number;
  failedSamples: number;
  capturedFrameCount: number;
  ocrEnabled: boolean;
  ocrConfidenceThreshold: number;
  ocrAttemptedCount: number;
  ocrReadableTextCount: number;
  detectionCandidateCount: number;
  createdSuggestionCount: number;
  skippedLowConfidenceCount: number;
  skippedNoPatternMatchCount: number;
  skippedMissingRequiredFieldCount: number;
  recentSamples: VodAutomationSampleEvidence[];
};

export type VodAutomationEvidenceWriteInput = Omit<
  VodAutomationScanEvidence,
  "recentSamples"
> & {
  samples: VodAutomationSampleEvidence[];
};

const sampleEvidenceSchema = z.object({
  sampleIndex: z.number().int().min(0),
  timestampSeconds: z.number().int().min(0),
  frameFileName: z.string().refine(isSafeVodCaptureFrameFileName).optional(),
  frameCaptureStatus: z.enum(["captured", "failed", "skipped"]),
  ocrAttempted: z.boolean(),
  ocrConfidence: z.number().int().min(0).max(100).nullable().optional(),
  ocrNormalizedText: z.string().max(500).optional(),
  matchedPattern: z.string().max(80).optional(),
  detectionOutcome: z.enum(VOD_AUTOMATION_DETECTION_OUTCOMES),
  safeMessage: z.string().max(300).optional(),
});

const scanEvidenceSchema = z.object({
  captureJobId: z.number().int().positive(),
  plannedSamples: z.number().int().min(0),
  processedSamples: z.number().int().min(0),
  failedSamples: z.number().int().min(0),
  capturedFrameCount: z.number().int().min(0),
  ocrEnabled: z.boolean(),
  ocrConfidenceThreshold: z.number().int().min(0).max(100),
  ocrAttemptedCount: z.number().int().min(0),
  ocrReadableTextCount: z.number().int().min(0),
  detectionCandidateCount: z.number().int().min(0),
  createdSuggestionCount: z.number().int().min(0),
  skippedLowConfidenceCount: z.number().int().min(0),
  skippedNoPatternMatchCount: z.number().int().min(0),
  skippedMissingRequiredFieldCount: z.number().int().min(0),
  recentSamples: z
    .array(sampleEvidenceSchema)
    .max(VOD_AUTOMATION_EVIDENCE_RECENT_SAMPLE_LIMIT),
});

function isSafeEvidenceFileName(fileName: string): boolean {
  return fileName === VOD_AUTOMATION_EVIDENCE_FILE_NAME;
}

export function resolveVodAutomationEvidencePath(
  vodAnalysisId: string | number,
  captureJobId: string | number,
  cacheRoot: string = VOD_CAPTURE_CACHE_ROOT
): string | null {
  const vodAnalysisIdPart = String(vodAnalysisId);
  const captureJobIdPart = String(captureJobId);

  if (
    !isSafeVodCaptureFrameRequestPart(vodAnalysisIdPart) ||
    !isSafeVodCaptureFrameRequestPart(captureJobIdPart) ||
    !isSafeEvidenceFileName(VOD_AUTOMATION_EVIDENCE_FILE_NAME)
  ) {
    return null;
  }

  const rootPath = path.resolve(cacheRoot);
  const evidencePath = path.resolve(
    rootPath,
    vodAnalysisIdPart,
    captureJobIdPart,
    VOD_AUTOMATION_EVIDENCE_FILE_NAME
  );
  const relativeToRoot = path.relative(rootPath, evidencePath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return evidencePath;
}

function trimRecentSamples(samples: VodAutomationSampleEvidence[]) {
  return samples.slice(-VOD_AUTOMATION_EVIDENCE_RECENT_SAMPLE_LIMIT);
}

export function buildVodAutomationScanEvidence(
  input: VodAutomationEvidenceWriteInput
): VodAutomationScanEvidence {
  return {
    ...input,
    recentSamples: trimRecentSamples(input.samples),
  };
}

export async function writeVodAutomationScanEvidence(
  vodAnalysisId: number,
  input: VodAutomationEvidenceWriteInput,
  cacheRoot: string = VOD_CAPTURE_CACHE_ROOT
): Promise<VodAutomationScanEvidence | null> {
  const evidencePath = resolveVodAutomationEvidencePath(
    vodAnalysisId,
    input.captureJobId,
    cacheRoot
  );

  if (!evidencePath) return null;

  const evidence = buildVodAutomationScanEvidence(input);
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(
    evidencePath,
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8"
  );
  return evidence;
}

export async function readVodAutomationScanEvidenceFile(
  vodAnalysisId: number,
  captureJobId: number,
  cacheRoot: string = VOD_CAPTURE_CACHE_ROOT
): Promise<VodAutomationScanEvidence | null> {
  const evidencePath = resolveVodAutomationEvidencePath(
    vodAnalysisId,
    captureJobId,
    cacheRoot
  );

  if (!evidencePath) return null;

  try {
    const raw = await readFile(evidencePath, "utf8");
    const parsed = scanEvidenceSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
