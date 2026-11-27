import assert from "node:assert/strict";
import { test } from "node:test";
import { localBusinessSchema, organizationSchema } from "../lib/organization-schema.ts";

test("NEAS organization schema uses the canonical public identity", () => {
  assert.equal(organizationSchema["@type"], "Organization");
  assert.equal(organizationSchema.url, "https://www.nextedge-access-solutions.com/");
  assert.match(organizationSchema.logo, /^https:\/\//);
  assert.match(organizationSchema.email, /@/);
  assert.match(organizationSchema.telephone, /^\+63/);
  assert.equal(organizationSchema.areaServed.name, "Philippines");
});

test("organization schema uses the verified official social profiles", () => {
  assert.ok(organizationSchema.sameAs.includes("https://www.facebook.com/NextEdgeAccessSolutions/"));
  assert.ok(organizationSchema.sameAs.includes("https://www.instagram.com/nextedgeaccesssolutions.neas/"));
  assert.ok(organizationSchema.sameAs.includes("https://www.linkedin.com/company/nextedge-access-solutions-neas/"));
  assert.equal(organizationSchema.sameAs.some(url => url.includes("NextEdgeAccessSolutionss")), false);
});

test("Marilao LocalBusiness schema has a complete, consistent address", () => {
  assert.equal(localBusinessSchema["@type"], "LocalBusiness");
  assert.equal(localBusinessSchema.address.addressLocality, "Marilao");
  assert.equal(localBusinessSchema.address.addressRegion, "Bulacan");
  assert.equal(localBusinessSchema.address.postalCode, "3019");
  assert.equal(localBusinessSchema.address.addressCountry, "PH");
  assert.equal(localBusinessSchema.telephone, organizationSchema.telephone);
});
