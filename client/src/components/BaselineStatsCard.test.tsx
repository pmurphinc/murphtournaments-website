import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import BaselineStatsCard from "./BaselineStatsCard";

const meleeStat = {
  weaponId: "weapon_spear_alt",
  name: "Spear (Alt.)",
  weaponType: "melee" as const,
  bodyDamage: 105,
  headDamage: null,
  rateOfFireRpm: null,
  magazineSize: null,
  damagePerMagazine: null,
  tacticalReloadTimeSeconds: null,
  emptyReloadTimeSeconds: null,
  ttkVsLightBodySeconds: null,
  stkLightBody: 2,
  ttkVsMediumBodySeconds: null,
  stkMediumBody: 3,
  ttkVsHeavyBodySeconds: null,
  stkHeavyBody: 4,
  damageDropoffMinRange: null,
  damageDropoffMaxRange: null,
  damageDropoffModifierAtMaxRange: null,
  sourceNotes: "Damage is per hit in a 3-hit combo. Has a 3m radius.",
  rawValues: null,
};

describe("BaselineStatsCard", () => {
  it("renders sourced melee attack data without firearm-only sections", () => {
    const html = renderToStaticMarkup(
      <BaselineStatsCard weaponName="Spear (Alt.)" stat={meleeStat} source={null} />,
    );

    expect(html).toContain("Attack DMG");
    expect(html).toContain("105");
    expect(html).toContain("Damage is per hit in a 3-hit combo");
    expect(html).toContain("Hits to Eliminate");
    expect(html).not.toContain("Head DMG");
    expect(html).not.toContain("Reload");
    expect(html).not.toContain("Mag Size");
    expect(html).not.toContain("Dropoff");
    expect(html).not.toContain(">&lt;-</");
  });

  it("keeps ranged baseline sections available", () => {
    const html = renderToStaticMarkup(
      <BaselineStatsCard
        weaponName="93R"
        stat={{
          ...meleeStat,
          weaponId: "weapon_93r",
          name: "93R",
          weaponType: undefined,
          headDamage: 37.5,
          rateOfFireRpm: 600,
          magazineSize: 21,
          tacticalReloadTimeSeconds: 1.45,
          emptyReloadTimeSeconds: 1.75,
          damageDropoffMinRange: 30,
          damageDropoffMaxRange: 37.5,
          damageDropoffModifierAtMaxRange: 50,
          sourceNotes: null,
        }}
        source={null}
      />,
    );

    expect(html).toContain("Head DMG");
    expect(html).toContain("Mag Size");
    expect(html).toContain("Dropoff Start");
  });
});
