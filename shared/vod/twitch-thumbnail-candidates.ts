const TWITCH_THUMBNAIL_HOST = "static-cdn.jtvnw.net";
const TWITCH_THUMBNAIL_SIZE_PATTERN = /(?<!\d)640x360(?!\d)/;

export function buildClientTwitchThumbnailCandidates(
  thumbnailUrl: string | null | undefined
): string[] {
  const trimmed = thumbnailUrl?.trim();
  if (!trimmed) return [];

  try {
    const parsedUrl = new URL(trimmed);

    if (parsedUrl.hostname !== TWITCH_THUMBNAIL_HOST) {
      return [trimmed];
    }
  } catch {
    return [trimmed];
  }

  if (!TWITCH_THUMBNAIL_SIZE_PATTERN.test(trimmed)) {
    return [trimmed];
  }

  return Array.from(
    new Set([
      trimmed,
      trimmed.replace(TWITCH_THUMBNAIL_SIZE_PATTERN, "320x180"),
      trimmed.replace(TWITCH_THUMBNAIL_SIZE_PATTERN, "1280x720"),
    ])
  );
}
