import { describe, expect, it } from "vitest";
import { hasDistinctChangeText } from "./WeaponBalanceArchive";

describe("weapon archive change details", () => {
  it("shows detailed update text when it contains information beyond the summary", () => {
    expect(
      hasDistinctChangeText(
        "Lunge distance and reliability increased",
        "Primary and secondary lunge distance increased from 4.5m to 5m. Max lunge speed increased slightly."
      )
    ).toBe(true);
  });

  it("does not duplicate a summary that only differs by punctuation or casing", () => {
    expect(
      hasDistinctChangeText(
        "Increased damage from 88 to 90",
        "increased damage from 88 to 90."
      )
    ).toBe(false);
  });

  it("does not render an empty detail row", () => {
    expect(hasDistinctChangeText("A concise summary", "   ")).toBe(false);
  });
});
