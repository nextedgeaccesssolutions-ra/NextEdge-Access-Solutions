import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pages = readFileSync(new URL("../lib/service-pages.ts", import.meta.url), "utf8");
const services = readFileSync(new URL("../lib/services.ts", import.meta.url), "utf8");
const home = readFileSync(new URL("../site/home.html", import.meta.url), "utf8");
const sitemapTest = readFileSync(new URL("../lib/sitemap-routes.test.ts", import.meta.url), "utf8");

test("solar energy industrial service has a canonical slug, SEO metadata and quote scope", () => {
  assert.match(pages, /id: "solar-energy-industrial"/);
  assert.match(pages, /Solar Energy & Industrial Services Philippines/);
  assert.match(pages, /metaDescription:/);
  assert.match(pages, /enquiryLabel: "Solar Energy & Industrial Services"/);
});

test("solar service is linked from homepage and has matching service metadata", () => {
  assert.match(home, /href="/services/solar-energy-industrial"/);
  assert.match(services, /"solar-energy-industrial"/);
});

test("sitemap tests require the new service page to be indexed", () => {
  assert.match(sitemapTest, /solar-energy-industrial/);
});
