import { describe, expect, it } from "vitest";
import { findShopeeListing } from "./shopee-listings";

describe("findShopeeListing", () => {
  it("matches same products", () => {
    expect(findShopeeListing("Sparrow 200R")?.itemId).toBe(48904430745);
    expect(findShopeeListing("Quick Up DX Left Hand Ascender")?.itemId).toBe(55154412350);
    expect(findShopeeListing("ROPE SHIELD")?.itemId).toBe(52354400874);
  });
  it("does not guess between variants", () => {
    expect(findShopeeListing("TUNER PRO (New)")).toBeNull();
    expect(findShopeeListing("LARGE – Alloy Screw Gate Carabiner")).toBeNull();
    expect(findShopeeListing("100cm Steel Ankor")).toBeNull();
  });
});
