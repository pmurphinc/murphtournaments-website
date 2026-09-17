import { describe, expect, it } from "vitest";
import {
  RESPEC_ORDER_3_PATCH_URL,
  RESPEC_ORDER_3_WEAPONS,
} from "./respecOrder3";

describe("Respec Order 3.0 homepage links", () => {
  it("links the update card to the local 11.10.0 patch note", () => {
    expect(RESPEC_ORDER_3_PATCH_URL).toBe(
      "/patchnotes?version=11.10.0#patch-11-10-0"
    );
  });

  it("includes one unique archive link for every affected weapon", () => {
    expect(RESPEC_ORDER_3_WEAPONS).toHaveLength(13);
    expect(
      new Set(RESPEC_ORDER_3_WEAPONS.map(weapon => weapon.slug)).size
    ).toBe(13);
    expect(RESPEC_ORDER_3_WEAPONS.map(weapon => weapon.name)).toEqual([
      "Dagger",
      "LH1",
      "Sword",
      "CB-01 Repeater",
      "Chimera-XB",
      "Dual Blades",
      "P90",
      "Pike-556",
      "Riot Shield",
      "BFR Titan",
      "Lewis Gun",
      "M60",
      "MGL-32",
    ]);
  });
});
