import assert from "node:assert/strict";
import test from "node:test";
import { getAiwRuntimeReadiness } from "../lib/aiw-readiness.ts";

test("reports specialist AI ready when Vercel Functions supplies the OIDC request header", () => {
  const request = new Request("https://neas.example/api/admin/ai-workforce", {
    headers: { "x-vercel-oidc-token": "runtime-oidc-token" },
  });
  const result = getAiwRuntimeReadiness(request, {});
  assert.equal(result.specialistAiReady, true);
  assert.equal(result.specialistAiProvider, "vercel-ai-gateway");
  assert.equal(result.aiReady, false);
  assert.equal(result.aiProvider, null);
});

test("supports an explicitly configured runtime OIDC token for local/test environments", () => {
  const request = new Request("https://neas.example/api/admin/ai-workforce");
  const result = getAiwRuntimeReadiness(request, { VERCEL_OIDC_TOKEN: "configured-token" });
  assert.equal(result.specialistAiReady, true);
  assert.equal(result.specialistAiProvider, "vercel-ai-gateway");
});

test("fails closed when Gateway OIDC is unavailable", () => {
  const request = new Request("https://neas.example/api/admin/ai-workforce");
  const result = getAiwRuntimeReadiness(request, {});
  assert.equal(result.specialistAiReady, false);
  assert.equal(result.specialistAiProvider, null);
});

test("fails closed when a static Gateway key is configured instead of project OIDC", () => {
  const request = new Request("https://neas.example/api/admin/ai-workforce", {
    headers: { "x-vercel-oidc-token": "runtime-oidc-token" },
  });
  const result = getAiwRuntimeReadiness(request, {
    AI_GATEWAY_API_KEY: "static-key",
  });
  assert.equal(result.specialistAiReady, false);
  assert.equal(result.specialistAiProvider, null);
});

test("keeps separate marketing provider readiness accurate", () => {
  const request = new Request("https://neas.example/api/admin/ai-workforce");
  const result = getAiwRuntimeReadiness(request, { GEMINI_API_KEY: "configured" });
  assert.equal(result.specialistAiReady, false);
  assert.equal(result.aiReady, true);
  assert.equal(result.aiProvider, "gemini");
});
