import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AI_GATEWAY_MODEL, extractGatewayText, generateAIGatewayText, usesProjectAIGateway } from "../lib/ai-gateway.ts";

test("uses the live catalog-selected GPT-4o Mini model by default", () => {
  assert.equal(DEFAULT_AI_GATEWAY_MODEL, "openai/gpt-4o-mini");
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
  assert.deepEqual(result, { text: "Qualified lead plan", model: "openai/gpt-4o-mini" });
  assert.equal(request.url, "https://ai-gateway.vercel.sh/v1/chat/completions");
  assert.equal(request.init.headers.authorization, "Bearer test-oidc-token");
  assert.equal(JSON.parse(request.init.body).model, "openai/gpt-4o-mini");
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

test("normalises OpenAI-compatible string content", () => {
  assert.equal(extractGatewayText({ choices: [{ message: { content: "  Hello NEAS  " } }] }), "Hello NEAS");
});

test("normalises multipart OpenAI-compatible content", () => {
  assert.equal(extractGatewayText({ choices: [{ message: { content: [{ type: "text", text: "Hello" }, { type: "text", text: "NEAS" }] } }] }), "Hello\nNEAS");
});

test("normalises Responses API output_text and output content", () => {
  assert.equal(extractGatewayText({ output_text: "Ready" }), "Ready");
  assert.equal(extractGatewayText({ output: [{ content: [{ type: "output_text", text: "Gateway ready" }] }] }), "Gateway ready");
});

test("normalises Gemini candidate text parts", () => {
  assert.equal(extractGatewayText({ candidates: [{ content: { parts: [{ text: "Gemini output" }] } }] }), "Gemini output");
});

test("returns a diagnostic reference when a successful response has no recognised text", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => new Response(JSON.stringify({ id: "req-neas-123", choices: [{ message: { content: "" }, finish_reason: "length" }] }), {
      status: 200,
      headers: { "content-type": "application/json", "x-request-id": "req-neas-123" },
    }),
  });
  assert.equal("error" in result, true);
  if ("error" in result) {
    assert.match(result.error, /successful response but no recognised text content/i);
    assert.match(result.error, /length/);
    assert.match(result.error, /req-neas-123/);
  }
});

test("routes specialist and outreach work through the budgeted project Gateway", () => {
  assert.equal(usesProjectAIGateway("specialist"), true);
  assert.equal(usesProjectAIGateway("outreach"), true);
});

test("does not force unrelated marketing tasks onto the AI Workforce Gateway", () => {
  for (const task of ["caption", "seo", "facebook", "campaign"]) assert.equal(usesProjectAIGateway(task), false);
});
