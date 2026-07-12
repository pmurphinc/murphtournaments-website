import { describe, expect, it } from "vitest";
import { getWeaponArchiveDetail } from "./weaponArchiveData";

describe("weapon archive melee baseline data", () => {
  it.each([
    ["dagger", ["Dagger", "Dagger (Alt.)", "Dagger (Alt. w/ Backstab)"]],
    ["sword", ["Sword", "Sword (Alt.)"]],
    ["sledgehammer", ["Sledgehammer", "Sledgehammer (Alt.)"]],
    ["spear", ["Spear", "Spear (Alt.)"]],
  ])(
    "includes sourced primary and alt rows for %s",
    async (slug, expectedNames) => {
      const detail = await getWeaponArchiveDetail(slug);

      expect(detail?.baselineStats.map(stat => stat.name)).toEqual(
        expectedNames
      );
      expect(
        detail?.baselineStats.every(stat => stat.weaponType === "melee")
      ).toBe(true);
    }
  );

  it.each(["dual-blades", "riot-shield"])(
    "marks %s as melee without manufacturing an alt row",
    async slug => {
      const detail = await getWeaponArchiveDetail(slug);

      expect(detail?.baselineStats).toHaveLength(1);
      expect(detail?.baselineStats[0]?.weaponType).toBe("melee");
    }
  );
});

describe("Model 1887 Season 11 archive data", () => {
  it("returns the current baseline damage and one official 11.0.0 pellet-damage buff", async () => {
    const detail = await getWeaponArchiveDetail("model-1887");

    expect(detail).not.toBeNull();
    expect(detail?.baselineStats[0]?.bodyDamage).toBe(117);

    const season11Entry = detail?.history.find(
      entry => entry.patch.versionLabel === "11.0.0"
    );
    expect(season11Entry).toBeDefined();

    const model1887PelletChanges =
      season11Entry?.changes.filter(
        change =>
          change.weaponId === "weapon_model_1887" &&
          change.statField === "pellet_damage" &&
          change.oldValue === "12" &&
          change.newValue === "13" &&
          change.changeType === "buff"
      ) ?? [];

    expect(model1887PelletChanges).toHaveLength(1);
    expect(model1887PelletChanges[0]?.changeSummary).toBe(
      "Increased pellet damage from 12 to 13"
    );
  });
});
