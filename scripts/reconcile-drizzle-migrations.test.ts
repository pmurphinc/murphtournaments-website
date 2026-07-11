import { describe, expect, it } from "vitest";

import {
  buildIndexDefinitionFromStatisticsRows,
  normalizeIndexColumnName,
  parseMysqlNonUnique,
} from "./reconcile-drizzle-migrations";

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

describe("normalizeIndexColumnName", () => {
  it("normalizes string and Buffer column names", () => {
    expect(normalizeIndexColumnName("sourceGameId")).toBe("sourceGameId");
    expect(normalizeIndexColumnName(Buffer.from("targetGameId"))).toBe(
      "targetGameId"
    );
  });
});

describe("buildIndexDefinitionFromStatisticsRows", () => {
  it("uses aliased production-style fields to build a unique index definition", () => {
    expect(
      buildIndexDefinitionFromStatisticsRows([
        { columnName: "sourceGameId", nonUnique: "0" },
        { columnName: "targetGameId", nonUnique: 0 },
        { columnName: Buffer.from("flowType"), nonUnique: 0n },
      ])
    ).toEqual({
      exists: true,
      columns: ["sourceGameId", "targetGameId", "flowType"],
      unique: true,
    });
  });

  it("supports string, numeric, bigint, and Buffer nonUnique values", () => {
    expect(
      buildIndexDefinitionFromStatisticsRows([
        { columnName: Buffer.from("sourceGameId"), nonUnique: "1" },
        { columnName: "targetGameId", nonUnique: 1 },
        { columnName: "flowType", nonUnique: 1n },
        { columnName: "extra", nonUnique: Buffer.from("1") },
      ])
    ).toEqual({
      exists: true,
      columns: ["sourceGameId", "targetGameId", "flowType", "extra"],
      unique: false,
    });
  });

  it("rejects undefined aliased nonUnique values instead of guessing", () => {
    expect(() =>
      buildIndexDefinitionFromStatisticsRows([
        { columnName: "sourceGameId", nonUnique: undefined },
      ])
    ).toThrow(/Unexpected information_schema\.statistics\.non_unique value/);
  });
});
