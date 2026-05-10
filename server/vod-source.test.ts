import { describe, expect, it } from "vitest";
import {
  buildVodEmbedConfig,
  buildVodTimestampUrl,
  formatVodSourceType,
  getVodSourceLabel,
  parseVodSource,
} from "@shared/vod/source";

describe("VOD source parsing", () => {
  it("parses and normalizes Twitch VOD URLs", () => {
    expect(parseVodSource("https://www.twitch.tv/videos/1234567890")).toEqual({
      valid: true,
      sourceType: "twitch",
      sourceId: "1234567890",
      sourceRef: "v1234567890",
      normalizedUrl: "https://www.twitch.tv/videos/1234567890",
    });
  });

  it("parses Twitch highlight URLs through the Twitch video path", () => {
    expect(parseVodSource("https://www.twitch.tv/videos/2768289408")).toEqual({
      valid: true,
      sourceType: "twitch",
      sourceId: "2768289408",
      sourceRef: "v2768289408",
      normalizedUrl: "https://www.twitch.tv/videos/2768289408",
    });
  });

  it("parses Twitch mobile VOD URLs", () => {
    expect(
      parseVodSource("https://m.twitch.tv/videos/1234567890")
    ).toMatchObject({
      valid: true,
      sourceType: "twitch",
      sourceId: "1234567890",
      normalizedUrl: "https://www.twitch.tv/videos/1234567890",
    });
  });

  it("normalizes Twitch VOD URLs by removing query params", () => {
    expect(
      parseVodSource("https://twitch.tv/videos/1234567890?t=1h23m45s")
    ).toMatchObject({
      valid: true,
      sourceType: "twitch",
      sourceId: "1234567890",
      normalizedUrl: "https://www.twitch.tv/videos/1234567890",
    });
  });

  it("does not treat Twitch live channel URLs as Twitch VODs", () => {
    expect(parseVodSource("https://www.twitch.tv/pmurph")).toMatchObject({
      valid: true,
      sourceType: "generic",
      normalizedUrl: "https://www.twitch.tv/pmurph",
    });
  });

  it("parses and normalizes YouTube watch URLs", () => {
    expect(parseVodSource("https://www.youtube.com/watch?v=VIDEO_ID")).toEqual({
      valid: true,
      sourceType: "youtube",
      sourceId: "VIDEO_ID",
      sourceRef: "VIDEO_ID",
      normalizedUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
    });
  });

  it("parses and normalizes YouTube short URLs", () => {
    expect(parseVodSource("https://youtu.be/VIDEO_ID?t=10")).toEqual({
      valid: true,
      sourceType: "youtube",
      sourceId: "VIDEO_ID",
      sourceRef: "VIDEO_ID",
      normalizedUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
    });
  });

  it("parses and normalizes Google Drive file URLs", () => {
    expect(
      parseVodSource("https://drive.google.com/file/d/FILE_ID/view?usp=sharing")
    ).toEqual({
      valid: true,
      sourceType: "google_drive",
      sourceId: "FILE_ID",
      sourceRef: "FILE_ID",
      normalizedUrl: "https://drive.google.com/file/d/FILE_ID/view",
    });
  });

  it("returns generic for valid URLs from unknown providers", () => {
    expect(
      parseVodSource("https://example.com/video/123?quality=source")
    ).toEqual({
      valid: true,
      sourceType: "generic",
      normalizedUrl: "https://example.com/video/123?quality=source",
    });
  });

  it("fails safely for blank input", () => {
    expect(parseVodSource("   ")).toEqual({
      valid: false,
      error: "Enter a valid video URL.",
    });
  });

  it("fails safely for malformed URLs", () => {
    expect(parseVodSource("not a url")).toEqual({
      valid: false,
      error: "Enter a valid video URL.",
    });
  });
});

describe("VOD source labels", () => {
  it("formats user-facing source type labels", () => {
    expect(formatVodSourceType("twitch")).toBe("TWITCH VOD");
    expect(formatVodSourceType("youtube")).toBe("YOUTUBE VIDEO");
    expect(formatVodSourceType("google_drive")).toBe("GOOGLE DRIVE");
    expect(formatVodSourceType("generic")).toBe("VIDEO LINK");
  });

  it("includes available source references in labels", () => {
    expect(
      getVodSourceLabel(
        parseVodSource("https://www.twitch.tv/videos/1234567890")
      )
    ).toBe("TWITCH VOD • v1234567890");
    expect(
      getVodSourceLabel(
        parseVodSource("https://www.youtube.com/watch?v=VIDEO_ID")
      )
    ).toBe("YOUTUBE VIDEO • VIDEO_ID");
    expect(
      getVodSourceLabel(
        parseVodSource("https://drive.google.com/file/d/FILE_ID/view")
      )
    ).toBe("GOOGLE DRIVE • FILE_ID");
    expect(
      getVodSourceLabel(parseVodSource("https://example.com/video/123"))
    ).toBe("VIDEO LINK");
  });
});

describe("VOD embed config", () => {
  it("builds YouTube embed URLs from parsed watch sources", () => {
    const parsedSource = parseVodSource(
      "https://www.youtube.com/watch?v=VIDEO_ID"
    );

    expect(
      buildVodEmbedConfig({
        sourceType: parsedSource.valid ? parsedSource.sourceType : "unknown",
        sourceId: parsedSource.valid ? parsedSource.sourceId : null,
        sourceRef: parsedSource.valid ? parsedSource.sourceRef : null,
        normalizedSourceUrl: parsedSource.valid
          ? parsedSource.normalizedUrl
          : null,
        sourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
      })
    ).toEqual({
      embeddable: true,
      provider: "youtube",
      embedUrl: "https://www.youtube.com/embed/VIDEO_ID",
      label: "YOUTUBE VIDEO • VIDEO_ID",
    });
  });

  it("builds Twitch player URLs with a parent hostname when provided", () => {
    expect(
      buildVodEmbedConfig(
        {
          sourceType: "twitch",
          sourceId: "1234567890",
          sourceRef: "v1234567890",
          normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
          sourceUrl: "https://www.twitch.tv/videos/1234567890",
        },
        { parentHostname: "murphtournaments.com" }
      )
    ).toEqual({
      embeddable: true,
      provider: "twitch",
      embedUrl:
        "https://player.twitch.tv/?video=v1234567890&parent=murphtournaments.com",
      label: "TWITCH VOD • v1234567890",
    });
  });

  it("builds Google Drive preview URLs from file ids", () => {
    expect(
      buildVodEmbedConfig({
        sourceType: "google_drive",
        sourceId: "FILE_ID",
        sourceRef: "FILE_ID",
        normalizedSourceUrl: "https://drive.google.com/file/d/FILE_ID/view",
        sourceUrl: "https://drive.google.com/file/d/FILE_ID/view",
      })
    ).toEqual({
      embeddable: true,
      provider: "google_drive",
      embedUrl: "https://drive.google.com/file/d/FILE_ID/preview",
      label: "GOOGLE DRIVE • FILE_ID",
    });
  });

  it("marks generic URLs as not embeddable", () => {
    const config = buildVodEmbedConfig({
      sourceType: "generic",
      normalizedSourceUrl: "https://example.com/video/123",
      sourceUrl: "https://example.com/video/123",
    });

    expect(config.embeddable).toBe(false);
    expect(config.provider).toBe("generic");
    expect(config.reason).toContain("generic link");
  });

  it("marks known providers without source ids as not embeddable", () => {
    const config = buildVodEmbedConfig({
      sourceType: "youtube",
      sourceId: null,
      normalizedSourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
      sourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
    });

    expect(config.embeddable).toBe(false);
    expect(config.provider).toBe("unknown");
    expect(config.reason).toContain("parsed source id");
  });
});

describe("VOD timestamp URLs", () => {
  it("builds YouTube timestamp URLs", () => {
    expect(
      buildVodTimestampUrl(
        {
          sourceType: "youtube",
          sourceId: "VIDEO_ID",
          sourceRef: "VIDEO_ID",
          normalizedSourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
          sourceUrl: "https://youtu.be/VIDEO_ID",
        },
        75
      )
    ).toBe("https://www.youtube.com/watch?v=VIDEO_ID&t=75s");
  });

  it("builds Twitch timestamp URLs with minute and second offsets", () => {
    expect(
      buildVodTimestampUrl(
        {
          sourceType: "twitch",
          sourceId: "1234567890",
          sourceRef: "v1234567890",
          normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
          sourceUrl: "https://www.twitch.tv/videos/1234567890",
        },
        75
      )
    ).toBe("https://www.twitch.tv/videos/1234567890?t=1m15s");
  });

  it("builds Twitch timestamp URLs with hour offsets", () => {
    expect(
      buildVodTimestampUrl(
        {
          sourceType: "twitch",
          sourceId: "1234567890",
          sourceRef: "v1234567890",
          normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
          sourceUrl: "https://www.twitch.tv/videos/1234567890",
        },
        3723
      )
    ).toBe("https://www.twitch.tv/videos/1234567890?t=1h02m03s");
  });

  it("does not build Google Drive timestamp URLs", () => {
    expect(
      buildVodTimestampUrl(
        {
          sourceType: "google_drive",
          sourceId: "FILE_ID",
          sourceRef: "FILE_ID",
          normalizedSourceUrl: "https://drive.google.com/file/d/FILE_ID/view",
          sourceUrl: "https://drive.google.com/file/d/FILE_ID/view",
        },
        75
      )
    ).toBeNull();
  });

  it("does not build generic timestamp URLs", () => {
    expect(
      buildVodTimestampUrl(
        {
          sourceType: "generic",
          normalizedSourceUrl: "https://example.com/video/123",
          sourceUrl: "https://example.com/video/123",
        },
        75
      )
    ).toBeNull();
  });

  it("does not build timestamp URLs when provider source ids are missing", () => {
    expect(
      buildVodTimestampUrl(
        {
          sourceType: "youtube",
          sourceId: null,
          normalizedSourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
          sourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
        },
        75
      )
    ).toBeNull();
  });

  it("clamps negative timestamps to zero", () => {
    expect(
      buildVodTimestampUrl(
        {
          sourceType: "youtube",
          sourceId: "VIDEO_ID",
          sourceRef: "VIDEO_ID",
          normalizedSourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
          sourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
        },
        -12
      )
    ).toBe("https://www.youtube.com/watch?v=VIDEO_ID&t=0s");
  });
});
