import {
  VOD_ANALYSIS_EVENT_REQUIRED_FIELDS,
  type VodAnalysisEventType,
} from "../../shared/vod/events";
import {
  getVodHudZonePreset,
  type VodHudZone,
} from "../../shared/vod/hud-zones";
import type {
  DetectedAutomationEventInput,
  VodAnalysisRecord,
  VodCaptureJobRecord,
  VodCaptureSampleDetector,
} from "../vodAnalysis";
import type { VodFrameCaptureResult } from "../vodFrameCapture";

export const CENTER_EVENT_TEXT_DETECTOR_VERSION = "center-event-text-v1";
export const CENTER_EVENT_TEXT_HUD_ZONE_ID = "center_event_text";

export type CenterEventTextDetectionInput = {
  vodAnalysis: VodAnalysisRecord;
  captureJob: VodCaptureJobRecord;
  frameCapture: VodFrameCaptureResult;
  timestampSeconds: number;
  sampleIndex: number;
  zone: VodHudZone;
};

export type CenterEventTextDetectionResult = {
  detections: DetectedAutomationEventInput[];
  debugText: string | null;
  detectorVersion: string;
};

export type CenterEventTextParseContext = {
  teamLabel?: string | null;
  actorLabel?: string | null;
  targetLabel?: string | null;
};

export type CenterEventTextDetectorOptions = {
  getText?: (
    input: CenterEventTextDetectionInput
  ) => string | null | undefined | Promise<string | null | undefined>;
  parseContext?:
    | CenterEventTextParseContext
    | ((input: CenterEventTextDetectionInput) => CenterEventTextParseContext);
};

type CandidateDetection = DetectedAutomationEventInput & {
  metadata?: Record<string, unknown>;
};

function normalizeDetectedText(text: string): string {
  return text.trim().replace(/\s+/g, " ").toUpperCase();
}

function normalizeOptionalLabel(
  label: string | null | undefined
): string | null {
  const trimmed = label?.trim();
  return trimmed ? trimmed : null;
}

function extractExplicitTeamLabel(text: string): string | null {
  const patterns = [
    /\bTEAM\s+([A-Z][A-Z0-9 '&-]{1,40})\s+(?:WIPED|WIPE)\b/i,
    /\b([A-Z][A-Z0-9 '&-]{1,40})\s+TEAM\s+(?:WIPED|WIPE)\b/i,
    /\b([A-Z][A-Z0-9 '&-]{1,40})\s+(?:CASHOUT\s+COMPLETE|CASHOUT\s+STOLEN|STOLEN)\b/i,
    /\b(?:CASHOUT\s+COMPLETE|CASHOUT\s+STOLEN|STOLEN)\s+(?:BY|FOR)\s+([A-Z][A-Z0-9 '&-]{1,40})\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    const label = normalizeOptionalLabel(match?.[1]);
    if (label) return label;
  }

  return null;
}

function extractCashoutLabel(text: string): string | null {
  const match = /\b(?:CASHOUT|STATION)\s*([A-E])\b/i.exec(text);
  if (match?.[1]) return match[1].toUpperCase();

  const trailingMatch =
    /\b(?:CASHOUT\s+COMPLETE|CASHOUT\s+STOLEN|STOLEN)\s+([A-E])\b/i.exec(text);
  return trailingMatch?.[1]?.toUpperCase() ?? null;
}

function hasRequiredFields(detection: DetectedAutomationEventInput): boolean {
  const requiredFields =
    VOD_ANALYSIS_EVENT_REQUIRED_FIELDS[detection.eventType];

  return requiredFields.every(field => {
    const value = detection[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function withValidation(
  detection: CandidateDetection,
  matchedText: string,
  reason: string
): DetectedAutomationEventInput[] {
  const metadata = {
    ...(detection.metadata ?? {}),
    detectorVersion: CENTER_EVENT_TEXT_DETECTOR_VERSION,
    hudZoneId: CENTER_EVENT_TEXT_HUD_ZONE_ID,
    matchedText,
    matchedPattern: reason,
  };
  const candidate: DetectedAutomationEventInput = { ...detection, metadata };

  if (!hasRequiredFields(candidate)) {
    return [];
  }

  return [candidate];
}

function buildObjectiveDetection(
  eventType: Extract<VodAnalysisEventType, "cashout" | "steal_flip">,
  timestampSeconds: number,
  matchedText: string,
  context: CenterEventTextParseContext,
  reason: string
): DetectedAutomationEventInput[] {
  const teamLabel =
    normalizeOptionalLabel(context.teamLabel) ??
    extractExplicitTeamLabel(matchedText);
  const targetLabel =
    normalizeOptionalLabel(context.targetLabel) ??
    extractCashoutLabel(matchedText);

  return withValidation(
    {
      eventType,
      timestampSeconds,
      targetLabel,
      teamLabel,
      confidence: eventType === "cashout" ? 86 : 84,
    },
    matchedText,
    reason
  );
}

function buildTeamWipeDetection(
  timestampSeconds: number,
  matchedText: string,
  context: CenterEventTextParseContext
): DetectedAutomationEventInput[] {
  const teamLabel =
    normalizeOptionalLabel(context.teamLabel) ??
    extractExplicitTeamLabel(matchedText);
  const actorLabel = normalizeOptionalLabel(context.actorLabel) ?? teamLabel;

  return withValidation(
    {
      eventType: "team_wipe",
      timestampSeconds,
      actorLabel,
      teamLabel,
      confidence: 82,
    },
    matchedText,
    "team_wipe_text"
  );
}

export function parseCenterEventTextToDetections(
  text: string | null | undefined,
  timestampSeconds: number,
  context: CenterEventTextParseContext = {}
): DetectedAutomationEventInput[] {
  const matchedText = normalizeOptionalLabel(text);
  if (!matchedText) return [];

  const normalizedText = normalizeDetectedText(matchedText);

  if (/\bTEAM\s+WIP(?:ED|E)\b/.test(normalizedText)) {
    return buildTeamWipeDetection(timestampSeconds, matchedText, context);
  }

  if (/\bCASHOUT\s+COMPLETE\b/.test(normalizedText)) {
    return buildObjectiveDetection(
      "cashout",
      timestampSeconds,
      matchedText,
      context,
      "cashout_complete_text"
    );
  }

  if (
    /\bCASHOUT\s+STOLEN\b/.test(normalizedText) ||
    /\bSTOLEN\b/.test(normalizedText)
  ) {
    return buildObjectiveDetection(
      "steal_flip",
      timestampSeconds,
      matchedText,
      context,
      "cashout_stolen_text"
    );
  }

  return [];
}

export function getCenterEventTextZone(
  vodAnalysis: Pick<VodAnalysisRecord, "videoPov">
): VodHudZone {
  const preset = getVodHudZonePreset(vodAnalysis.videoPov);
  const zone = preset.zones.find(
    candidate => candidate.id === CENTER_EVENT_TEXT_HUD_ZONE_ID
  );

  if (!zone) {
    throw new Error("Center event text HUD zone preset is not configured.");
  }

  return zone;
}

export async function detectCenterEventText(
  input: CenterEventTextDetectionInput,
  options: CenterEventTextDetectorOptions = {}
): Promise<CenterEventTextDetectionResult> {
  const debugText = (await options.getText?.(input)) ?? null;
  const parseContext =
    typeof options.parseContext === "function"
      ? options.parseContext(input)
      : (options.parseContext ?? {});
  const detections = parseCenterEventTextToDetections(
    debugText,
    input.timestampSeconds,
    parseContext
  );

  return {
    detections,
    debugText,
    detectorVersion: CENTER_EVENT_TEXT_DETECTOR_VERSION,
  };
}

export function createCenterEventTextSampleDetector(
  options: CenterEventTextDetectorOptions = {}
): VodCaptureSampleDetector {
  return async input => {
    const frameCapture = input.frameCapture;
    if (!frameCapture) return [];

    const zone = getCenterEventTextZone(input.vodAnalysis);
    const result = await detectCenterEventText(
      {
        vodAnalysis: input.vodAnalysis,
        captureJob: input.captureJob,
        frameCapture,
        timestampSeconds: input.sampleTimestampSeconds,
        sampleIndex: input.sampleIndex,
        zone,
      },
      options
    );

    return result.detections.map(detection => ({
      ...detection,
      metadata: {
        ...(typeof detection.metadata === "object" &&
        detection.metadata !== null &&
        !Array.isArray(detection.metadata)
          ? detection.metadata
          : {}),
        detectorVersion: CENTER_EVENT_TEXT_DETECTOR_VERSION,
        hudZoneId: zone.id,
        sampleIndex: input.sampleIndex,
        timestampSeconds: input.sampleTimestampSeconds,
        ...(frameCapture.status === "captured"
          ? {
              frameFileName: frameCapture.fileName,
              relativeFramePath: frameCapture.relativeFramePath,
            }
          : {}),
      },
    }));
  };
}
