import { describe, expect, it } from "vitest";
import { getWeaponArchiveDetail } from "./weaponArchiveData";

describe("weapon archive melee baseline data", () => {
  it.each([
    ["dagger", ["Dagger", "Dagger (Alt.)", "Dagger (Alt. w/ Backstab)"]],
    ["sword", ["Sword", "Sword (Alt.)"]],
    ["sledgehammer", ["Sledgehammer", "Sledgehammer (Alt.)"]],
    ["spear", ["Spear", "Spear (Alt.)"]],
  ])("includes sourced primary and alt rows for %s", async (slug, expectedNames) => {
    const detail = await getWeaponArchiveDetail(slug);

    expect(detail?.baselineStats.map(stat => stat.name)).toEqual(expectedNames);
    expect(detail?.baselineStats.every(stat => stat.weaponType === "melee")).toBe(true);
  });

  it.each(["dual-blades", "riot-shield"])("marks %s as melee without manufacturing an alt row", async slug => {
    const detail = await getWeaponArchiveDetail(slug);

    expect(detail?.baselineStats).toHaveLength(1);
    expect(detail?.baselineStats[0]?.weaponType).toBe("melee");
  });
});
