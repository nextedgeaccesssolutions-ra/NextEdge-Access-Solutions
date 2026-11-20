import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_AI_GATEWAY_MODEL, clearRegistryRouteCache, extractGatewayText, generateAIGatewayText, mapRegistryProvider, openRouterFailoverReason, selectRegistryRoute, usesProjectAIGateway } from "../lib/ai-gateway.ts";

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

test("retries one short Vercel Gateway 429 and returns the recovered answer", async () => {
  let calls = 0;
  const result = await generateAIGatewayText({ system: "NEAS", user: "Hello" }, {
    token: "oidc",
    fetchImpl: async () => {
      calls++;
      if (calls === 1) return new Response(JSON.stringify({ error: { message: "rate limited" } }), {
        status: 429, headers: { "retry-after": "0" },
      });
      return new Response(JSON.stringify({ choices: [{ message: { content: "Recovered after retry" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "Recovered after retry", model: DEFAULT_AI_GATEWAY_MODEL });
  assert.equal(calls, 2);
});

test("keeps a persistent Vercel Gateway 429 visible after one bounded retry", async () => {
  let calls = 0;
  const result = await generateAIGatewayText({ system: "NEAS", user: "Hello" }, {
    token: "oidc",
    fetchImpl: async () => {
      calls++;
      return new Response(JSON.stringify({ error: { message: "rate limited" } }), {
        status: 429, headers: { "retry-after": "0" },
      });
    },
  });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /rate limit reached/i);
  assert.equal(calls, 2);
});

test("supports a shorter output budget for live voice turns", async () => {
  let request;
  const result = await generateAIGatewayText({ system: "NEAS", user: "Hello" }, {
    token: "oidc",
    maxTokens: 1200,
    fetchImpl: async (_url, init) => {
      request = JSON.parse(init.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: "Short voice answer" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "Short voice answer", model: DEFAULT_AI_GATEWAY_MODEL });
  assert.equal(request.max_tokens, 1200);
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

test("treats an empty provider setting without an OpenRouter key as the budgeted Vercel Gateway default", async () => {
  const previous = process.env.NEAS_AI_PROVIDER;
  const previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
  process.env.NEAS_AI_PROVIDER = "";
  process.env.OPENROUTER_API_KEY = "";
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
    if (previousOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousOpenRouterKey;
  }
});

test("automatically selects OpenRouter free routing when a server-side key exists and no provider is pinned", async () => {
  const previous = process.env.NEAS_AI_PROVIDER;
  const previousOpenRouterKey = process.env.OPENROUTER_API_KEY;
  process.env.NEAS_AI_PROVIDER = "";
  process.env.OPENROUTER_API_KEY = "test-openrouter-key";
  try {
    const result = await generateAIGatewayText({ system: "NEAS", user: "Hello" }, {
      fetchImpl: async (url, init) => {
        assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
        assert.equal(init.headers.authorization, "Bearer test-openrouter-key");
        assert.equal(JSON.parse(init.body).model, "openrouter/free");
        return new Response(JSON.stringify({ choices: [{ message: { content: "Free-first NEAS response" } }] }), { status: 200 });
      },
    });
    assert.deepEqual(result, { text: "Free-first NEAS response", model: "openrouter:openrouter/free" });
  } finally {
    if (previous === undefined) delete process.env.NEAS_AI_PROVIDER;
    else process.env.NEAS_AI_PROVIDER = previous;
    if (previousOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousOpenRouterKey;
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

test("switches to Groq when OpenRouter has no endpoints left under its data policy", async () => {
  // Observed in production: every endpoint for the routed model is filtered out
  // by the account data policy, so OpenRouter answers 404. This is persistent,
  // not transient, and it used to fail the whole call despite a healthy fallback.
  const previous = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-groq-fallback-key";
  const calls = [];
  try {
    const result = await generateAIGatewayText({ system: "NEAS", user: "Speak as the CEO" }, {
      provider: "openrouter",
      providerApiKey: "test-openrouter-key",
      fetchImpl: async (url, init) => {
        calls.push({ url, body: JSON.parse(init.body) });
        if (url.includes("openrouter.ai")) {
          return new Response(JSON.stringify({
            error: { message: "0 endpoints out of 10 requested are available matching your guardrail restrictions and data policy." },
          }), { status: 404 });
        }
        return new Response(JSON.stringify({ choices: [{ message: { content: "Groq carried the call" } }] }), { status: 200 });
      },
    });
    assert.deepEqual(result, {
      text: "Groq carried the call",
      model: "groq:openai/gpt-oss-120b (automatic fallback after OpenRouter had no eligible endpoints)",
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].body.model, "openai/gpt-oss-120b");
  } finally {
    if (previous === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = previous;
  }
});

test("reports the OpenRouter no-endpoint failure when Groq is not configured", async () => {
  const previous = process.env.GROQ_API_KEY;
  delete process.env.GROQ_API_KEY;
  try {
    const result = await generateAIGatewayText({ system: "s", user: "u" }, {
      provider: "openrouter",
      providerApiKey: "test-openrouter-key",
      fetchImpl: async () => new Response(JSON.stringify({
        error: { message: "0 endpoints out of 10 requested are available matching your guardrail restrictions and data policy." },
      }), { status: 404 }),
    });
    assert.equal("error" in result, true);
    if ("error" in result) {
      assert.match(result.error, /endpoints out of 10/);
      assert.match(result.error, /GROQ_API_KEY is missing/);
    }
  } finally {
    if (previous !== undefined) process.env.GROQ_API_KEY = previous;
  }
});

test("classifies which OpenRouter failures may switch providers", () => {
  assert.equal(openRouterFailoverReason("openrouter rate limit or account quota reached."), "OpenRouter quota");
  assert.equal(openRouterFailoverReason("openrouter account credits or quota are exhausted."), "OpenRouter quota");
  assert.equal(
    openRouterFailoverReason("openrouter inference failed (404): 0 endpoints out of 10 requested are available matching your guardrail restrictions and data policy."),
    "OpenRouter had no eligible endpoints",
  );
  assert.equal(openRouterFailoverReason("openrouter inference failed (503): upstream unavailable"), "OpenRouter failure");
  // A bad key must stay visible rather than be masked by a provider switch.
  assert.equal(openRouterFailoverReason("openrouter rejected the server-side API key. Verify the key in Vercel environment variables."), null);
  // A timeout must not burn a second attempt inside the function budget.
  assert.equal(openRouterFailoverReason("Could not reach the configured openrouter API or the request timed out. No alternate provider was used."), null);
  assert.equal(openRouterFailoverReason("openrouter returned no usable answer text. No response was saved."), null);
});

test("maps registry provider names onto runtimes that exist", () => {
  assert.equal(mapRegistryProvider("vercel-ai-gateway"), "vercel");
  assert.equal(mapRegistryProvider("VERCEL-AI-GATEWAY"), "vercel");
  assert.equal(mapRegistryProvider("openrouter"), "openrouter");
  assert.equal(mapRegistryProvider("google"), "gemini");
  assert.equal(mapRegistryProvider("grok"), "xai");
  // No implementation exists for these, so they must never be selected or enabled.
  assert.equal(mapRegistryProvider("omniroute"), null);
  assert.equal(mapRegistryProvider("ollama"), null);
  assert.equal(mapRegistryProvider(""), null);
  assert.equal(mapRegistryProvider(undefined), null);
  // Must not inherit anything from Object.prototype.
  assert.equal(mapRegistryProvider("constructor"), null);
  assert.equal(mapRegistryProvider("toString"), null);
});

test("route selection resolves to null when the registry cannot be read", async () => {
  clearRegistryRouteCache();
  // No Supabase key is configured under test, so the lookup throws internally.
  // Routing must never fail because of that: it falls back to env configuration.
  assert.equal(await selectRegistryRoute(), null);
  clearRegistryRouteCache();
});

test("an unreadable registry still leaves the Vercel Gateway default in charge", async () => {
  clearRegistryRouteCache();
  const previousProvider = process.env.NEAS_AI_PROVIDER;
  const previousOpenRouter = process.env.OPENROUTER_API_KEY;
  delete process.env.NEAS_AI_PROVIDER;
  delete process.env.OPENROUTER_API_KEY;
  try {
    let sentModel;
    const result = await generateAIGatewayText({ system: "s", user: "u" }, {
      token: "oidc",
      fetchImpl: async (url, init) => {
        sentModel = JSON.parse(init.body).model;
        return new Response(JSON.stringify({ choices: [{ message: { content: "ok" } }] }), { status: 200 });
      },
    });
    assert.deepEqual(result, { text: "ok", model: DEFAULT_AI_GATEWAY_MODEL });
    assert.equal(sentModel, DEFAULT_AI_GATEWAY_MODEL);
  } finally {
    if (previousProvider === undefined) delete process.env.NEAS_AI_PROVIDER;
    else process.env.NEAS_AI_PROVIDER = previousProvider;
    if (previousOpenRouter === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousOpenRouter;
    clearRegistryRouteCache();
  }
});

test("an explicit provider and model bypass the registry entirely", async () => {
  let sent;
  const result = await generateAIGatewayText({ system: "s", user: "u" }, {
    provider: "groq",
    providerApiKey: "test-groq-key",
    model: "ignored-for-direct-providers",
    fetchImpl: async (url, init) => {
      sent = { url, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ choices: [{ message: { content: "direct" } }] }), { status: 200 });
    },
  });
  assert.deepEqual(result, { text: "direct", model: "groq:openai/gpt-oss-120b" });
  assert.equal(sent.url, "https://api.groq.com/openai/v1/chat/completions");
});

test("an enabled registry route decides the provider and model", async () => {
  clearRegistryRouteCache();
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  const previousProvider = process.env.NEAS_AI_PROVIDER;
  process.env.SUPABASE_SECRET_KEY = "test-supabase-key";
  // Env says OpenRouter; the registry must win and route to the Vercel Gateway.
  process.env.NEAS_AI_PROVIDER = "openrouter";
  const urls = [];
  try {
    let sentModel;
    const result = await generateAIGatewayText({ system: "s", user: "u" }, {
      token: "oidc",
      fetchImpl: async (url, init) => {
        urls.push(String(url));
        if (String(url).includes("/rest/v1/aiw_model_routes")) {
          return new Response(JSON.stringify([
            { route_name: "neas-vercel-ai-gateway", provider: "vercel-ai-gateway", model: "openai/gpt-4o-mini", priority: 1 },
          ]), { status: 200 });
        }
        sentModel = JSON.parse(init.body).model;
        return new Response(JSON.stringify({ choices: [{ message: { content: "routed" } }] }), { status: 200 });
      },
    });
    assert.deepEqual(result, { text: "routed", model: "openai/gpt-4o-mini" });
    assert.equal(sentModel, "openai/gpt-4o-mini");
    assert.equal(urls.some((u) => u.includes("aiw_model_routes")), true);
    assert.equal(urls.some((u) => u.includes("ai-gateway.vercel.sh")), true);
    // The env provider was openrouter; the registry overrode it.
    assert.equal(urls.some((u) => u.includes("openrouter.ai")), false);
  } finally {
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
    if (previousProvider === undefined) delete process.env.NEAS_AI_PROVIDER;
    else process.env.NEAS_AI_PROVIDER = previousProvider;
    clearRegistryRouteCache();
  }
});

test("a registry holding only unimplemented providers leaves env in charge", async () => {
  clearRegistryRouteCache();
  const previousKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_SECRET_KEY = "test-supabase-key";
  try {
    const selection = await selectRegistryRoute(Date.now(), async () => new Response(JSON.stringify([
      { route_name: "neas-omniroute", provider: "omniroute", model: "provider/model", priority: 1 },
      { route_name: "neas-ollama-local", provider: "ollama", model: "local-model", priority: 2 },
    ]), { status: 200 }));
    assert.equal(selection, null);
  } finally {
    if (previousKey === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = previousKey;
    clearRegistryRouteCache();
  }
});
