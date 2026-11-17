import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Cloudflare Analytics panel metric labels", () => {
  it("labels the Cloudflare visits metric accurately in the summary and hourly table", () => {
    const source = readFileSync(new URL("./CloudflareAnalyticsPanel.tsx", import.meta.url), "utf8");

    expect(source).toContain('label="VISITS"');
    expect(source).toContain("totals?.visits");
    expect(source).toContain("item.visits");
    expect(source).toContain("Cloudflare visits; not page views");
    expect(source).not.toContain("PAGEVIEWS");
    expect(source).not.toContain("pageViews");
  });
});