import type { VodHudZone } from "../../shared/vod/hud-zones";
import type { VodFrameCaptureResult } from "../vodFrameCapture";

export const VOD_AUTOMATION_OCR_ENABLED_ENV = "VOD_AUTOMATION_OCR_ENABLED";
export const VOD_AUTOMATION_OCR_CONFIDENCE_THRESHOLD_ENV =
  "VOD_AUTOMATION_OCR_CONFIDENCE_THRESHOLD";
export const DEFAULT_VOD_AUTOMATION_OCR_CONFIDENCE_THRESHOLD = 70;
export const CENTER_EVENT_TEXT_OCR_ENGINE = "tesseract.js";
export const CENTER_EVENT_TEXT_OCR_LANGUAGE = "eng";

type SharpFactory = typeof import("sharp").default;
type TesseractModule = typeof import("tesseract.js");
type TesseractWorker = Awaited<ReturnType<TesseractModule["createWorker"]>>;

let sharedWorkerPromise: Promise<TesseractWorker> | null = null;

export type CenterEventTextOcrInput = {
  framePath?: string;
  frameBuffer?: Buffer;
  frameWidth?: number | null;
  frameHeight?: number | null;
  zone: VodHudZone;
  timestampSeconds: number;
  sampleIndex: number;
  frameNumber?: number | null;
  frameCapture?: VodFrameCaptureResult;
};

export type CenterEventTextOcrCropMetadata = {
  hudZoneId: string;
  hudZoneLabel: string;
  sourceRect: VodHudZone["rect"];
  pixelRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  sourceWidth: number;
  sourceHeight: number;
  scaleFactor: number;
};

export type CenterEventTextOcrResult = {
  normalizedText: string;
  rawText: string;
  confidence: number | null;
  engine: typeof CENTER_EVENT_TEXT_OCR_ENGINE;
  engineVersion: string;
  language: typeof CENTER_EVENT_TEXT_OCR_LANGUAGE;
  crop: CenterEventTextOcrCropMetadata;
  timestampSeconds: number;
  sampleIndex: number;
  frameNumber?: number | null;
};

function parseBooleanEnv(value: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test(value?.trim() ?? "");
}

export function isVodAutomationOcrEnabled(): boolean {
  return parseBooleanEnv(process.env[VOD_AUTOMATION_OCR_ENABLED_ENV]);
}

export function getVodAutomationOcrConfidenceThreshold(): number {
  const rawValue = process.env[VOD_AUTOMATION_OCR_CONFIDENCE_THRESHOLD_ENV];
  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    return DEFAULT_VOD_AUTOMATION_OCR_CONFIDENCE_THRESHOLD;
  }

  return Math.max(0, Math.min(100, Math.round(parsedValue)));
}

export function normalizeCenterEventOcrText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim()
    .toUpperCase();
}

function clampCropRect(
  zone: VodHudZone,
  sourceWidth: number,
  sourceHeight: number
): CenterEventTextOcrCropMetadata["pixelRect"] {
  const left = Math.max(0, Math.floor(zone.rect.x * sourceWidth));
  const top = Math.max(0, Math.floor(zone.rect.y * sourceHeight));
  const right = Math.min(
    sourceWidth,
    Math.ceil((zone.rect.x + zone.rect.width) * sourceWidth)
  );
  const bottom = Math.min(
    sourceHeight,
    Math.ceil((zone.rect.y + zone.rect.height) * sourceHeight)
  );

  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function getScaleFactor(cropWidth: number): number {
  if (cropWidth < 600) return 2;
  return 1;
}

async function getSharedTesseractWorker(): Promise<TesseractWorker> {
  sharedWorkerPromise ??= import("tesseract.js").then(tesseract =>
    tesseract.createWorker(CENTER_EVENT_TEXT_OCR_LANGUAGE)
  );

  return sharedWorkerPromise;
}

export async function recognizeCenterEventTextFromFrame(
  input: CenterEventTextOcrInput
): Promise<CenterEventTextOcrResult | null> {
  if (!input.framePath && !input.frameBuffer) {
    return null;
  }

  const sharp: SharpFactory = (await import("sharp")).default;
  const sourceImage = input.frameBuffer
    ? sharp(input.frameBuffer)
    : sharp(input.framePath);
  const sourceMetadata = await sourceImage.metadata();
  const sourceWidth = input.frameWidth ?? sourceMetadata.width;
  const sourceHeight = input.frameHeight ?? sourceMetadata.height;

  if (!sourceWidth || !sourceHeight) {
    return null;
  }

  const pixelRect = clampCropRect(input.zone, sourceWidth, sourceHeight);
  const scaleFactor = getScaleFactor(pixelRect.width);
  let croppedImage = sourceImage.extract(pixelRect).grayscale();

  if (scaleFactor > 1) {
    croppedImage = croppedImage.resize({
      width: pixelRect.width * scaleFactor,
      height: pixelRect.height * scaleFactor,
      fit: "fill",
    });
  }

  const cropBuffer = await croppedImage.png().toBuffer();
  const worker = await getSharedTesseractWorker();
  const ocrResult = await worker.recognize(cropBuffer);
  const rawText = ocrResult.data.text ?? "";
  const rawConfidence = ocrResult.data.confidence;
  const confidence =
    typeof rawConfidence === "number" && Number.isFinite(rawConfidence)
      ? Math.round(rawConfidence)
      : null;

  return {
    normalizedText: normalizeCenterEventOcrText(rawText),
    rawText,
    confidence,
    engine: CENTER_EVENT_TEXT_OCR_ENGINE,
    engineVersion: "unknown",
    language: CENTER_EVENT_TEXT_OCR_LANGUAGE,
    crop: {
      hudZoneId: input.zone.id,
      hudZoneLabel: input.zone.label,
      sourceRect: input.zone.rect,
      pixelRect,
      sourceWidth,
      sourceHeight,
      scaleFactor,
    },
    timestampSeconds: input.timestampSeconds,
    sampleIndex: input.sampleIndex,
    ...(input.frameNumber !== undefined
      ? { frameNumber: input.frameNumber }
      : {}),
  };
}
