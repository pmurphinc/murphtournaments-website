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
    ["spear", 82, null, null],
  ])(
    "retains the official 11.3 %s damage values in the current baseline",
    async (slug, bodyDamage, headDamage, damagePerMagazine) => {
      const detail = await getWeaponArchiveDetail(slug);

      expect(detail?.baselineSource?.versionLabel).toBe("11.6.0");
      expect(detail?.baselineStats[0]).toMatchObject({
        bodyDamage,
        headDamage,
        damagePerMagazine,
      });
    }
  );
});

describe("Update 11.6.0 archive data", () => {
  it.each([
    ["lockbolt-heavy", "Reload animation shortened and ammo restock timing moved earlier"],
    ["dematerializer-medium", "Cooldown reduced and item raise time removed"],
    ["evasive-dash-light", "Cooldown decreased from 6.5s to 6s per charge"],
    ["guardian-turret-medium", "Faster activation, more health, and shorter remote-retrieve cooldown"],
    ["akm", "Damage increased from 20 to 21"],
    ["arn-220", "Fire rate increased and reload animations shortened"],
    ["bfm-titan", "Damage falloff multiplier increased from 0.65 to 0.7"],
    ["cerberus-12ga", "Pellet damage increased from 8 to 9; full-shot damage increased from 104 to 117"],
    ["dagger", "Primary and Backstab damage increased with longer lunge durations"],
    ["dual-blades", "Precision zone angle increased from 9° to 12°"],
    ["ks-23", "Range reduced with lower falloff multiplier and shorter falloff ranges"],
    ["m11", "Recoil and ADS dispersion increased to reduce effective range"],
    ["recurve-bow", "Maximum-draw damage increased from 124 to 126"],
    ["riot-shield", "Primary damage and Shield Bash damage increased; 5m lunge fix applied"],
    ["spear", "Lunge reach, speed, sweep size, and Spin Attack sequence timing improved"],
    ["xp-54", "Full-mag recoil curve fixed and airborne ADS dispersion reduced by 8%"],
  ])("adds the official 11.6.0 history entry for %s", async (slug, summary) => {
    const detail = await getWeaponArchiveDetail(slug);
    const update = detail?.history.find(
      entry => entry.patch.versionLabel === "11.6.0"
    );

    expect(update?.patch).toMatchObject({
      title: "Update 11.6.0",
      patchDate: "2026-08-20",
      sourceUrl: "https://www.reachthefinals.com/patchnotes/11-60",
    });
    expect(update?.changes.map(change => change.changeSummary)).toContain(
      summary
    );
  });

  it("captures the direct Dual Blades and Riot Shield weapon bug fixes", async () => {
    const dualBlades = await getWeaponArchiveDetail("dual-blades");
    const riotShield = await getWeaponArchiveDetail("riot-shield");

    const dualUpdate = dualBlades?.history.find(
      entry => entry.patch.versionLabel === "11.6.0"
    );
    const riotUpdate = riotShield?.history.find(
      entry => entry.patch.versionLabel === "11.6.0"
    );

    expect(dualUpdate?.changes.map(change => change.changeSummary)).toContain(
      "Environmental damage and Deflect damage modifiers corrected"
    );
    expect(riotUpdate?.changes.map(change => change.changeSummary)).toContain(
      "Third-person impact visual and sound effects restored"
    );
  });

  it("advances numeric baseline stats affected by 11.6", async () => {
    const akm = await getWeaponArchiveDetail("akm");
    expect(akm?.baselineSource?.versionLabel).toBe("11.6.0");
    expect(akm?.baselineStats[0]).toMatchObject({
      bodyDamage: 21,
      headDamage: 31.5,
    });

    const arn = await getWeaponArchiveDetail("arn-220");
    expect(arn?.baselineStats[0]).toMatchObject({
      rateOfFireRpm: 750,
      emptyReloadTimeSeconds: 2.7,
    });

    const bfr = await getWeaponArchiveDetail("bfm-titan");
    expect(bfr?.baselineStats[0]).toMatchObject({
      damageDropoffModifierAtMaxRange: 70,
    });

    const cerberus = await getWeaponArchiveDetail("cerberus-12ga");
    expect(cerberus?.baselineStats[0]).toMatchObject({
      bodyDamage: 117,
      damagePerMagazine: 351,
    });

    const dagger = await getWeaponArchiveDetail("dagger");
    expect(dagger?.baselineStats.map(stat => stat.bodyDamage)).toEqual([
      70,
      85,
      340,
    ]);

    const ks23 = await getWeaponArchiveDetail("ks-23");
    expect(ks23?.baselineStats[0]).toMatchObject({
      damageDropoffMinRange: 12,
      damageDropoffMaxRange: 22,
      damageDropoffModifierAtMaxRange: 58,
    });

    const recurve = await getWeaponArchiveDetail("recurve-bow");
    const charged = recurve?.baselineStats.find(
      stat => stat.name === "Recurve Bow (Charged)"
    );
    expect(charged).toMatchObject({
      bodyDamage: 126,
      headDamage: 189,
    });

    const riotShield = await getWeaponArchiveDetail("riot-shield");
    expect(riotShield?.baselineStats[0]).toMatchObject({
      bodyDamage: 86,
      stkLightBody: 2,
      stkMediumBody: 3,
      stkHeavyBody: 5,
    });
  });
});
