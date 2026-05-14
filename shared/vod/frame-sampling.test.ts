import { describe, expect, it } from "vitest";
import {
  buildFrameSamplingPlan,
  formatCaptureReadinessLabel,
  formatVodCaptureJobStatus,
  getVodCaptureJobProgress,
  getVodCaptureJobStatusTone,
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
    expect(readiness.samplePlan.baseIntervalSeconds).toBe(5);
    expect(readiness.samplePlan.intervalSeconds).toBe(5);
    expect(readiness.samplePlan.burstOffsetsSeconds).toEqual([1, 2, 3]);
    expect(readiness.samplePlan.timestamps.slice(0, 5)).toEqual([
      0, 1, 2, 3, 5,
    ]);
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
  it("builds the default burst sampling plan", () => {
    expect(buildFrameSamplingPlan(15)).toEqual({
      durationSeconds: 15,
      baseIntervalSeconds: 5,
      intervalSeconds: 5,
      burstOffsetsSeconds: [1, 2, 3],
      maxSamples: 2_500,
      timestamps: [0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 15],
    });
  });

  it("plans a 12m30s VOD with base 5-second samples plus burst offsets", () => {
    const plan = buildFrameSamplingPlan(750);
    const baseTimestampCount = Math.floor(750 / 5) + 1;
    const baseTimestampsWithFullBursts = baseTimestampCount - 1;
    const expectedSampleCount = baseTimestampsWithFullBursts * 4 + 1;

    expect(plan.baseIntervalSeconds).toBe(5);
    expect(plan.intervalSeconds).toBe(5);
    expect(plan.burstOffsetsSeconds).toEqual([1, 2, 3]);
    expect(plan.timestamps).toHaveLength(expectedSampleCount);
    expect(expectedSampleCount).toBe(601);
    expect(plan.timestamps.slice(0, 9)).toEqual([0, 1, 2, 3, 5, 6, 7, 8, 10]);
    expect(plan.timestamps.at(-1)).toBe(750);
  });

  it("caps planned timestamps at the default maximum sample count", () => {
    const plan = buildFrameSamplingPlan(20_000);

    expect(plan.timestamps).toHaveLength(2_500);
    expect(plan.timestamps.at(-1)).toBe(3_123);
  });

  it("honors an explicit maximum sample count", () => {
    const plan = buildFrameSamplingPlan(10_000, 30, 3);

    expect(plan.timestamps).toEqual([0, 1, 2]);
    expect(plan.timestamps).toHaveLength(3);
  });

  it("normalizes the interval to a minimum of one second", () => {
    expect(buildFrameSamplingPlan(3, 0, 10).timestamps).toEqual([0, 1, 2, 3]);
  });

  it("keeps burst sampling timestamps sorted and unique", () => {
    const plan = buildFrameSamplingPlan(8, 2, 100, [3, 1, 1, 2]);
    const sortedTimestamps = [...plan.timestamps].sort(
      (left, right) => left - right
    );

    expect(plan.burstOffsetsSeconds).toEqual([1, 2, 3]);
    expect(plan.timestamps).toEqual(sortedTimestamps);
    expect(new Set(plan.timestamps).size).toBe(plan.timestamps.length);
    expect(plan.timestamps).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("does not include burst timestamps beyond the VOD duration", () => {
    const plan = buildFrameSamplingPlan(12);

    expect(plan.timestamps).toEqual([0, 1, 2, 3, 5, 6, 7, 8, 10, 11, 12]);
    expect(plan.timestamps.every(timestamp => timestamp <= 12)).toBe(true);
  });

  it("allows burst sampling to be disabled for compatibility", () => {
    expect(buildFrameSamplingPlan(15, 5, 100, []).timestamps).toEqual([
      0, 5, 10, 15,
    ]);
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

describe("getVodCaptureJobProgress", () => {
  it("calculates percent complete for the normal case", () => {
    expect(
      getVodCaptureJobProgress({
        plannedSamples: 10,
        processedSamples: 4,
        failedSamples: 1,
      })
    ).toMatchObject({
      completedSamples: 5,
      percentComplete: 50,
      remainingSamples: 5,
    });
  });

  it("returns 0 percent when plannedSamples is 0", () => {
    expect(
      getVodCaptureJobProgress({
        plannedSamples: 0,
        processedSamples: 4,
        failedSamples: 1,
      }).percentComplete
    ).toBe(0);
  });

  it("includes failed samples in completed samples", () => {
    expect(
      getVodCaptureJobProgress({
        plannedSamples: 8,
        processedSamples: 2,
        failedSamples: 3,
      }).completedSamples
    ).toBe(5);
  });

  it("caps percent complete at 100", () => {
    expect(
      getVodCaptureJobProgress({
        plannedSamples: 5,
        processedSamples: 8,
        failedSamples: 2,
      }).percentComplete
    ).toBe(100);
  });

  it("never returns negative remaining samples", () => {
    expect(
      getVodCaptureJobProgress({
        plannedSamples: 5,
        processedSamples: 6,
        failedSamples: 2,
      }).remainingSamples
    ).toBe(0);
  });
});

describe("VOD capture job status helpers", () => {
  it("formats capture job statuses", () => {
    expect(formatVodCaptureJobStatus("queued")).toBe("Queued");
    expect(formatVodCaptureJobStatus("processing")).toBe("Processing");
    expect(formatVodCaptureJobStatus("complete")).toBe("Complete");
    expect(formatVodCaptureJobStatus("failed")).toBe("Failed");
    expect(formatVodCaptureJobStatus("cancelled")).toBe("Cancelled");
  });

  it("maps capture job statuses to UI tones", () => {
    expect(getVodCaptureJobStatusTone("queued")).toBe("neutral");
    expect(getVodCaptureJobStatusTone("processing")).toBe("active");
    expect(getVodCaptureJobStatusTone("complete")).toBe("success");
    expect(getVodCaptureJobStatusTone("failed")).toBe("danger");
    expect(getVodCaptureJobStatusTone("cancelled")).toBe("muted");
  });
});
