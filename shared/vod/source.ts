export type VodSourceType = "twitch" | "youtube" | "google_drive" | "generic";

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
