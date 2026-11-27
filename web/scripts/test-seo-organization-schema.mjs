import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { organizationSchema } from "../lib/organization-schema.ts";

const servicePagesSource = readFileSync(
  fileURLToPath(new URL("../lib/service-pages.ts", import.meta.url)),
  "utf8",
);
const sitemapSource = readFileSync(
  fileURLToPath(new URL("../lib/sitemap-routes.ts", import.meta.url)),
  "utf8",
);

test("NEAS organization schema uses the canonical public identity", () => {
  assert.equal(organizationSchema["@type"], "Organization");
  assert.equal(organizationSchema.url, "https://www.nextedge-access-solutions.com/");
  assert.match(organizationSchema.logo, /^https:\/\//);
  assert.match(organizationSchema.email, /@/);
  assert.match(organizationSchema.telephone, /^\+63/);
  assert.equal(organizationSchema.areaServed.name, "Philippines");
});

test("organization schema does not claim the outdated Cebu base location", () => {
  const serialized = JSON.stringify(organizationSchema).toLowerCase();
  assert.equal(serialized.includes("cebu"), false);
  assert.equal(serialized.includes("philippines"), true);
});

test("NEAS local organization schema includes the Marilao business address", () => {
  assert.deepEqual(organizationSchema.address, {
    "@type": "PostalAddress",
    streetAddress: "B 15 Lot 6, Marilao Grand Villas, Barangay Loma de Gato",
    addressLocality: "Marilao",
    addressRegion: "Bulacan",
    postalCode: "3019",
    addressCountry: "PH",
  });
});

test("renewable-energy and offshore/onshore landing pages are present and sitemap-driven", () => {
  const ids = [...servicePagesSource.matchAll(/^\s*id: "([^"]+)"/gm)].map((match) => match[1]);
  assert.equal(ids.length, 9, "expected six original and three additional service landing pages");
  assert.equal(new Set(ids).size, ids.length, "service page ids must be unique");
  assert.ok(ids.includes("renewable-energy"));
  assert.ok(ids.includes("offshore-onshore"));
  assert.ok(ids.includes("solar-energy-industrial"));
  assert.match(sitemapSource, /\.\.\.SERVICE_PAGES\.map/);
  assert.match(sitemapSource, /\/services\/\$\{p\.id\}/);
});
