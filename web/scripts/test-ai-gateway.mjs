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
  assert.equal(JSON.parse(request.init.body).max_tokens, 4000);
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

test("normalises nested content objects and streamed delta text", () => {
  assert.equal(extractGatewayText({ choices: [{ message: { content: { type: "text", text: "Nested answer" } } }] }), "Nested answer");
  assert.equal(extractGatewayText({ choices: [{ delta: { content: [{ type: "text", text: "Streamed answer" }] } }] }), "Streamed answer");
});

test("does not mistake model reasoning for a user-facing answer", () => {
  assert.equal(extractGatewayText({ choices: [{ message: { reasoning_content: "private reasoning", content: "" } }] }), "");
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

test("reports a network failure without attempting a provider fallback", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => { throw new TypeError("fetch failed"); },
  });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /Could not reach NEAS AI Gateway/i);
});

test("includes safe reasoning-token diagnostics when answer content is empty", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    token: "oidc",
    fetchImpl: async () => new Response(JSON.stringify({
      id: "req-reasoning-123",
      choices: [{ message: { content: "" }, finish_reason: "length" }],
      usage: { completion_tokens_details: { reasoning_tokens: 1900 } },
    }), { status: 200, headers: { "x-request-id": "req-reasoning-123" } }),
  });
  assert.equal("error" in result, true);
  if ("error" in result) {
    assert.match(result.error, /reasoning tokens: 1900/);
    assert.match(result.error, /req-reasoning-123/);
  }
});

test("routes specialist, outreach and voice tasks through the configured AI runtime", () => {
  assert.equal(usesProjectAIGateway("specialist"), true);
  assert.equal(usesProjectAIGateway("outreach"), true);
  assert.equal(usesProjectAIGateway("voice"), true);
});

test("uses OpenRouter free routing without paid-provider fallback", async () => {
  let request;
  const result = await generateAIGatewayText({ system: "NEAS", user: "Hello" }, {
    provider: "openrouter",
    providerApiKey: "test-openrouter-key",
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: "Hello from free routing" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "Hello from free routing", model: "openrouter:openrouter/free" });
  assert.equal(request.url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(request.init.headers.authorization, "Bearer test-openrouter-key");
  assert.equal(JSON.parse(request.init.body).model, "openrouter/free");
});

test("automatically switches OpenRouter 429 quota failures to configured Groq", async () => {
  const previous = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-groq-fallback-key";
  const calls = [];
  try {
    const result = await generateAIGatewayText({ system: "NEAS", user: "Continue the voice session" }, {
      provider: "openrouter",
      providerApiKey: "test-openrouter-key",
      fetchImpl: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) });
        if (url.includes("openrouter.ai")) {
          return new Response(JSON.stringify({ error: { message: "rate limit reached" } }), { status: 429 });
        }
        return new Response(JSON.stringify({ choices: [{ message: { content: "Groq fallback response" } }] }), { status: 200 });
      },
    });
    assert.deepEqual(result, { text: "Groq fallback response", model: "groq:openai/gpt-oss-120b (automatic fallback after OpenRouter quota)" });
    assert.equal(calls.length, 2);
    assert.equal(calls[0].body.model, "openrouter/free");
    assert.equal(calls[1].body.model, "openai/gpt-oss-120b");
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  }
});

test("does not switch providers for OpenRouter authentication errors", async () => {
  const previous = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-groq-fallback-key";
  let calls = 0;
  try {
    const result = await generateAIGatewayText({ system: "s", user: "u" }, {
      provider: "openrouter",
      providerApiKey: "bad-openrouter-key",
      fetchImpl: async () => {
        calls++;
        return new Response("{}", { status: 401 });
      },
    });
    assert.equal("error" in result, true);
    assert.equal(calls, 1);
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  }
});

test("uses the Gemini free-tier model when explicitly selected", async () => {
  let request;
  const result = await generateAIGatewayText({ system: "NEAS", user: "Hello" }, {
    provider: "gemini",
    providerApiKey: "test-gemini-key",
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: "Hello from Gemini" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "Hello from Gemini", model: "gemini:gemini-3.8-flash" });
  assert.equal(request.url, "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
  assert.equal(JSON.parse(request.init.body).model, "gemini-3.8-flash");
});

test("uses Groq GPT-OSS inference only when explicitly selected", async () => {
  let request;
  const result = await generateAIGatewayText({ system: "NEAS", user: "Hello" }, {
    provider: "groq",
    providerApiKey: "test-groq-key",
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: "Hello from Groq" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "Hello from Groq", model: "groq:openai/gpt-oss-120b" });
  assert.equal(request.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(JSON.parse(request.init.body).model, "openai/gpt-oss-120b");
});

test("routes xAI Grok through its separate paid API endpoint only when explicitly selected", async () => {
  let request;
  const result = await generateAIGatewayText({ system: "NEAS", user: "Hello" }, {
    provider: "xai",
    providerApiKey: "test-xai-key",
    fetchImpl: async (url, init) => {
      request = { url, init };
      return new Response(JSON.stringify({ choices: [{ message: { content: "Hello from Grok" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "Hello from Grok", model: "xai:grok-4.7" });
  assert.equal(request.url, "https://api.x.ai/v1/chat/completions");
  assert.equal(JSON.parse(request.init.body).model, "grok-4.7");
});

test("treats an empty provider setting as the budgeted Vercel Gateway default", async () => {
  const previous = process.env.NEAS_AI_PROVIDER;
  process.env.NEAS_AI_PROVIDER = "";
  try {
    const result = await generateAIGatewayText({ system: "s", user: "u" }, {
      token: "test-project-oidc-token",
      fetchImpl: async (_url, init) => {
        assert.equal(init.headers.authorization, "Bearer test-project-oidc-token");
        return new Response(JSON.stringify({ choices: [{ message: { content: "budgeted gateway response" } }] }), { status: 200 });
      },
    });
    assert.deepEqual(result, { text: "budgeted gateway response", model: DEFAULT_AI_GATEWAY_MODEL });
  } finally {
    if (previous === undefined) delete process.env.NEAS_AI_PROVIDER;
    else process.env.NEAS_AI_PROVIDER = previous;
  }
});

test("does not silently fall back to paid inference when Groq has no key", async () => {
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    provider: "groq",
    providerApiKey: "",
    fetchImpl: async () => { throw new Error("must not call network"); },
  });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /GROQ_API_KEY is missing/i);
});

test("does not force unrelated marketing tasks onto the AI Workforce Gateway", () => {
  for (const task of ["caption", "seo", "facebook", "campaign"]) assert.equal(usesProjectAIGateway(task), false);
});
