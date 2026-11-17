import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AI_GATEWAY_MODEL, generateAIGatewayText } from "../lib/ai-gateway.ts";

test("uses the live catalog-selected Recursive Flint 1.0 model by default", () => {
  assert.equal(DEFAULT_AI_GATEWAY_MODEL, "recursive/flint-v1.0");
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
  assert.deepEqual(result, { text: "Qualified lead plan", model: "recursive/flint-v1.0" });
  assert.equal(request.url, "https://ai-gateway.vercel.sh/v1/chat/completions");
  assert.equal(request.init.headers.authorization, "Bearer test-oidc-token");
  assert.equal(JSON.parse(request.init.body).model, "recursive/flint-v1.0");
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

test("reads the Vercel Functions OIDC token from the incoming request header", async () => {
  let request;
  const incoming = new Request("https://neas.example/api/admin/ai-workforce", {
    headers: { "x-vercel-oidc-token": "runtime-oidc-token" },
  });
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    request: incoming,
    apiKey: "",
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: "Runtime authenticated" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "Runtime authenticated", model: DEFAULT_AI_GATEWAY_MODEL });
  assert.equal(request.init.headers.authorization, "Bearer runtime-oidc-token");
});


test("extracts text from a Responses API output_text payload", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => new Response(JSON.stringify({ id: "resp_123", output_text: "Gateway output text" }), { status: 200 }),
  });
  assert.deepEqual(result, { text: "Gateway output text", model: DEFAULT_AI_GATEWAY_MODEL });
});

test("extracts text from structured chat-completion content blocks", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: [{ type: "text", text: "First" }, { type: "text", text: "Second" }] } }] }), { status: 200 }),
  });
  assert.deepEqual(result, { text: "First\nSecond", model: DEFAULT_AI_GATEWAY_MODEL });
});

test("extracts text from a Responses API output content array", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: "Structured output" }] }] }), { status: 200 }),
  });
  assert.deepEqual(result, { text: "Structured output", model: DEFAULT_AI_GATEWAY_MODEL });
});

test("returns actionable safe diagnostics for an empty model completion", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => new Response(JSON.stringify({ id: "resp_empty_1", choices: [{ finish_reason: "length", message: { content: "" } }] }), { status: 200 }),
  });
  assert.equal("error" in result, true);
  if ("error" in result) {
    assert.match(result.error, /empty completion/);
    assert.match(result.error, /finish_reason=length/);
    assert.match(result.error, /response_id=resp_empty_1/);
    assert.doesNotMatch(result.error, /oidc|test prompt/i);
  }
});