import assert from "node:assert/strict";
import test from "node:test";
import { generateGatewayText } from "../lib/ai-gateway.ts";

test("fails closed when the request has no Gateway token", async () => {
  const result = await generateGatewayText({ system: "system", user: "hello" });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /authentication is unavailable/i);
});

test("sends a bounded request and returns generated text", async () => {
  let request;
  const result = await generateGatewayText({ token: "test-token", system: "NEAS specialist", user: "Prepare a short work order.", fetcher: async (_url, init) => {
    request = init;
    return new Response(JSON.stringify({ choices: [{ message: { content: "NEAS draft output" } }] }), { status: 200 });
  }});
  assert.deepEqual(result, { text: "NEAS draft output" });
  assert.equal(new Headers(request?.headers).get("authorization"), "Bearer test-token");
  const body = JSON.parse(String(request?.body));
  assert.equal(body.model, "anthropic/claude-sonnet-5.5");
  assert.equal(body.max_tokens, 3000);
  assert.equal(body.stream, false);
});

test("supports configured models and text content blocks", async () => {
  const result = await generateGatewayText({ token: "test-token", model: "anthropic/claude-sonnet-5", system: "system", user: "hello", fetcher: async (_url, init) => {
    assert.equal(JSON.parse(String(init?.body)).model, "anthropic/claude-sonnet-5");
    return new Response(JSON.stringify({ choices: [{ message: { content: [{ type: "text", text: "First" }, { type: "text", text: "Second" }] } }] }), { status: 200 });
  }});
  assert.deepEqual(result, { text: "First\nSecond" });
});

test("maps budget exhaustion to a safe actionable message", async () => {
  const result = await generateGatewayText({ token: "test-token", system: "system", user: "hello", fetcher: async () => new Response("{}", { status: 402 }) });
  assert.equal("error" in result, true);
  if ("error" in result) assert.match(result.error, /monthly budget or credit limit/i);
});

test("does not expose provider diagnostics or credentials on errors", async () => {
  const result = await generateGatewayText({ token: "sensitive-test-token", system: "system", user: "hello", fetcher: async () => new Response(JSON.stringify({ error: "private provider diagnostic" }), { status: 500 }) });
  assert.equal("error" in result, true);
  if ("error" in result) {
    assert.doesNotMatch(result.error, /private provider diagnostic|sensitive-test-token/i);
    assert.match(result.error, /500/);
  }
});
