import { ENV } from "./_core/env";

export type TwitchVideoType = "archive" | "highlight" | "upload";

export type TwitchMetadata = {
  title?: string;
  thumbnailUrl?: string;
  rawThumbnailUrl?: string;
  durationSeconds?: number;
  videoType?: TwitchVideoType;
  url?: string;
};

export type TwitchMetadataResult =
  | { status: "success"; metadata: TwitchMetadata }
  | { status: "credentials_missing" }
  | { status: "not_found" }
  | { status: "fetch_failed" };

type TwitchTokenResponse = {
  access_token?: unknown;
};

type TwitchVideoResponse = {
  data?: unknown;
};

type TwitchVideo = {
  title?: unknown;
  thumbnail_url?: unknown;
  duration?: unknown;
  type?: unknown;
  url?: unknown;
};

export function parseTwitchDurationToSeconds(duration: string): number | null {
  const trimmed = duration.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!match) return null;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  return totalSeconds > 0 ? totalSeconds : null;
}

export function normalizeTwitchThumbnailUrl(
  thumbnailUrl: string | null | undefined
): string | undefined {
  const trimmed = thumbnailUrl?.trim();
  if (!trimmed) return undefined;

  return replaceTwitchThumbnailTemplateDimensions(trimmed, 640, 360);
}

function hasTwitchThumbnailTemplateDimensions(thumbnailUrl: string) {
  return (
    /%257Bwidth%257D|(?:%25)?%7Bwidth%7D|%\{width\}|\{width\}/i.test(
      thumbnailUrl
    ) &&
    /%257Bheight%257D|(?:%25)?%7Bheight%7D|%\{height\}|\{height\}/i.test(
      thumbnailUrl
    )
  );
}

function replaceTwitchThumbnailTemplateDimensions(
  thumbnailUrl: string,
  width: number,
  height: number
) {
  return thumbnailUrl
    .replace(/%257Bwidth%257D/gi, String(width))
    .replace(/%257Bheight%257D/gi, String(height))
    .replace(/(?:%25)?%7Bwidth%7D/gi, String(width))
    .replace(/(?:%25)?%7Bheight%7D/gi, String(height))
    .replace(/%\{width\}/gi, String(width))
    .replace(/%\{height\}/gi, String(height))
    .replace(/\{width\}/gi, String(width))
    .replace(/\{height\}/gi, String(height));
}

export function buildTwitchThumbnailUrlCandidates(
  thumbnailUrl: string | null | undefined
): string[] {
  const trimmed = thumbnailUrl?.trim();
  if (!trimmed || !hasTwitchThumbnailTemplateDimensions(trimmed)) return [];

  const sizes = [
    [640, 360],
    [320, 180],
    [1280, 720],
  ] as const;

  return Array.from(
    new Set(
      sizes.map(([width, height]) =>
        replaceTwitchThumbnailTemplateDimensions(trimmed, width, height)
      )
    )
  );
}

function normalizeTwitchVideoType(
  videoType: unknown
): TwitchVideoType | undefined {
  if (
    videoType === "archive" ||
    videoType === "highlight" ||
    videoType === "upload"
  ) {
    return videoType;
  }

  return undefined;
}

function hasTwitchCredentials() {
  return Boolean(ENV.twitchClientId && ENV.twitchClientSecret);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function fetchTwitchVodMetadata(
  vodId: string
): Promise<TwitchMetadataResult> {
  const trimmedVodId = vodId.trim();

  if (!trimmedVodId || !/^\d+$/.test(trimmedVodId)) {
    return { status: "not_found" };
  }

  if (!hasTwitchCredentials()) {
    return { status: "credentials_missing" };
  }

  try {
    const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: ENV.twitchClientId,
        client_secret: ENV.twitchClientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!tokenResponse.ok) {
      return { status: "fetch_failed" };
    }

    const tokenJson = (await readJson(tokenResponse)) as TwitchTokenResponse;
    const accessToken = tokenJson?.access_token;

    if (typeof accessToken !== "string" || !accessToken) {
      return { status: "fetch_failed" };
    }

    const videoResponse = await fetch(
      `https://api.twitch.tv/helix/videos?id=${encodeURIComponent(trimmedVodId)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Client-Id": ENV.twitchClientId,
        },
      }
    );

    if (videoResponse.status === 404) {
      return { status: "not_found" };
    }

    if (!videoResponse.ok) {
      return { status: "fetch_failed" };
    }

    const videoJson = (await readJson(videoResponse)) as TwitchVideoResponse;
    const data = Array.isArray(videoJson?.data) ? videoJson.data : [];
    const video = data[0] as TwitchVideo | undefined;

    if (!video) {
      return { status: "not_found" };
    }

    const title = typeof video.title === "string" ? video.title.trim() : "";
    const rawThumbnailUrl =
      typeof video.thumbnail_url === "string" ? video.thumbnail_url.trim() : "";
    const thumbnailUrl = normalizeTwitchThumbnailUrl(rawThumbnailUrl);
    const durationSeconds =
      typeof video.duration === "string"
        ? parseTwitchDurationToSeconds(video.duration)
        : null;
    const videoType = normalizeTwitchVideoType(video.type);
    const url = typeof video.url === "string" ? video.url.trim() : "";

    return {
      status: "success",
      metadata: {
        ...(title ? { title } : {}),
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(rawThumbnailUrl ? { rawThumbnailUrl } : {}),
        ...(durationSeconds && durationSeconds > 0 ? { durationSeconds } : {}),
        ...(videoType ? { videoType } : {}),
        ...(url ? { url } : {}),
      },
    };
  } catch {
    return { status: "fetch_failed" };
  }
}
