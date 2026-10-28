import { beforeEach, describe, expect, it } from "vitest";
import {
  consumeRateLimit,
  rateLimits,
  __rateLimitInternals,
  __resetRateLimits,
  __trackedKeyCount,
} from "./_core/rateLimit";

const { clientKey, maxTrackedKeys, overflowKey } = __rateLimitInternals;

const reqWith = (xff?: string, remote = "203.0.113.9") =>
  ({
    headers: xff === undefined ? {} : { "x-forwarded-for": xff },
    socket: { remoteAddress: remote },
  }) as never;

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

describe("clientKey", () => {
  it("uses the socket address when there is no proxy header", () => {
    expect(clientKey(reqWith(undefined, "203.0.113.9"))).toBe("203.0.113.9");
  });

  it("uses the address the proxy appended", () => {
    expect(clientKey(reqWith("198.51.100.7"))).toBe("198.51.100.7");
  });

  it("ignores a chain the client invented", () => {
    // A client sending its own X-Forwarded-For has that value placed to the
    // LEFT of the address the proxy appends, so reading from the right
    // yields the address that actually connected.
    expect(clientKey(reqWith("8.8.8.8, 198.51.100.7"))).toBe("198.51.100.7");
    expect(clientKey(reqWith("1.1.1.1, 2.2.2.2, 198.51.100.7"))).toBe(
      "198.51.100.7"
    );
  });

  it("cannot be moved to a fresh bucket by spoofing the header", () => {
    const a = clientKey(reqWith("10.0.0.1, 198.51.100.7"));
    const b = clientKey(reqWith("172.16.5.5, 198.51.100.7"));
    const c = clientKey(reqWith("evil, 198.51.100.7"));
    expect(new Set([a, b, c]).size).toBe(1);
  });

  it("skips private hops to find the real caller", () => {
    expect(clientKey(reqWith("198.51.100.7, 10.0.0.3"))).toBe("198.51.100.7");
    expect(clientKey(reqWith("198.51.100.7, 172.16.0.1, 10.1.2.3"))).toBe(
      "198.51.100.7"
    );
  });

  it("collapses unparseable addresses into one bucket", () => {
    // Otherwise each junk value would mint a map entry.
    const junk = ["not-an-ip", "", "   ", "'; DROP TABLE", "999.999.999.999"];
    const keys = junk.map(v => clientKey(reqWith(v, "bogus")));
    expect(new Set(keys)).toEqual(new Set(["unknown"]));
  });

  it("never returns an attacker-supplied string as the key", () => {
    const key = clientKey(reqWith("A".repeat(5000), "bogus"));
    expect(key).toBe("unknown");
    expect(key.length).toBeLessThan(50);
  });

  it("handles IPv6 and IPv4-mapped addresses", () => {
    expect(clientKey(reqWith("2001:db8::1"))).toBe("2001:db8::1");
    expect(clientKey(reqWith("::1", "bogus"))).toBe("unknown");
  });
});

describe("keyspace bounds", () => {
  it("stops growing once the ceiling is reached", () => {
    for (let i = 0; i < maxTrackedKeys + 500; i++)
      consumeRateLimit(`k${i}`, 10, 1_000);
    expect(__trackedKeyCount()).toBeLessThanOrEqual(maxTrackedKeys + 1);
  });

  it("still limits callers that land in the overflow bucket", () => {
    for (let i = 0; i < maxTrackedKeys; i++)
      consumeRateLimit(`k${i}`, 10, 1_000);
    // Everything new now shares one window, so the cap still applies.
    let blocked = false;
    for (let i = 0; i < 40; i++)
      if (!consumeRateLimit(`overflow${i}`, 10, 1_000).allowed) blocked = true;
    expect(blocked).toBe(true);
  });

  it("reclaims the keyspace once windows expire", () => {
    for (let i = 0; i < 1_000; i++) consumeRateLimit(`k${i}`, 10, 1_000);
    expect(__trackedKeyCount()).toBe(1_000);
    // A new caller after the window closes triggers a prune of the stale
    // entries rather than stacking on top of them.
    for (let i = 0; i < maxTrackedKeys; i++)
      consumeRateLimit(`later${i}`, 10, 61_001);
    expect(__trackedKeyCount()).toBeLessThanOrEqual(maxTrackedKeys + 1);
  });

  it("exposes a stable overflow key", () => {
    expect(typeof overflowKey).toBe("string");
    expect(overflowKey.length).toBeGreaterThan(0);
  });
});
