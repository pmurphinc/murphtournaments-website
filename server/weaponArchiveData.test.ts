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

describe("Update 11.3.0 archive data", () => {
  it.each([
    ["c4-heavy", "Increased cooldown from 30s to 45s"],
    ["grappling-hook-light", "Decreased cooldown from 7s to 6s"],
    ["bfm-titan", "Increased damage from 88 to 90"],
    ["dagger", "Lunge distance and reliability increased"],
    [
      "dual-blades",
      "Precision, lunge, Cross Slash, and Deflect movement improved",
    ],
    ["famas", "Increased damage from 23 to 24"],
    [
      "ks-23",
      "Damage decreased from 110 to 104; falloff multiplier increased from 0.64 to 0.675",
    ],
    [
      "riot-shield",
      "Precision, lunge, damage, and Shield Bash reliability increased",
    ],
    ["spear", "Primary and secondary attack damage increased"],
    [
      "dome-shield-heavy",
      "Fixed friendly melee attacks damaging the Dome Shield",
    ],
  ])("adds the official 11.3.0 history entry for %s", async (slug, summary) => {
    const detail = await getWeaponArchiveDetail(slug);
    const update = detail?.history.find(
      entry => entry.patch.versionLabel === "11.3.0"
    );

    expect(update?.patch).toMatchObject({
      title: "Update 11.3.0",
      patchDate: "2026-07-30",
      sourceUrl: "https://www.reachthefinals.com/patchnotes/11-30",
    });
    expect(update?.changes.map(change => change.changeSummary)).toContain(
      summary
    );
  });

  it.each([
    ["bfm-titan", 90, 135, 450],
    ["famas", 24, 36, 648],
    ["ks-23", 104, null, 624],
    ["riot-shield", 83, null, null],
    ["spear", 82, null, null],
  ])(
    "advances the current %s baseline through Update 11.3.0",
    async (slug, bodyDamage, headDamage, damagePerMagazine) => {
      const detail = await getWeaponArchiveDetail(slug);

      expect(detail?.baselineSource?.versionLabel).toBe("11.3.0");
      expect(detail?.baselineStats[0]).toMatchObject({
        bodyDamage,
        headDamage,
        damagePerMagazine,
      });
    }
  );
});
