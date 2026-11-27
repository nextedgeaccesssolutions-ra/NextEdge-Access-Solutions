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
