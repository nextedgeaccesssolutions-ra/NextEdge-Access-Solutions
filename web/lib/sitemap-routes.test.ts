import { describe, expect, it } from "vitest";
import { getStaticSitemapEntries } from "./sitemap-routes";

describe("static sitemap destinations", () => {
  const origin = "https://www.nextedge-access-solutions.com";
  const now = new Date("2026-11-17T00:00:00.000Z");
  const entries = getStaticSitemapEntries(origin, now);
  const urls = entries.map(entry => entry.url);

  it("includes the distinct public pages that declare their own canonical URLs", () => {
    expect(urls).toEqual([
      `${origin}/`,
      `${origin}/about`,
      `${origin}/services`,
      `${origin}/store`,
      `${origin}/our-clients`,
      `${origin}/locations/marilao-bulacan`,
      `${origin}/services/rope-access`,
      `${origin}/services/wind-turbine`,
      `${origin}/services/metmast-telecom`,
      `${origin}/services/ndt-inspection`,
      `${origin}/services/coatings`,
      `${origin}/services/training`,
      `${origin}/services/renewable-energy`,
      `${origin}/services/offshore-onshore`,
      `${origin}/services/solar-energy-industrial`,
      `${origin}/privacy-policy`,
    ]);
  });

  it("lists every service landing page, so none is orphaned from search", async () => {
    const { SERVICE_PAGES } = await import("./service-pages");
    for (const page of SERVICE_PAGES)
      expect(urls).toContain(`${origin}/services/${page.id}`);
  });

  it("includes the local Marilao page as a crawlable destination", () => {
    expect(urls).toContain(`${origin}/locations/marilao-bulacan`);
  });

  it("homepage service cards link to every service landing page with a crawlable href", async () => {
    const { readFileSync } = await import("node:fs");
    const { SERVICE_PAGES } = await import("./service-pages");
    const html = readFileSync(
      new URL("../site/home.html", import.meta.url),
      "utf8"
    );
    for (const page of SERVICE_PAGES)
      expect(html).toContain(`href="/services/${page.id}"`);
  });

  it("does not advertise homepage section aliases as separate indexable pages", () => {
    for (const section of [
      "home",
      "partners",
      "contact",
    ]) {
      expect(urls).not.toContain(`${origin}/${section}`);
    }
  });

  it("uses the supplied timestamp for each static entry", () => {
    expect(entries.every(entry => entry.lastModified === now)).toBe(true);
  });
});
