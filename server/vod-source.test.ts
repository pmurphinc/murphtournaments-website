import { describe, expect, it } from "vitest";
import {
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
