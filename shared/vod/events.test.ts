import { describe, expect, it } from "vitest";
import { formatVodEventTimestamp, parseVodEventTimestamp } from "./events";

describe("parseVodEventTimestamp", () => {
  it("parses whole seconds", () => {
    expect(parseVodEventTimestamp("0")).toBe(0);
    expect(parseVodEventTimestamp("90")).toBe(90);
    expect(parseVodEventTimestamp(" 120 ")).toBe(120);
  });

  it("parses m:ss and mm:ss values", () => {
    expect(parseVodEventTimestamp("1:30")).toBe(90);
    expect(parseVodEventTimestamp("12:05")).toBe(725);
  });

  it("rejects invalid timestamp values", () => {
    expect(parseVodEventTimestamp("")).toBeNull();
    expect(parseVodEventTimestamp("-1")).toBeNull();
    expect(parseVodEventTimestamp("1:60")).toBeNull();
    expect(parseVodEventTimestamp("1:2")).toBeNull();
    expect(parseVodEventTimestamp("1:02:03")).toBeNull();
  });
});

describe("formatVodEventTimestamp", () => {
  it("formats timestamps as m:ss", () => {
    expect(formatVodEventTimestamp(0)).toBe("0:00");
    expect(formatVodEventTimestamp(90)).toBe("1:30");
  });
});
