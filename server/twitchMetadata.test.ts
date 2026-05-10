import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchTwitchVodMetadata,
  normalizeTwitchThumbnailUrl,
  parseTwitchDurationToSeconds,
} from "./twitchMetadata";
import { ENV } from "./_core/env";

const originalClientId = ENV.twitchClientId;
const originalClientSecret = ENV.twitchClientSecret;

afterEach(() => {
  vi.unstubAllGlobals();

  ENV.twitchClientId = originalClientId;
  ENV.twitchClientSecret = originalClientSecret;
});

describe("parseTwitchDurationToSeconds", () => {
  it.each([
    ["1h2m3s", 3723],
    ["45m10s", 2710],
    ["30s", 30],
    ["2h", 7200],
    ["3m", 180],
  ])("parses %s", (duration, expectedSeconds) => {
    expect(parseTwitchDurationToSeconds(duration)).toBe(expectedSeconds);
  });

  it("returns null for empty or malformed durations", () => {
    expect(parseTwitchDurationToSeconds("")).toBeNull();
    expect(parseTwitchDurationToSeconds("abc")).toBeNull();
    expect(parseTwitchDurationToSeconds("0s")).toBeNull();
  });
});

describe("normalizeTwitchThumbnailUrl", () => {
  it("replaces Twitch thumbnail dimensions with a web preview size", () => {
    expect(
      normalizeTwitchThumbnailUrl(
        "https://static-cdn.jtvnw.net/cf_vods/%{width}x%{height}/thumb.jpg"
      )
    ).toBe("https://static-cdn.jtvnw.net/cf_vods/640x360/thumb.jpg");
  });

  it("replaces unescaped Twitch thumbnail dimension placeholders", () => {
    expect(
      normalizeTwitchThumbnailUrl(
        "https://static-cdn.jtvnw.net/cf_vods/{width}x{height}/thumb.jpg"
      )
    ).toBe("https://static-cdn.jtvnw.net/cf_vods/640x360/thumb.jpg");
  });

  it("replaces encoded Twitch thumbnail dimension placeholders", () => {
    expect(
      normalizeTwitchThumbnailUrl(
        "https://static-cdn.jtvnw.net/cf_vods/%7Bwidth%7Dx%7Bheight%7D/thumb.jpg"
      )
    ).toBe("https://static-cdn.jtvnw.net/cf_vods/640x360/thumb.jpg");
  });

  it("replaces encoded percent-prefixed Twitch thumbnail dimension placeholders", () => {
    expect(
      normalizeTwitchThumbnailUrl(
        "https://static-cdn.jtvnw.net/cf_vods/%25%7Bwidth%7Dx%25%7Bheight%7D/thumb.jpg"
      )
    ).toBe("https://static-cdn.jtvnw.net/cf_vods/640x360/thumb.jpg");
  });

  it("replaces doubly encoded Twitch thumbnail dimension placeholders", () => {
    expect(
      normalizeTwitchThumbnailUrl(
        "https://static-cdn.jtvnw.net/cf_vods/%257Bwidth%257Dx%257Bheight%257D/thumb.jpg"
      )
    ).toBe("https://static-cdn.jtvnw.net/cf_vods/640x360/thumb.jpg");
  });

  it("normalizes a realistic Twitch highlight thumbnail template", () => {
    expect(
      normalizeTwitchThumbnailUrl(
        "https://static-cdn.jtvnw.net/s3_vods/example_channel_2768289408_123456789/thumb/thumb0-%{width}x%{height}.jpg"
      )
    ).toBe(
      "https://static-cdn.jtvnw.net/s3_vods/example_channel_2768289408_123456789/thumb/thumb0-640x360.jpg"
    );
  });

  it("returns undefined for blank thumbnails", () => {
    expect(normalizeTwitchThumbnailUrl("   ")).toBeUndefined();
  });
});

describe("fetchTwitchVodMetadata", () => {
  it("returns credentials_missing without making a network call when env is absent", async () => {
    ENV.twitchClientId = "";
    ENV.twitchClientSecret = "";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTwitchVodMetadata("1234567890")).resolves.toEqual({
      status: "credentials_missing",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps successful Twitch responses to title, thumbnail, and duration metadata", async () => {
    ENV.twitchClientId = "client-id";
    ENV.twitchClientSecret = "client-secret";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "token" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              title: " Finals scrim ",
              thumbnail_url:
                "https://static-cdn.jtvnw.net/thumb/%{width}x%{height}.jpg",
              duration: "1h2m3s",
              type: "highlight",
              url: "https://www.twitch.tv/videos/1234567890",
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTwitchVodMetadata("1234567890")).resolves.toEqual({
      status: "success",
      metadata: {
        title: "Finals scrim",
        thumbnailUrl: "https://static-cdn.jtvnw.net/thumb/640x360.jpg",
        rawThumbnailUrl:
          "https://static-cdn.jtvnw.net/thumb/%{width}x%{height}.jpg",
        durationSeconds: 3723,
        videoType: "highlight",
        url: "https://www.twitch.tv/videos/1234567890",
      },
    });
  });
});
