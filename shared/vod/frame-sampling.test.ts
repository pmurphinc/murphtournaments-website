import { describe, expect, it } from "vitest";
import {
  buildFrameSamplingPlan,
  formatCaptureReadinessLabel,
  getVodCaptureReadiness,
} from "./frame-sampling";

describe("getVodCaptureReadiness", () => {
  it("marks a Twitch VOD with URL and duration as ready", () => {
    const readiness = getVodCaptureReadiness({
      sourceType: "twitch",
      sourceUrl: "https://www.twitch.tv/videos/1234567890?t=1h2m3s",
      normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
      durationSeconds: 90,
    });

    expect(readiness.status).toBe("ready");
    expect(readiness.isReady).toBe(true);
    expect(readiness.samplePlan.timestamps).toEqual([0, 30, 60, 90]);
  });

  it("marks a Twitch VOD without duration as missing duration", () => {
    expect(
      getVodCaptureReadiness({
        sourceType: "twitch",
        sourceUrl: "https://www.twitch.tv/videos/1234567890",
        normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
        durationSeconds: null,
      }).status
    ).toBe("missing_duration");

    expect(
      getVodCaptureReadiness({
        sourceType: "twitch",
        sourceUrl: "https://www.twitch.tv/videos/1234567890",
        normalizedSourceUrl: "https://www.twitch.tv/videos/1234567890",
        durationSeconds: 0,
      }).status
    ).toBe("missing_duration");
  });

  it("marks a Twitch VOD without a usable URL as missing source URL", () => {
    expect(
      getVodCaptureReadiness({
        sourceType: "twitch",
        sourceUrl: "",
        normalizedSourceUrl: "",
        durationSeconds: 90,
      }).status
    ).toBe("missing_source_url");

    expect(
      getVodCaptureReadiness({
        sourceType: "twitch",
        sourceUrl: "not a url",
        normalizedSourceUrl: null,
        durationSeconds: 90,
      }).status
    ).toBe("missing_source_url");
  });

  it("marks YouTube and Google Drive sources as not implemented", () => {
    expect(
      getVodCaptureReadiness({
        sourceType: "youtube",
        sourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
        normalizedSourceUrl: "https://www.youtube.com/watch?v=VIDEO_ID",
        durationSeconds: 90,
      }).status
    ).toBe("not_implemented");

    expect(
      getVodCaptureReadiness({
        sourceType: "google_drive",
        sourceUrl: "https://drive.google.com/file/d/FILE_ID/view",
        normalizedSourceUrl: "https://drive.google.com/file/d/FILE_ID/view",
        durationSeconds: 90,
      }).status
    ).toBe("not_implemented");
  });

  it("marks generic and unknown sources as unsupported", () => {
    expect(
      getVodCaptureReadiness({
        sourceType: "generic",
        sourceUrl: "https://example.com/vod.mp4",
        normalizedSourceUrl: "https://example.com/vod.mp4",
        durationSeconds: 90,
      }).status
    ).toBe("unsupported_source");

    expect(
      getVodCaptureReadiness({
        sourceType: "unknown",
        sourceUrl: "https://example.com/vod.mp4",
        normalizedSourceUrl: "https://example.com/vod.mp4",
        durationSeconds: 90,
      }).status
    ).toBe("unsupported_source");
  });
});

describe("buildFrameSamplingPlan", () => {
  it("builds the default sampling plan", () => {
    expect(buildFrameSamplingPlan(95)).toEqual({
      durationSeconds: 95,
      intervalSeconds: 30,
      maxSamples: 200,
      timestamps: [0, 30, 60, 90],
    });
  });

  it("caps planned timestamps at the default maximum sample count", () => {
    const plan = buildFrameSamplingPlan(10_000);

    expect(plan.timestamps).toHaveLength(200);
    expect(plan.timestamps.at(-1)).toBe(5_970);
  });

  it("honors an explicit maximum sample count", () => {
    const plan = buildFrameSamplingPlan(10_000, 30, 3);

    expect(plan.timestamps).toEqual([0, 30, 60]);
    expect(plan.timestamps).toHaveLength(3);
  });

  it("normalizes the interval to a minimum of one second", () => {
    expect(buildFrameSamplingPlan(3, 0, 10).timestamps).toEqual([0, 1, 2, 3]);
  });
});

describe("formatCaptureReadinessLabel", () => {
  it("formats capture readiness statuses for display", () => {
    expect(formatCaptureReadinessLabel("ready")).toBe("Ready");
    expect(formatCaptureReadinessLabel("missing_source_url")).toBe(
      "Missing source URL"
    );
    expect(formatCaptureReadinessLabel("missing_duration")).toBe(
      "Missing duration"
    );
    expect(formatCaptureReadinessLabel("not_implemented")).toBe(
      "Not implemented"
    );
    expect(formatCaptureReadinessLabel("unsupported_source")).toBe(
      "Unsupported source"
    );
  });
});
