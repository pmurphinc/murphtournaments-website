import { ENV } from "./_core/env";

export type TwitchMetadata = {
  title?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
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

  return trimmed.replace(/%\{width\}/g, "640").replace(/%\{height\}/g, "360");
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
    const thumbnailUrl =
      typeof video.thumbnail_url === "string"
        ? normalizeTwitchThumbnailUrl(video.thumbnail_url)
        : undefined;
    const durationSeconds =
      typeof video.duration === "string"
        ? parseTwitchDurationToSeconds(video.duration)
        : null;

    return {
      status: "success",
      metadata: {
        ...(title ? { title } : {}),
        ...(thumbnailUrl ? { thumbnailUrl } : {}),
        ...(durationSeconds && durationSeconds > 0 ? { durationSeconds } : {}),
      },
    };
  } catch {
    return { status: "fetch_failed" };
  }
}
