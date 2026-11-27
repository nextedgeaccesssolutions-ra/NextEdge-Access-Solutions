import { describe, expect, it } from "vitest";
import {
  signCommercialRequest,
  validateCommercialBrief,
  verifyCommercialRequest,
} from "./giieCmsIntegration";

const allowlist = new Set(["doe.gov.ph", "erc.gov.ph"]);
const brief = {
  signalId: "doe-tender-2026-001",
  title: "Philippine renewable energy procurement opportunity announced",
  industry: "Energy and utilities",
  summary: "A verified public-sector announcement describes a procurement opportunity relevant to Philippine energy infrastructure and renewable energy service providers.",
  body: "The published notice identifies the procurement scope and the official issuing body. NEAS should independently assess eligibility, deadlines, technical requirements and commercial fit before any bid decision.",
  seoDescription: "Verified Philippine energy procurement market update with original public sources.",
  sources: [
    { title: "Official procurement notice", publisher: "Department of Energy", url: "https://doe.gov.ph/notices/example", official: true },
    { title: "Regulatory corroboration", publisher: "Energy Regulatory Commission", url: "https://erc.gov.ph/notices/example", official: true },
  ],
  verification: {
    status: "verified",
    independentSourceCount: 2,
    policyVersion: "neas-giie-commercial-v1",
  },
};

describe("GIIE commercial CMS intake policy", () => {
  it("accepts verified briefs with two independent allowlisted HTTPS sources", () => {
    expect(validateCommercialBrief(brief, allowlist).success).toBe(true);
  });

  it("rejects a source outside the configured host allowlist", () => {
    const input = { ...brief, sources: [...brief.sources.slice(0, 1), { ...brief.sources[1], url: "https://example.com/news" }] };
    expect(validateCommercialBrief(input, allowlist).success).toBe(false);
  });

  it("rejects non-HTTPS source links", () => {
    const input = { ...brief, sources: [{ ...brief.sources[0], url: "http://doe.gov.ph/notices/example" }, brief.sources[1]] };
    expect(validateCommercialBrief(input, allowlist).success).toBe(false);
  });

  it("rejects two URLs from the same host as non-independent evidence", () => {
    const input = { ...brief, sources: [brief.sources[0], { ...brief.sources[1], url: "https://doe.gov.ph/another-notice" }] };
    expect(validateCommercialBrief(input, allowlist).success).toBe(false);
  });

  it("rejects unverified or incorrectly versioned publication policy", () => {
    const input = { ...brief, verification: { ...brief.verification, status: "unverified" } };
    expect(validateCommercialBrief(input, allowlist).success).toBe(false);
  });

  it("signs the exact timestamp, request id and serialized body", () => {
    const secret = "test-secret-with-at-least-32-characters";
    const timestamp = "1795800000";
    const requestId = "6c1d4a90-b1c3-4c56-8f6c-a4b7a3f1e210";
    const body = JSON.stringify(brief);
    const signature = signCommercialRequest(secret, timestamp, requestId, body);
    expect(verifyCommercialRequest(secret, timestamp, requestId, body, signature, Number(timestamp))).toBe(true);
    expect(verifyCommercialRequest(secret, timestamp, requestId, body + " ", signature, Number(timestamp))).toBe(false);
    expect(verifyCommercialRequest(secret, timestamp, requestId, body, signature, Number(timestamp) + 301)).toBe(false);
  });
});
