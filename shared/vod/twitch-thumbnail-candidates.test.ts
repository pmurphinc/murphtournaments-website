import { describe, expect, it } from "vitest";
import { buildClientTwitchThumbnailCandidates } from "./twitch-thumbnail-candidates";

describe("buildClientTwitchThumbnailCandidates", () => {
  it("builds fallback candidates for Twitch 640x360 thumbnails", () => {
    expect(
      buildClientTwitchThumbnailCandidates(
        "https://static-cdn.jtvnw.net/s3_vods/example/thumb/thumb0-640x360.jpg"
      )
    ).toEqual([
      "https://static-cdn.jtvnw.net/s3_vods/example/thumb/thumb0-640x360.jpg",
      "https://static-cdn.jtvnw.net/s3_vods/example/thumb/thumb0-320x180.jpg",
      "https://static-cdn.jtvnw.net/s3_vods/example/thumb/thumb0-1280x720.jpg",
    ]);
  });

  it("does not rewrite non-Twitch URLs", () => {
    expect(
      buildClientTwitchThumbnailCandidates(
        "https://example.com/thumb/thumb0-640x360.jpg"
      )
    ).toEqual(["https://example.com/thumb/thumb0-640x360.jpg"]);
  });

  it("does not rewrite Twitch URLs without the normalized size", () => {
    expect(
      buildClientTwitchThumbnailCandidates(
        "https://static-cdn.jtvnw.net/s3_vods/example/thumb/thumb0.jpg"
      )
    ).toEqual([
      "https://static-cdn.jtvnw.net/s3_vods/example/thumb/thumb0.jpg",
    ]);
  });
});
