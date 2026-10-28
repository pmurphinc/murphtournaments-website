import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  rateLimits,
  __resetRateLimits,
} from "./_core/rateLimit";

beforeEach(() => __resetRateLimits());

describe("consumeRateLimit", () => {
  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++)
      expect(consumeRateLimit("k", 5, 1_000).allowed).toBe(true);
  });

  it("blocks the request after the limit", () => {
    for (let i = 0; i < 5; i++) consumeRateLimit("k", 5, 1_000);
    expect(consumeRateLimit("k", 5, 1_000).allowed).toBe(false);
  });

  it("reports how long to wait", () => {
    for (let i = 0; i < 5; i++) consumeRateLimit("k", 5, 1_000);
    const blocked = consumeRateLimit("k", 5, 31_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(30);
  });

  it("never reports a zero wait while blocked", () => {
    for (let i = 0; i < 5; i++) consumeRateLimit("k", 5, 1_000);
    // 1ms before the window closes the remaining time rounds to zero
    // seconds, which would tell a client to retry immediately.
    const blocked = consumeRateLimit("k", 5, 60_999);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it("starts a fresh window once the old one expires", () => {
    for (let i = 0; i < 5; i++) consumeRateLimit("k", 5, 1_000);
    expect(consumeRateLimit("k", 5, 61_001).allowed).toBe(true);
  });

  it("counts each key separately", () => {
    for (let i = 0; i < 5; i++) consumeRateLimit("a", 5, 1_000);
    expect(consumeRateLimit("a", 5, 1_000).allowed).toBe(false);
    expect(consumeRateLimit("b", 5, 1_000).allowed).toBe(true);
  });

  it("keeps one caller from spending another's budget", () => {
    // Keys carry the procedure and the address, so two viewers behind
    // different addresses must not share a window.
    for (let i = 0; i < 5; i++)
      consumeRateLimit("getViewer:198.51.100.1", 5, 1_000);
    expect(consumeRateLimit("getViewer:198.51.100.2", 5, 1_000).allowed).toBe(
      true
    );
  });

  it("keeps one procedure from spending another's budget", () => {
    for (let i = 0; i < 5; i++) consumeRateLimit("getViewer:ip", 5, 1_000);
    expect(consumeRateLimit("previewStaffInvite:ip", 5, 1_000).allowed).toBe(
      true
    );
  });
});

describe("configured limits", () => {
  it("leaves a polling viewer ample headroom", () => {
    // A tab polls every 5s: 12 requests a minute.
    const perTabPerMinute = 12;
    expect(rateLimits.poll / perTabPerMinute).toBeGreaterThanOrEqual(25);
  });

  it("still bounds a scripted client well below an open tap", () => {
    // One request every 100ms would be 600 a minute unbounded; the cap has
    // to be meaningfully under a sustained attack rate of ~10/s.
    expect(rateLimits.poll).toBeLessThanOrEqual(600);
  });

  it("holds the one-shot previews to a hand-driven rate", () => {
    expect(rateLimits.preview).toBeLessThan(rateLimits.poll);
  });

  it("admits a full minute of real polling without tripping", () => {
    for (let i = 0; i < 12; i++)
      expect(
        consumeRateLimit("getViewer:ip", rateLimits.poll, 1_000).allowed
      ).toBe(true);
  });
});
