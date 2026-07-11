import { describe, expect, it } from "vitest";

import { parseMysqlNonUnique } from "./reconcile-drizzle-migrations";

describe("parseMysqlNonUnique", () => {
  it("recognizes unique index metadata values returned as zero", () => {
    expect(parseMysqlNonUnique(0)).toBe(false);
    expect(parseMysqlNonUnique(0n)).toBe(false);
    expect(parseMysqlNonUnique("0")).toBe(false);
    expect(parseMysqlNonUnique(" 0 ")).toBe(false);
    expect(parseMysqlNonUnique(Buffer.from("0"))).toBe(false);
  });

  it("recognizes non-unique index metadata values returned as one", () => {
    expect(parseMysqlNonUnique(1)).toBe(true);
    expect(parseMysqlNonUnique(1n)).toBe(true);
    expect(parseMysqlNonUnique("1")).toBe(true);
    expect(parseMysqlNonUnique(" 1 ")).toBe(true);
    expect(parseMysqlNonUnique(Buffer.from("1"))).toBe(true);
  });

  it("rejects unexpected metadata values instead of guessing", () => {
    expect(() => parseMysqlNonUnique("yes")).toThrow(
      /Unexpected information_schema\.statistics\.non_unique value/
    );
  });
});
