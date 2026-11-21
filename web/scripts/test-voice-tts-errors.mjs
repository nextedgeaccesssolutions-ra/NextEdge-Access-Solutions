import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOpenRouterTtsPayload,
  parseProviderDetail,
  providerErrorMessage,
  resolveOpenRouterTtsModel,
} from "../lib/voice-tts-errors.ts";

// The regression this file exists for: 402 and 429 were once one message, which made a
// rate limit read as an empty balance and sent a live investigation down the wrong path.
test("OpenRouter 402 and 429 are distinguishable", () => {
  const payment = providerErrorMessage("OpenRouter", 402);
  const rateLimit = providerErrorMessage("OpenRouter", 429);

  assert.notEqual(payment, rateLimit);
  assert.match(payment, /402/);
  assert.match(rateLimit, /429/);
  assert.match(payment, /balance/i);
  assert.match(rateLimit, /rate limit/i);
  assert.doesNotMatch(payment, /rate limit/i);
});

test("OpenRouter 429 names the model in use and the real caps", () => {
  const message = providerErrorMessage("OpenRouter", 429, "", "fish-audio/s2.1-pro-free:free");

  assert.match(message, /fish-audio\\/s2\\.1-pro-free:free/);
  assert.match(message, /20 requests per minute/);
  assert.match(message, /50 per day/);
  assert.match(message, /1000/);
  assert.match(message, /OPENROUTER_TTS_MODEL/);
});

test("OpenRouter 429 omits the model clause when no model is known", () => {
  const message = providerErrorMessage("OpenRouter", 429);

  assert.doesNotMatch(message, /on model\\s*\\./);
  assert.match(message, /^OpenRouter rate limit reached \\(429\\)\\./);
});

test("OpenRouter fallback requires an explicit model configuration", () => {
  assert.equal(resolveOpenRouterTtsModel(undefined), null);
  assert.equal(resolveOpenRouterTtsModel("   "), null);
  assert.equal(resolveOpenRouterTtsModel("  provider/model  "), "provider/model");
});

test("OpenRouter TTS requests always enforce request-level ZDR", () => {
  assert.deepEqual(buildOpenRouterTtsPayload("provider/model", "hello"), {
    model: "provider/model",
    input: "hello",
    response_format: "mp3",
    provider: { zdr: true },
  });
});

test("ElevenLabs statuses name the credential and the fix without suggesting unapproved rotation", () => {
  assert.match(providerErrorMessage("ElevenLabs", 401), /ELEVENLABS_API_KEY/);
  assert.match(providerErrorMessage("ElevenLabs", 401), /approved credential-change process/);
  assert.match(providerErrorMessage("ElevenLabs", 402), /credits/i);
  assert.match(providerErrorMessage("ElevenLabs", 403), /permissions/i);
  assert.match(providerErrorMessage("ElevenLabs", 429), /rate or concurrency/i);
});

test("an unmapped status falls back to the raw HTTP code", () => {
  assert.equal(providerErrorMessage("OpenRouter", 500), "OpenRouter returned HTTP 500.");
  assert.equal(providerErrorMessage("ElevenLabs", 503), "ElevenLabs returned HTTP 503.");
});

test("upstream detail is appended where it helps and withheld where it does not", () => {
  assert.match(providerErrorMessage("OpenRouter", 402, "insufficient_quota"), /insufficient_quota$/);
  assert.match(providerErrorMessage("OpenRouter", 429, "slow down"), /slow down$/);
  assert.match(providerErrorMessage("OpenRouter", 500, "boom"), /boom$/);
  assert.doesNotMatch(providerErrorMessage("OpenRouter", 401, "bad key"), /bad key/);
  assert.doesNotMatch(providerErrorMessage("ElevenLabs", 401, "bad key"), /bad key/);
});

test("no trailing separator when there is no detail", () => {
  assert.doesNotMatch(providerErrorMessage("OpenRouter", 402), /\\s$/);
  assert.doesNotMatch(providerErrorMessage("OpenRouter", 500), /\\s$/);
});

test("parseProviderDetail reads the common provider body shapes", () => {
  assert.equal(parseProviderDetail(JSON.stringify({ detail: { message: "first" }, error: { message: "second" } })), "first");
  assert.equal(parseProviderDetail(JSON.stringify({ error: { message: "second" } })), "second");
  assert.equal(parseProviderDetail(JSON.stringify({ message: "third" })), "third");
  assert.equal(parseProviderDetail(JSON.stringify({ detail: { code: "fourth" } })), "fourth");
});

test("parseProviderDetail yields an empty string rather than the word undefined", () => {
  assert.equal(parseProviderDetail("{}"), "");
  assert.equal(parseProviderDetail("null"), "");
  assert.equal(parseProviderDetail(""), "");
});

test("parseProviderDetail falls back to raw text and caps its length", () => {
  assert.equal(parseProviderDetail("<html>gateway timeout</html>"), "<html>gateway timeout</html>");
  assert.equal(parseProviderDetail("x".repeat(500)).length, 240);
});
