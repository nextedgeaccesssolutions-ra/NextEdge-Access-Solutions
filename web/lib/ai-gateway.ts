export const DEFAULT_AI_GATEWAY_MODEL = "openai/gpt-4o-mini";
export const FREE_OPENROUTER_MODEL = "openrouter/free";
export const FREE_GEMINI_MODEL = "gemini-3.8-flash";
export const GROQ_MODEL = "openai/gpt-oss-120b";
export const XAI_GROK_MODEL = "grok-4.7";

export function usesProjectAIGateway(task: string): boolean {
  return task === "specialist" || task === "outreach" || task === "voice";
}

export type AIGatewayResult = { text: string; model: string } | { error: string };
type Provider = "openrouter" | "gemini" | "groq" | "xai" | "vercel";
type UnknownRecord = Record<string, unknown>;
const record = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;

function collectText(value: unknown, depth = 0): string {
  if (depth > 6 || value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map((part) => collectText(part, depth + 1)).filter(Boolean).join("\n");
  const item = record(value);
  if (!item) return "";
  for (const key of ["text", "output_text", "content", "parts"]) {
    const candidate = item[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
    if (Array.isArray(candidate) || record(candidate)) {
      const nested = collectText(candidate, depth + 1);
      if (nested.trim()) return nested;
    }
  }
  return "";
}

/** Extract user-facing answer text only; never substitute private reasoning for an answer. */
export function extractGatewayText(payload: unknown): string {
  const root = record(payload);
  if (!root) return "";
  if (typeof root.output_text === "string" && root.output_text.trim()) return root.output_text.trim();
  const choices = Array.isArray(root.choices) ? root.choices : [];
  for (const choice of choices) {
    const item = record(choice);
    const message = record(item?.message);
    const delta = record(item?.delta);
    const content = collectText(message?.content ?? message?.output_text ?? item?.text ?? delta?.content);
    if (content.trim()) return content.trim();
  }
  const output = Array.isArray(root.output) ? root.output : [];
  for (const entry of output) {
    const item = record(entry);
    const content = collectText(item?.content ?? item?.text);
    if (content.trim()) return content.trim();
  }
  const content = collectText(root.content);
  if (content.trim()) return content.trim();
  const candidates = Array.isArray(root.candidates) ? root.candidates : [];
  for (const candidate of candidates) {
    const item = record(candidate);
    const message = record(item?.content);
    const parts = collectText(message?.parts);
    if (parts.trim()) return parts.trim();
  }
  return "";
}

async function generateProviderText(
  provider: Exclude<Provider, "vercel">,
  input: { system: string; user: string },
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<AIGatewayResult> {
  const isOpenRouter = provider === "openrouter";
  const isGemini = provider === "gemini";
  const isGroq = provider === "groq";
  const url = isOpenRouter
    ? "https://openrouter.ai/api/v1/chat/completions"
    : isGemini
      ? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
      : isGroq
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.x.ai/v1/chat/completions";
  const model = isOpenRouter ? FREE_OPENROUTER_MODEL : isGemini ? FREE_GEMINI_MODEL : isGroq ? GROQ_MODEL : XAI_GROK_MODEL;
  const providerName = isOpenRouter ? "OpenRouter" : isGemini ? "Gemini" : isGroq ? "Groq" : "xAI Grok";
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
        ...(isOpenRouter ? { "http-referer": process.env.SITE_URL || "https://www.nextedge-access-solutions.com", "x-title": "NEAS AI Workforce" } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
        max_tokens: 1600,
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const payload = await response.json().catch(() => ({})) as UnknownRecord;
    if (!response.ok) {
      const errorObject = record(payload.error);
      if (response.status === 401 || response.status === 403) return { error: `${providerName} rejected the server-side API key. Verify the key in Vercel environment variables.` };
      if (response.status === 402) return { error: `${providerName} account credits or quota are exhausted.` };
      if (response.status === 429) return { error: `${providerName} rate limit or account quota reached.` };
      return { error: `${providerName} inference failed (${response.status}): ${String(errorObject?.message ?? "provider request failed").slice(0, 180)}` };
    }
    const text = extractGatewayText(payload);
    return text
      ? { text, model: `${provider}:${model}` }
      : { error: `${providerName} returned no usable answer text. No response was saved.` };
  } catch {
    return { error: `Could not reach the configured ${provider} API or the request timed out. No alternate provider was used.` };
  }
}

/** Classifies an OpenRouter failure as one the configured Groq fallback should
 *  carry, returning a short reason for the surfaced model label, or null to let
 *  the original error stand.
 *
 *  Capacity, quota and routing failures qualify. That includes the 404 OpenRouter
 *  returns when every endpoint for a model is filtered out by the account's
 *  data-policy or guardrail settings ("0 endpoints out of N requested are
 *  available"). That condition is persistent rather than transient, and it
 *  previously failed the whole call — so specialist, outreach and voice inference
 *  broke while a healthy Groq fallback sat configured and unused.
 *
 *  A rejected API key deliberately does not qualify. That is a configuration
 *  fault an administrator needs to see and fix, not one to mask behind a silent
 *  provider switch. A timeout does not qualify either: the provider timeout is
 *  45s and the calling routes cap at 60s, so a second attempt would exceed the
 *  function budget and fail anyway. */
export function openRouterFailoverReason(error: string): string | null {
  if (/rejected the server-side API key/i.test(error)) return null;
  if (/rate limit|account quota|credits or quota are exhausted/i.test(error)) return "OpenRouter quota";
  if (/endpoints out of|no endpoints|data policy|guardrail/i.test(error)) return "OpenRouter had no eligible endpoints";
  if (/inference failed \((?:404|409|5\d\d)\)/i.test(error)) return "OpenRouter failure";
  return null;
}

export async function generateAIGatewayText(
  input: { system: string; user: string },
  options: {
    token?: string;
    request?: Request;
    apiKey?: string;
    model?: string;
    provider?: Provider;
    providerApiKey?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<AIGatewayResult> {
  const configuredProvider = options.provider ?? (process.env.NEAS_AI_PROVIDER?.trim() || (process.env.OPENROUTER_API_KEY?.trim() ? "openrouter" : "vercel"));
  if (!["openrouter", "gemini", "groq", "xai", "vercel"].includes(configuredProvider)) {
    return { error: "NEAS_AI_PROVIDER must be set to openrouter, gemini, groq, xai or vercel. No inference request was sent." };
  }
  const provider = configuredProvider as Provider;
  const fetchImpl = options.fetchImpl ?? fetch;

  if (provider !== "vercel") {
    const keyName = provider === "openrouter" ? "OPENROUTER_API_KEY"
      : provider === "gemini" ? "GEMINI_API_KEY"
      : provider === "groq" ? "GROQ_API_KEY" : "XAI_API_KEY";
    const apiKey = (options.providerApiKey ?? process.env[keyName] ?? "").trim();
    if (!apiKey) {
      return { error: `NEAS AI provider is set to ${provider}, but ${keyName} is missing. Add the key as a Vercel server-side environment variable. No provider fallback was used.` };
    }
    // Direct provider billing is separate from the Vercel project budget. OpenRouter failover is limited to the explicitly configured Groq key; it never falls back from Vercel OIDC or changes the selected provider for other errors.
    const primary = await generateProviderText(provider, input, apiKey, fetchImpl);
    if (provider === "openrouter" && "error" in primary) {
      const failoverReason = openRouterFailoverReason(primary.error);
      if (failoverReason) {
        const groqKey = (process.env.GROQ_API_KEY ?? "").trim();
        if (!groqKey) return { error: `${primary.error} Automatic Groq fallback is not configured because GROQ_API_KEY is missing.` };
        const fallback = await generateProviderText("groq", input, groqKey, fetchImpl);
        if (!("error" in fallback)) return { ...fallback, model: `${fallback.model} (automatic fallback after ${failoverReason})` };
        return { error: `${primary.error} Groq fallback also failed: ${fallback.error}` };
      }
    }
    return primary;
  }

  // Vercel Functions expose the deployment OIDC token on the incoming Request.
  const token = options.token ?? options.request?.headers.get("x-vercel-oidc-token") ?? process.env.VERCEL_OIDC_TOKEN;
  const apiKey = options.apiKey ?? process.env.AI_GATEWAY_API_KEY;
  const model = options.model ?? DEFAULT_AI_GATEWAY_MODEL;

  // Static Gateway keys are intentionally rejected so the project OIDC budget remains enforceable.
  if (apiKey) {
    return { error: "NEAS AI Gateway is configured for project OIDC billing. Remove AI_GATEWAY_API_KEY so the monthly project budget can enforce its limit." };
  }
  if (!token) {
    return { error: "NEAS AI Gateway is not available in this runtime: the Vercel project OIDC token is missing. No direct-provider fallback was attempted because it would bypass the approved project budget." };
  }

  try {
    const response = await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
        max_tokens: 4000,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    const payload = await response.json().catch(() => ({})) as UnknownRecord;
    if (!response.ok) {
      const errorObject = record(payload.error);
      if (response.status === 402) return { error: "NEAS AI Gateway rejected the request because the monthly project budget or available Gateway credits are exhausted. No alternate provider was used." };
      if (response.status === 401 || response.status === 403) return { error: "NEAS AI Gateway rejected Vercel project authentication. Verify AI Gateway access and OIDC federation for this Vercel project." };
      if (response.status === 429) return { error: "NEAS AI Gateway rate limit reached. Please retry later; no alternate provider was used." };
      return { error: "NEAS AI Gateway request failed (" + response.status + "): " + String(errorObject?.message ?? "Gateway request failed").slice(0, 240) };
    }
    const text = extractGatewayText(payload);
    if (text) return { text, model };
    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const firstChoice = record(choices[0]);
    const finishReason = String(firstChoice?.finish_reason ?? "not supplied").slice(0, 60);
    const usage = record(payload.usage);
    const completionDetails = record(usage?.completion_tokens_details ?? usage?.output_tokens_details);
    const reasoningTokens = Number(completionDetails?.reasoning_tokens ?? 0);
    const tokenDiagnostic = Number.isFinite(reasoningTokens) && reasoningTokens > 0 ? "; reasoning tokens: " + reasoningTokens : "";
    const requestId = String(response.headers.get("x-request-id") ?? payload.id ?? "not supplied").slice(0, 100);
    return { error: "NEAS AI Gateway returned a successful response but no recognised text content (finish reason: " + finishReason + "; request: " + requestId + tokenDiagnostic + "). The response was not saved. Please retry or inspect the Gateway response format." };
  } catch {
    return { error: "Could not reach NEAS AI Gateway or the request timed out. No alternate provider was used." };
  }
}
