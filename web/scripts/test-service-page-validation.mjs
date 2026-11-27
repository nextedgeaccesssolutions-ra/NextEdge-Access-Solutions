import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeSolarServicePage } from "../lib/service-page-validation.ts";

const valid = {
  title: "Solar Energy & Industrial Services Philippines | NEAS",
  h1: "Solar Energy & Industrial Services",
  metaDescription: "NEAS supports solar energy and industrial projects in the Philippines with specialist access, project support, inspection and maintenance.",
  eyebrow: "Solar PV · Renewable Energy · Industrial Support",
  intro: "Specialist access and industrial field support for solar energy and power infrastructure projects.",
  image: "/img/hero-power.webp",
  scope: ["Solar PV project support"],
  industries: ["Solar farms"],
  experience: ["NEAS industrial field support capabilities"],
  faqs: [{ q: "What does NEAS support?", a: "Project-specific solar and industrial support." }],
};

test("accepts complete solar service content and preserves the canonical enquiry label", () => {
  const result = sanitizeSolarServicePage(valid);
  assert.equal(result?.h1, valid.h1);
  assert.equal(result?.enquiryLabel, "Solar Energy & Industrial Services");
});

test("rejects unsafe image URLs and empty FAQ content", () => {
  assert.equal(sanitizeSolarServicePage({ ...valid, image: "javascript:alert(1)" }), null);
  assert.equal(sanitizeSolarServicePage({ ...valid, faqs: [] }), null);
});

test("rejects missing SEO fields and malformed service lists", () => {
  assert.equal(sanitizeSolarServicePage({ ...valid, metaDescription: "" }), null);
  assert.equal(sanitizeSolarServicePage({ ...valid, scope: [] }), null);
});
