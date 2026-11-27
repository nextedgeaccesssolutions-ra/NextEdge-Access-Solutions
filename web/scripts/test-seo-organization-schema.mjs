import assert from "node:assert/strict";
import { test } from "node:test";
import { organizationSchema } from "../lib/organization-schema.ts";

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


import { SERVICE_PAGES } from "../lib/service-pages.ts";
import { getStaticSitemapEntries } from "../lib/sitemap-routes.ts";

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

test("all service landing pages are unique, complete and included in the sitemap", () => {
  const ids = SERVICE_PAGES.map((page) => page.id);
  assert.equal(new Set(ids).size, ids.length, "service page ids must be unique");
  assert.ok(ids.includes("renewable-energy"));
  assert.ok(ids.includes("offshore-onshore"));

  for (const page of SERVICE_PAGES) {
    assert.ok(page.title.length >= 30, `${page.id} needs a descriptive title`);
    assert.ok(page.metaDescription.length >= 50, `${page.id} needs a search description`);
    assert.ok(page.h1.length > 0, `${page.id} needs one primary heading`);
    assert.ok(page.scope.length > 0, `${page.id} needs a service scope`);
    assert.ok(page.faqs.length >= 3, `${page.id} needs useful FAQs`);
  }

  const urls = getStaticSitemapEntries("https://www.nextedge-access-solutions.com", new Date())
    .map((entry) => entry.url);
  for (const id of ids) {
    assert.ok(urls.includes(`https://www.nextedge-access-solutions.com/services/${id}`));
  }
});
