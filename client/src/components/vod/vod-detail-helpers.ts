import {
  getVodEventTargetKind,
  type VodAnalysisEventType,
} from "@shared/vod/events";

export type SuggestedEventDisplayField = {
  key: "actorLabel" | "targetLabel" | "teamLabel";
  label: string;
  value: string;
};

export const suggestedEventFieldLabels: Record<
  VodAnalysisEventType,
  Partial<Record<"actorLabel" | "targetLabel" | "teamLabel", string>>
> = {
  death: {
    actorLabel: "Eliminating Player",
    targetLabel: "Eliminated Player",
    teamLabel: "Victim Team",
  },
  tap: {
    actorLabel: "Tapping Player",
    targetLabel: "Vault",
    teamLabel: "Tapping Team",
  },
  plug: {
    actorLabel: "Plugging Player",
    targetLabel: "Cashout",
    teamLabel: "Plugging Team",
  },
  cashout: {
    targetLabel: "Cashout",
    teamLabel: "Cashing Team",
  },
  steal_flip: {
    targetLabel: "Cashout",
    teamLabel: "Stealing Team / New Owner",
  },
  team_wipe: {
    actorLabel: "Attacking Team",
    teamLabel: "Wiped Team",
  },
  team_spawn: {
    teamLabel: "Spawning Team",
  },
  revive: {
    actorLabel: "Reviving Player",
    targetLabel: "Revived Player",
    teamLabel: "Team",
  },
  defib: {
    actorLabel: "Defib Player",
    targetLabel: "Revived Player",
    teamLabel: "Team",
  },
};

const metadataPreviewLimit = 120;

function truncateMetadataPreview(value: string) {
  return value.length > metadataPreviewLimit
    ? `${value.slice(0, metadataPreviewLimit - 1)}…`
    : value;
}

function formatUnknownMetadataValue(value: unknown): string {
  if (value === null) return "null";
  if (["string", "number", "boolean"].includes(typeof value)) {
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.length} items]`;
  }
  if (typeof value === "object") {
    return "{…}";
  }

  return String(value);
}

export function formatSuggestedEventMetadataPreview(metadata: string | null) {
  if (!metadata) return null;

  try {
    const parsed: unknown = JSON.parse(metadata);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const entries = Object.entries(parsed as Record<string, unknown>);
      if (entries.length === 0) return "{}";

      const preview = entries
        .slice(0, 3)
        .map(([key, value]) => `${key}: ${formatUnknownMetadataValue(value)}`)
        .join(" • ");
      const suffix = entries.length > 3 ? " • …" : "";

      return truncateMetadataPreview(`${preview}${suffix}`);
    }

    return truncateMetadataPreview(formatUnknownMetadataValue(parsed));
  } catch {
    return truncateMetadataPreview(metadata);
  }
}

export function formatVodTargetDisplayLabel(
  eventType: VodAnalysisEventType,
  targetLabel: string
) {
  const targetKind = getVodEventTargetKind(eventType);

  if (targetKind === "cashout") return `Cashout ${targetLabel}`;
  if (targetKind === "vault") return `Vault ${targetLabel}`;

  return targetLabel;
}

export function getSuggestedEventDisplayFields(suggestion: {
  eventType: VodAnalysisEventType;
  actorLabel: string | null;
  targetLabel: string | null;
  teamLabel: string | null;
}): SuggestedEventDisplayField[] {
  const labels = suggestedEventFieldLabels[suggestion.eventType];
  const fields: SuggestedEventDisplayField[] = [];

  if (labels.actorLabel && suggestion.actorLabel) {
    fields.push({
      key: "actorLabel",
      label: labels.actorLabel,
      value: suggestion.actorLabel,
    });
  }

  if (labels.teamLabel && suggestion.teamLabel) {
    fields.push({
      key: "teamLabel",
      label: labels.teamLabel,
      value: suggestion.teamLabel,
    });
  }

  if (labels.targetLabel && suggestion.targetLabel) {
    fields.push({
      key: "targetLabel",
      label: labels.targetLabel,
      value: formatVodTargetDisplayLabel(
        suggestion.eventType,
        suggestion.targetLabel
      ),
    });
  }

  return fields;
}

export const povLabel = (value: "player" | "spectator") =>
  value === "player" ? "Player POV" : "Spectator POV";

export const formatDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatDuration = (durationSeconds: number | null) => {
  if (!durationSeconds || durationSeconds <= 0) return null;

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
};

export const formatAverageSeconds = (value: number | null) => {
  if (value === null) return null;
  return `${Math.round(value)}s`;
};
