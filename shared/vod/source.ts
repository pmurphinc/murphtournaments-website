export type VodSourceType = "twitch" | "youtube" | "google_drive" | "generic";

export type VodEmbeddableProvider = "youtube" | "twitch" | "google_drive";
export type VodEmbedFallbackProvider = "generic" | "unknown";

export type VodEmbedConfig =
  | {
      embeddable: true;
      provider: VodEmbeddableProvider;
      embedUrl: string;
      label: string;
    }
  | {
      embeddable: false;
      provider: VodEmbedFallbackProvider;
      reason: string;
    };

export type VodEmbedSourceInput = {
  sourceType: VodSourceType | string | null;
  sourceId?: string | null;
  sourceRef?: string | null;
  normalizedSourceUrl?: string | null;
  sourceUrl?: string | null;
};

export type VodEmbedOptions = {
  parentHostname?: string | null;
};

export type ParsedVodSource =
  | {
      valid: true;
      sourceType: VodSourceType;
      normalizedUrl: string;
      sourceId?: string;
      sourceRef?: string;
    }
  | {
      valid: false;
      error: string;
    };

const VOD_SOURCE_TYPE_LABELS: Record<VodSourceType, string> = {
  twitch: "TWITCH VOD",
  youtube: "YOUTUBE VIDEO",
  google_drive: "GOOGLE DRIVE",
  generic: "VIDEO LINK",
};

function parseUrl(input: string): URL | null {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return null;
  }

  try {
    return new URL(trimmedInput);
  } catch {
    return null;
  }
}

function getPathParts(url: URL): string[] {
  return url.pathname.split("/").filter(Boolean);
}

function getTwitchVod(url: URL): ParsedVodSource | null {
  const hostname = url.hostname.toLowerCase();
  const isTwitchHost =
    hostname === "twitch.tv" ||
    hostname === "www.twitch.tv" ||
    hostname === "m.twitch.tv";

  if (!isTwitchHost) {
    return null;
  }

  const [firstPart, videoId] = getPathParts(url);

  if (firstPart !== "videos" || !videoId || !/^\d+$/.test(videoId)) {
    return null;
  }

  return {
    valid: true,
    sourceType: "twitch",
    sourceId: videoId,
    sourceRef: `v${videoId}`,
    normalizedUrl: `https://www.twitch.tv/videos/${videoId}`,
  };
}

function getYouTubeVideo(url: URL): ParsedVodSource | null {
  const hostname = url.hostname.toLowerCase();
  let videoId: string | null = null;

  if (hostname === "youtube.com" || hostname === "www.youtube.com") {
    const [firstPart] = getPathParts(url);

    if (firstPart === "watch") {
      videoId = url.searchParams.get("v");
    }
  }

  if (hostname === "youtu.be") {
    const [firstPart] = getPathParts(url);
    videoId = firstPart ?? null;
  }

  if (!videoId || !/^[A-Za-z0-9_-]+$/.test(videoId)) {
    return null;
  }

  return {
    valid: true,
    sourceType: "youtube",
    sourceId: videoId,
    sourceRef: videoId,
    normalizedUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

function getGoogleDriveFile(url: URL): ParsedVodSource | null {
  const hostname = url.hostname.toLowerCase();

  if (hostname !== "drive.google.com") {
    return null;
  }

  const pathParts = getPathParts(url);
  const fileId =
    pathParts[0] === "file" && pathParts[1] === "d" ? pathParts[2] : null;

  if (!fileId) {
    return null;
  }

  return {
    valid: true,
    sourceType: "google_drive",
    sourceId: fileId,
    sourceRef: fileId,
    normalizedUrl: `https://drive.google.com/file/d/${fileId}/view`,
  };
}

export function parseVodSource(input: string): ParsedVodSource {
  const url = parseUrl(input);

  if (!url) {
    return {
      valid: false,
      error: "Enter a valid video URL.",
    };
  }

  return (
    getTwitchVod(url) ??
    getYouTubeVideo(url) ??
    getGoogleDriveFile(url) ?? {
      valid: true,
      sourceType: "generic",
      normalizedUrl: url.toString(),
    }
  );
}

export function formatVodSourceType(sourceType: VodSourceType): string {
  return VOD_SOURCE_TYPE_LABELS[sourceType];
}

export function getVodSourceLabel(parsedSource: ParsedVodSource): string {
  if (!parsedSource.valid) {
    return formatVodSourceType("generic");
  }

  const sourceReference = parsedSource.sourceRef ?? parsedSource.sourceId;
  const sourceTypeLabel = formatVodSourceType(parsedSource.sourceType);

  return sourceReference
    ? `${sourceTypeLabel} • ${sourceReference}`
    : sourceTypeLabel;
}

function getMissingSourceIdReason(sourceType: VodSourceType): string {
  return `${formatVodSourceType(
    sourceType
  )} embeds require a parsed source id. Re-save or refresh the source link before embedding.`;
}

export function buildVodTimestampUrl(
  input: VodEmbedSourceInput,
  timestampSeconds: number
): string | null {
  if (!Number.isFinite(timestampSeconds)) {
    return null;
  }

  const sourceId = input.sourceId?.trim();
  if (!sourceId) {
    return null;
  }

  const safeTimestampSeconds = Math.max(0, Math.floor(timestampSeconds));

  switch (input.sourceType) {
    case "youtube":
      return `https://www.youtube.com/watch?v=${encodeURIComponent(
        sourceId
      )}&t=${safeTimestampSeconds}s`;

    case "twitch": {
      const hours = Math.floor(safeTimestampSeconds / 3600);
      const minutes = Math.floor((safeTimestampSeconds % 3600) / 60);
      const seconds = safeTimestampSeconds % 60;
      const twitchTimestamp =
        hours > 0
          ? `${hours}h${minutes.toString().padStart(2, "0")}m${seconds
              .toString()
              .padStart(2, "0")}s`
          : `${minutes}m${seconds.toString().padStart(2, "0")}s`;

      return `https://www.twitch.tv/videos/${encodeURIComponent(
        sourceId
      )}?t=${twitchTimestamp}`;
    }

    case "google_drive":
    case "generic":
    default:
      return null;
  }
}

export function buildVodEmbedConfig(
  input: VodEmbedSourceInput,
  options: VodEmbedOptions = {}
): VodEmbedConfig {
  const sourceId = input.sourceId?.trim();

  switch (input.sourceType) {
    case "youtube": {
      if (!sourceId) {
        return {
          embeddable: false,
          provider: "unknown",
          reason: getMissingSourceIdReason("youtube"),
        };
      }

      return {
        embeddable: true,
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(sourceId)}`,
        label: getVodSourceLabel({
          valid: true,
          sourceType: "youtube",
          sourceId,
          sourceRef: input.sourceRef ?? sourceId,
          normalizedUrl:
            input.normalizedSourceUrl ??
            `https://www.youtube.com/watch?v=${sourceId}`,
        }),
      };
    }

    case "twitch": {
      if (!sourceId) {
        return {
          embeddable: false,
          provider: "unknown",
          reason: getMissingSourceIdReason("twitch"),
        };
      }

      const embedUrl = new URL("https://player.twitch.tv/");
      embedUrl.searchParams.set("video", `v${sourceId}`);
      const parentHostname = options.parentHostname?.trim();

      if (parentHostname) {
        embedUrl.searchParams.set("parent", parentHostname);
      }

      return {
        embeddable: true,
        provider: "twitch",
        embedUrl: embedUrl.toString(),
        label: getVodSourceLabel({
          valid: true,
          sourceType: "twitch",
          sourceId,
          sourceRef: input.sourceRef ?? `v${sourceId}`,
          normalizedUrl:
            input.normalizedSourceUrl ??
            `https://www.twitch.tv/videos/${sourceId}`,
        }),
      };
    }

    case "google_drive": {
      if (!sourceId) {
        return {
          embeddable: false,
          provider: "unknown",
          reason: getMissingSourceIdReason("google_drive"),
        };
      }

      return {
        embeddable: true,
        provider: "google_drive",
        embedUrl: `https://drive.google.com/file/d/${encodeURIComponent(
          sourceId
        )}/preview`,
        label: getVodSourceLabel({
          valid: true,
          sourceType: "google_drive",
          sourceId,
          sourceRef: input.sourceRef ?? sourceId,
          normalizedUrl:
            input.normalizedSourceUrl ??
            `https://drive.google.com/file/d/${sourceId}/view`,
        }),
      };
    }

    case "generic":
      return {
        embeddable: false,
        provider: "generic",
        reason:
          "This video source is a generic link and cannot be safely embedded here. Open the source in a new tab to review it.",
      };

    default:
      return {
        embeddable: false,
        provider: "unknown",
        reason:
          "This video source type is not recognized and cannot be safely embedded here.",
      };
  }
}
