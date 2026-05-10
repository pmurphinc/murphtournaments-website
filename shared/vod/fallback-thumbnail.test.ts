import { describe, expect, it } from "vitest";
import { buildVodFallbackThumbnailLabels } from "./fallback-thumbnail";

describe("buildVodFallbackThumbnailLabels", () => {
  it("builds branded metadata labels for Twitch VOD fallbacks", () => {
    expect(
      buildVodFallbackThumbnailLabels({
        sourceType: "twitch",
        sourceRef: "v2768289408",
        videoPov: "player",
        durationSeconds: 3723,
      })
    ).toEqual({
      sourceLabel: "TWITCH VOD • v2768289408",
      povLabel: "Player POV",
      durationLabel: "1h 2m 3s",
    });
  });

  it("prefers explicit duration labels and trims missing metadata", () => {
    expect(
      buildVodFallbackThumbnailLabels({
        sourceType: "google_drive",
        sourceRef: "  ",
        videoPov: "spectator",
        durationLabel: "45m 10s",
      })
    ).toEqual({
      sourceLabel: "GOOGLE DRIVE",
      povLabel: "Spectator POV",
      durationLabel: "45m 10s",
    });
  });
});
