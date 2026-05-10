import { formatVodSourceType, type VodSourceType } from "./source";

const KNOWN_SOURCE_TYPES = new Set<VodSourceType>([
  "twitch",
  "youtube",
  "google_drive",
  "generic",
]);

export type VodFallbackThumbnailLabelInput = {
  sourceType?: string | null;
  sourceRef?: string | null;
  sourceId?: string | null;
  videoPov?: "player" | "spectator" | string | null;
  durationLabel?: string | null;
  durationSeconds?: number | null;
};

export type VodFallbackThumbnailLabels = {
  sourceLabel: string | null;
  povLabel: string | null;
  durationLabel: string | null;
};

function cleanLabel(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function formatUnknownSourceType(sourceType: string) {
  return sourceType.replace(/[_-]+/g, " ").trim().toUpperCase();
}

function formatDurationSeconds(durationSeconds: number | null | undefined) {
  if (!durationSeconds || durationSeconds <= 0) return null;

  const totalSeconds = Math.floor(durationSeconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function buildVodFallbackThumbnailLabels({
  sourceType,
  sourceRef,
  sourceId,
  videoPov,
  durationLabel,
  durationSeconds,
}: VodFallbackThumbnailLabelInput): VodFallbackThumbnailLabels {
  const normalizedSourceType = cleanLabel(sourceType);
  const sourceTypeLabel = normalizedSourceType
    ? KNOWN_SOURCE_TYPES.has(normalizedSourceType as VodSourceType)
      ? formatVodSourceType(normalizedSourceType as VodSourceType)
      : formatUnknownSourceType(normalizedSourceType)
    : null;
  const sourceReference = cleanLabel(sourceRef) ?? cleanLabel(sourceId);
  const normalizedPov = cleanLabel(videoPov);
  const normalizedDurationLabel =
    cleanLabel(durationLabel) ?? formatDurationSeconds(durationSeconds);

  return {
    sourceLabel: sourceTypeLabel
      ? sourceReference
        ? `${sourceTypeLabel} • ${sourceReference}`
        : sourceTypeLabel
      : sourceReference,
    povLabel:
      normalizedPov === "player"
        ? "Player POV"
        : normalizedPov === "spectator"
          ? "Spectator POV"
          : normalizedPov,
    durationLabel: normalizedDurationLabel,
  };
}
