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
import type {
  VodAutomationDetectionOutcome,
  VodAutomationSampleEvidence,
} from "../vodAutomationEvidence";
import {
  getVodAutomationOcrConfidenceThreshold,
  isVodAutomationOcrEnabled,
  recognizeCenterEventTextFromFrame,
  type CenterEventTextOcrResult,
} from "./centerEventTextOcr";

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
  ocrResult: CenterEventTextOcrResult | null;
  detectorVersion: string;
  evidence: Omit<
    VodAutomationSampleEvidence,
    "frameFileName" | "frameCaptureStatus"
  >;
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
  getOcrResult?: (
    input: CenterEventTextDetectionInput
  ) =>
    | CenterEventTextOcrResult
    | null
    | undefined
    | Promise<CenterEventTextOcrResult | null | undefined>;
  ocrEnabled?: boolean;
  ocrConfidenceThreshold?: number;
  dedupeCooldownSeconds?: number;
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
    /\b([A-Z][A-Z0-9 '&-]{1,40})\s+(?:CASHOUT\s+COMPLETE|CASHOUT\s+STOLEN|STOLEN|CASHOUT\s+STARTED(?:\s+BONUS)?|VAULT\s+OPENED(?:\s+BONUS)?)\b/i,
    /\b(?:CASHOUT\s+COMPLETE|CASHOUT\s+STOLEN|STOLEN|CASHOUT\s+STARTED(?:\s+BONUS)?|VAULT\s+OPENED(?:\s+BONUS)?)\s+(?:BY|FOR)\s+([A-Z][A-Z0-9 '&-]{1,40})\b/i,
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
    /\b(?:CASHOUT\s+COMPLETE|CASHOUT\s+STOLEN|STOLEN|CASHOUT\s+STARTED(?:\s+BONUS)?)\s+([A-E])\b/i.exec(
      text
    );
  return trailingMatch?.[1]?.toUpperCase() ?? null;
}

function extractVaultLabel(text: string): string | null {
  const match = /\bVAULT\s*#?\s*([1-6])\b/i.exec(text);
  if (match?.[1]) return match[1];

  const trailingMatch = /\bVAULT\s+OPENED(?:\s+BONUS)?\s+([1-6])\b/i.exec(text);
  return trailingMatch?.[1] ?? null;
}

function trimPlayerLabel(value: string | null | undefined): string | null {
  const withoutTrailingContext = value
    ?.replace(
      /\b(?:ASSIST(?:ED)?|REVIV(?:E|ED|ING)|ELIMINATED(?:\s+BY)?|CASHOUT|VAULT|TEAM\s+WIP(?:ED|E))\b.*$/i,
      ""
    )
    .replace(/\s+(?:\+?\$?\d[\d,]*|\+\d[\d,]*\s*(?:XP|PTS?)?)\b.*$/i, "")
    .replace(/^[\s:"'“”‘’]+|[\s.,!?:;"'“”‘’]+$/g, "");
  const label = normalizeOptionalLabel(withoutTrailingContext);
  return label && /^[A-Z0-9_. -]+$/i.test(label) ? label : null;
}

function extractEliminatedPlayer(text: string): string | null {
  const match =
    /\bELIMINATED\s+(?!BY\b)([A-Z0-9_. -]{1,40})(?=\s+ASSIST(?:ED)?\b|\s+REVIV(?:E|ED|ING)\b|\s+\+?\$?\d|[.,!?:;"'“”‘’]*\s*$)/i.exec(
      text
    );
  return trimPlayerLabel(match?.[1]);
}

function extractEliminatedByPlayer(text: string): string | null {
  const match =
    /\bELIMINATED\s+BY\s+([A-Z0-9_. -]{1,40})(?=\s+ASSIST(?:ED)?\b|\s+REVIV(?:E|ED|ING)\b|\s+\+?\$?\d|[.,!?:;"'“”‘’]*\s*$)/i.exec(
      text
    );
  return trimPlayerLabel(match?.[1]);
}

function extractAssistPlayer(
  text: string
): { label: string; text: string } | null {
  const match =
    /\b(ASSIST(?:ED)?\s+([A-Z0-9_. -]{1,40}))(?=\s+ELIMINATED(?:\s+BY)?\b|\s+REVIV(?:E|ED|ING)\b|\s+\+?\$?\d|[.,!?:;"'“”‘’]*\s*$)/i.exec(
      text
    );
  const label = trimPlayerLabel(match?.[2]);
  const assistText = normalizeOptionalLabel(match?.[1]);
  return label && assistText ? { label, text: assistText } : null;
}

function extractRevivePlayer(text: string): string | null {
  const match =
    /\bREVIV(?:E|ED|ING)\s+([A-Z0-9_. -]{1,40})(?=\s+\+?\$?\d|[.,!?:;"'“”‘’]*\s*$)/i.exec(
      text
    );
  return trimPlayerLabel(match?.[1]);
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
  eventType: Extract<VodAnalysisEventType, "cashout" | "steal_flip" | "plug">,
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
  const actorLabel = normalizeOptionalLabel(context.actorLabel);

  return withValidation(
    {
      eventType,
      timestampSeconds,
      actorLabel,
      targetLabel,
      teamLabel,
      confidence: eventType === "cashout" ? 86 : eventType === "plug" ? 83 : 84,
    },
    matchedText,
    reason
  );
}

function buildVaultDetection(
  timestampSeconds: number,
  matchedText: string,
  context: CenterEventTextParseContext,
  reason: string
): DetectedAutomationEventInput[] {
  const teamLabel =
    normalizeOptionalLabel(context.teamLabel) ??
    extractExplicitTeamLabel(matchedText);
  const actorLabel = normalizeOptionalLabel(context.actorLabel);
  const targetLabel =
    normalizeOptionalLabel(context.targetLabel) ??
    extractVaultLabel(matchedText);

  return withValidation(
    {
      eventType: "tap",
      timestampSeconds,
      actorLabel,
      targetLabel,
      teamLabel,
      confidence: 83,
    },
    matchedText,
    reason
  );
}

function buildDeathDetection(
  timestampSeconds: number,
  matchedText: string,
  context: CenterEventTextParseContext
): DetectedAutomationEventInput[] {
  const byPlayer = extractEliminatedByPlayer(matchedText);
  const eliminatedPlayer = extractEliminatedPlayer(matchedText);
  const assist = extractAssistPlayer(matchedText);
  const actorLabel = byPlayer ?? normalizeOptionalLabel(context.actorLabel);
  const targetLabel = byPlayer
    ? normalizeOptionalLabel(context.targetLabel)
    : (eliminatedPlayer ?? normalizeOptionalLabel(context.targetLabel));

  return withValidation(
    {
      eventType: "death",
      timestampSeconds,
      actorLabel,
      targetLabel,
      confidence: 82,
      ...(assist
        ? { metadata: { assistLabel: assist.label, assistText: assist.text } }
        : {}),
    },
    matchedText,
    byPlayer ? "eliminated_by_text" : "eliminated_text"
  );
}

function buildReviveDetection(
  timestampSeconds: number,
  matchedText: string,
  context: CenterEventTextParseContext
): DetectedAutomationEventInput[] {
  const teamLabel =
    normalizeOptionalLabel(context.teamLabel) ??
    extractExplicitTeamLabel(matchedText);
  const actorLabel = normalizeOptionalLabel(context.actorLabel);
  const targetLabel =
    extractRevivePlayer(matchedText) ??
    normalizeOptionalLabel(context.targetLabel);

  return withValidation(
    {
      eventType: "revive",
      timestampSeconds,
      actorLabel,
      targetLabel,
      teamLabel,
      confidence: 82,
    },
    matchedText,
    "revive_text"
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

  if (/\bCASHOUT\s+STARTED\s+BONUS\b/.test(normalizedText)) {
    return buildObjectiveDetection(
      "plug",
      timestampSeconds,
      matchedText,
      context,
      "cashout_started_bonus_text"
    );
  }

  if (/\bCASHOUT\s+STARTED\b/.test(normalizedText)) {
    return buildObjectiveDetection(
      "plug",
      timestampSeconds,
      matchedText,
      context,
      "cashout_started_text"
    );
  }

  if (/\bVAULT\s+OPENED\s+BONUS\b/.test(normalizedText)) {
    return buildVaultDetection(
      timestampSeconds,
      matchedText,
      context,
      "vault_opened_bonus_text"
    );
  }

  if (/\bVAULT\s+OPENED\b/.test(normalizedText)) {
    return buildVaultDetection(
      timestampSeconds,
      matchedText,
      context,
      "vault_opened_text"
    );
  }

  if (/\bELIMINATED(?:\s+BY)?\s+[A-Z0-9_. -]+/.test(normalizedText)) {
    return buildDeathDetection(timestampSeconds, matchedText, context);
  }

  if (/\bREVIV(?:E|ED|ING)\s+[A-Z0-9_. -]+/.test(normalizedText)) {
    return buildReviveDetection(timestampSeconds, matchedText, context);
  }

  return [];
}

function getMatchedCenterEventPattern(text: string | null): string | undefined {
  if (!text) return undefined;

  const normalizedText = normalizeDetectedText(text);

  if (/\bTEAM\s+WIP(?:ED|E)\b/.test(normalizedText)) {
    return "team_wipe_text";
  }

  if (/\bCASHOUT\s+COMPLETE\b/.test(normalizedText)) {
    return "cashout_complete_text";
  }

  if (
    /\bCASHOUT\s+STOLEN\b/.test(normalizedText) ||
    /\bSTOLEN\b/.test(normalizedText)
  ) {
    return "cashout_stolen_text";
  }

  if (/\bCASHOUT\s+STARTED\s+BONUS\b/.test(normalizedText)) {
    return "cashout_started_bonus_text";
  }

  if (/\bCASHOUT\s+STARTED\b/.test(normalizedText)) {
    return "cashout_started_text";
  }

  if (/\bVAULT\s+OPENED\s+BONUS\b/.test(normalizedText)) {
    return "vault_opened_bonus_text";
  }

  if (/\bVAULT\s+OPENED\b/.test(normalizedText)) {
    return "vault_opened_text";
  }

  if (/\bELIMINATED\s+BY\s+[A-Z0-9_. -]+/.test(normalizedText)) {
    return "eliminated_by_text";
  }

  if (/\bELIMINATED\s+[A-Z0-9_. -]+/.test(normalizedText)) {
    return "eliminated_text";
  }

  if (/\bREVIV(?:E|ED|ING)\s+[A-Z0-9_. -]+/.test(normalizedText)) {
    return "revive_text";
  }

  if (/\bASSIST(?:ED)?\s+[A-Z0-9_. -]+/.test(normalizedText)) {
    return "assist_text";
  }

  return undefined;
}

function buildDetectionEvidence(input: {
  sampleIndex: number;
  timestampSeconds: number;
  ocrAttempted: boolean;
  ocrResult: CenterEventTextOcrResult | null;
  debugText: string | null;
  matchedPattern?: string;
  detections: DetectedAutomationEventInput[];
  ocrConfidenceThreshold: number;
  ocrFailed: boolean;
  ocrEnabled: boolean;
}): CenterEventTextDetectionResult["evidence"] {
  const confidence = input.ocrResult?.confidence;
  const normalizedText = input.debugText?.trim() || undefined;
  let detectionOutcome: VodAutomationDetectionOutcome = "no_text";
  let safeMessage: string | undefined;

  if (input.ocrFailed) {
    detectionOutcome = "ocr_failed";
    safeMessage = "OCR failed for this center-event text crop.";
  } else if (!input.ocrEnabled && !normalizedText) {
    detectionOutcome = "no_text";
    safeMessage = "OCR was disabled, so no center-event text was read.";
  } else if (!normalizedText) {
    detectionOutcome = "no_text";
    safeMessage = "No readable center-event text was returned.";
  } else if (
    input.ocrResult &&
    (confidence ?? 0) < input.ocrConfidenceThreshold
  ) {
    detectionOutcome = "low_confidence";
    safeMessage = `OCR confidence ${confidence ?? 0} was below threshold ${input.ocrConfidenceThreshold}.`;
  } else if (!input.matchedPattern) {
    detectionOutcome = "no_pattern_match";
    safeMessage =
      "Readable text did not match supported center-event patterns.";
  } else if (input.matchedPattern === "assist_text") {
    detectionOutcome = "evidence_only_assist_text";
    safeMessage =
      "Matched assist text is evidence only unless paired with a death suggestion.";
  } else if (input.detections.length === 0) {
    detectionOutcome = "matched_missing_required_fields";
    safeMessage =
      "Matched text was missing labels required to create a suggestion.";
  } else {
    detectionOutcome = "suggestion_created";
    safeMessage = "Matched center-event text produced a suggestion candidate.";
  }

  return {
    sampleIndex: input.sampleIndex,
    timestampSeconds: input.timestampSeconds,
    ocrAttempted: input.ocrAttempted,
    ...(confidence !== undefined ? { ocrConfidence: confidence } : {}),
    ...(normalizedText ? { ocrNormalizedText: normalizedText } : {}),
    ...(input.matchedPattern ? { matchedPattern: input.matchedPattern } : {}),
    detectionOutcome,
    ...(safeMessage ? { safeMessage } : {}),
  };
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
  const explicitText = (await options.getText?.(input)) ?? null;
  const ocrEnabled = options.ocrEnabled ?? isVodAutomationOcrEnabled();
  const ocrConfidenceThreshold =
    options.ocrConfidenceThreshold ?? getVodAutomationOcrConfidenceThreshold();
  const capturedFrameCapture =
    input.frameCapture.status === "captured" ? input.frameCapture : null;
  const shouldRunOcr =
    !explicitText && ocrEnabled && Boolean(capturedFrameCapture);
  let ocrResult: CenterEventTextOcrResult | null = null;
  let ocrFailed = false;

  if (shouldRunOcr) {
    try {
      const mockedOcrResult = await options.getOcrResult?.(input);
      ocrResult =
        mockedOcrResult ??
        (mockedOcrResult === undefined
          ? await recognizeCenterEventTextFromFrame({
              framePath: capturedFrameCapture!.framePath,
              zone: input.zone,
              timestampSeconds: input.timestampSeconds,
              sampleIndex: input.sampleIndex,
              frameCapture: capturedFrameCapture!,
            })
          : null);
    } catch (error) {
      console.warn(
        `[vod-capture] OCR failed for sample ${input.sampleIndex + 1} at ${input.timestampSeconds}s`,
        error
      );
      ocrResult = null;
      ocrFailed = true;
    }
  }
  const debugText = explicitText ?? ocrResult?.normalizedText ?? null;
  const matchedPattern = getMatchedCenterEventPattern(debugText);

  if (ocrResult) {
    const confidence = ocrResult.confidence ?? 0;
    if (!ocrResult.normalizedText || confidence < ocrConfidenceThreshold) {
      return {
        detections: [],
        debugText,
        ocrResult,
        detectorVersion: CENTER_EVENT_TEXT_DETECTOR_VERSION,
        evidence: buildDetectionEvidence({
          sampleIndex: input.sampleIndex,
          timestampSeconds: input.timestampSeconds,
          ocrAttempted: shouldRunOcr,
          ocrResult,
          debugText,
          matchedPattern,
          detections: [],
          ocrConfidenceThreshold,
          ocrFailed,
          ocrEnabled,
        }),
      };
    }
  }
  const parseContext =
    typeof options.parseContext === "function"
      ? options.parseContext(input)
      : (options.parseContext ?? {});
  const detections = parseCenterEventTextToDetections(
    debugText,
    input.timestampSeconds,
    parseContext
  ).map(detection =>
    ocrResult
      ? {
          ...detection,
          metadata: {
            ...(typeof detection.metadata === "object" &&
            detection.metadata !== null &&
            !Array.isArray(detection.metadata)
              ? detection.metadata
              : {}),
            ocr: {
              enabled: true,
              confidence: ocrResult.confidence,
              rawText: ocrResult.rawText,
              normalizedText: ocrResult.normalizedText,
              engine: ocrResult.engine,
              engineVersion: ocrResult.engineVersion,
              language: ocrResult.language,
              crop: ocrResult.crop,
            },
          },
        }
      : detection
  );

  return {
    detections,
    debugText,
    ocrResult,
    detectorVersion: CENTER_EVENT_TEXT_DETECTOR_VERSION,
    evidence: buildDetectionEvidence({
      sampleIndex: input.sampleIndex,
      timestampSeconds: input.timestampSeconds,
      ocrAttempted: shouldRunOcr,
      ocrResult,
      debugText,
      matchedPattern,
      detections,
      ocrConfidenceThreshold,
      ocrFailed,
      ocrEnabled,
    }),
  };
}

function buildDedupeKey(detection: DetectedAutomationEventInput): string {
  return [
    detection.eventType,
    detection.targetLabel?.trim().toUpperCase() ?? "",
    detection.teamLabel?.trim().toUpperCase() ?? "",
    detection.actorLabel?.trim().toUpperCase() ?? "",
  ].join("|");
}

export function createCenterEventTextSampleDetector(
  options: CenterEventTextDetectorOptions = {}
): VodCaptureSampleDetector {
  const recentDetections = new Map<string, number>();
  const dedupeCooldownSeconds = options.dedupeCooldownSeconds ?? 4;

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

    input.reportAutomationEvidence?.({
      ...result.evidence,
      frameCaptureStatus: frameCapture.status,
      ...(frameCapture.status === "captured"
        ? { frameFileName: frameCapture.fileName }
        : {}),
    });

    const dedupedDetections = result.detections.filter(detection => {
      const dedupeKey = buildDedupeKey(detection);
      const previousTimestampSeconds = recentDetections.get(dedupeKey);

      if (
        previousTimestampSeconds !== undefined &&
        Math.abs(input.sampleTimestampSeconds - previousTimestampSeconds) <=
          dedupeCooldownSeconds
      ) {
        return false;
      }

      recentDetections.set(dedupeKey, input.sampleTimestampSeconds);
      return true;
    });

    return dedupedDetections.map(detection => ({
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
