import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AI_GATEWAY_MODEL, generateAIGatewayText } from "../lib/ai-gateway.ts";

test("uses the live catalog-selected Gemini 3 Flash model by default", () => {
  assert.equal(DEFAULT_AI_GATEWAY_MODEL, "google/gemini-3-flash");
});

test("sends specialist prompts using project OIDC and returns generated text", async () => {
  let request;
  const result = await generateAIGatewayText({ system: "NEAS system", user: "Create a lead qualification plan" }, {
    token: "test-oidc-token",
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: "Qualified lead plan" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "Qualified lead plan", model: "google/gemini-3-flash" });
  assert.equal(request.url, "https://ai-gateway.vercel.sh/v1/chat/completions");
  assert.equal(request.init.headers.authorization, "Bearer test-oidc-token");
  assert.equal(JSON.parse(request.init.body).model, "google/gemini-3-flash");
});

test("refuses static Gateway keys so the project OIDC budget cannot be bypassed", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, { token: "oidc", apiKey: "static-key" });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /project OIDC billing/i);
});

test("fails closed when the OIDC token is missing", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, { token: "", apiKey: "" });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /OIDC token is missing/i);
});

test("does not fallback when the monthly Gateway budget is exhausted", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => new Response(JSON.stringify({ error: { message: "quota exceeded" } }), { status: 402 }),
  });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /monthly project budget/i);
});

test("does not fallback when project OIDC authentication is rejected", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => new Response("{}", { status: 401 }),
  });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /OIDC federation/i);
});
