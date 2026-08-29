import { describe, expect, it } from "vitest";
import { homepageSeo } from "../client/src/data/homeSeo";

describe("homepage SEO metadata", () => {
  it("stays within the requested title and description limits", () => {
    expect(homepageSeo.title.length).toBeGreaterThanOrEqual(30);
    expect(homepageSeo.title.length).toBeLessThanOrEqual(60);
    expect(homepageSeo.description.length).toBeGreaterThanOrEqual(50);
    expect(homepageSeo.description.length).toBeLessThanOrEqual(160);
  });

  it("contains a focused keyword set within the requested count", () => {
    expect(homepageSeo.keywords.length).toBeGreaterThanOrEqual(3);
    expect(homepageSeo.keywords.length).toBeLessThanOrEqual(8);
    expect(new Set(homepageSeo.keywords).size).toBe(homepageSeo.keywords.length);
  });
});
