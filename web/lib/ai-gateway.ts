export const DEFAULT_AI_GATEWAY_MODEL = "recursive/flint-v1.0";

export function usesProjectAIGateway(task: string): boolean {
  return task === "specialist" || task === "outreach";
}

export type AIGatewayResult = { text: string; model: string } | { error: string };

type UnknownRecord = Record<string, unknown>;
const record = (value: unknown): UnknownRecord | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;

function collectText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (typeof part === "string") return part;
    const item = record(part);
    if (!item) return "";
    if (typeof item.text === "string") return item.text;
    if (typeof item.output_text === "string") return item.output_text;
    return "";
  }).filter(Boolean).join("\n");
}

/** Normalise common OpenAI-compatible, Responses, and Gemini text response envelopes. */
export function extractGatewayText(payload: unknown): string {
  const root = record(payload);
  if (!root) return "";
  if (typeof root.output_text === "string" && root.output_text.trim()) return root.output_text.trim();
  const choices = Array.isArray(root.choices) ? root.choices : [];
  for (const choice of choices) {
    const item = record(choice);
    const message = record(item?.message);
    const content = collectText(message?.content ?? item?.text);
    if (content.trim()) return content.trim();
    const refusal = record(message?.refusal);
    if (typeof message?.refusal === "string" && message.refusal.trim()) return message.refusal.trim();
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

export async function generateAIGatewayText(
  input: { system: string; user: string },
  options: {
    token?: string;
    request?: Request;
    apiKey?: string;
    model?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<AIGatewayResult> {
  // Vercel Functions expose the deployment OIDC token on the incoming Request,
  // not as a process environment variable. Keep env lookup for build/local use.
  const token = options.token ?? options.request?.headers.get("x-vercel-oidc-token") ?? process.env.VERCEL_OIDC_TOKEN;
  const apiKey = options.apiKey ?? process.env.AI_GATEWAY_API_KEY;
  const model = options.model ?? DEFAULT_AI_GATEWAY_MODEL;

  // The NEAS $10 monthly cap is a project OIDC budget. Static API keys and
  // BYOK credentials are attributed elsewhere and would bypass this project cap.
  if (apiKey) {
    return { error: "NEAS AI Gateway is configured for project OIDC billing. Remove AI_GATEWAY_API_KEY so the monthly project budget can enforce its limit." };
  }
  if (!token) {
    return { error: "NEAS AI Gateway is not available in this runtime: the Vercel project OIDC token is missing. No direct-provider fallback was attempted because it would bypass the approved project budget." };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(45_000),
    });

    const payload = await response.json().catch(() => ({})) as UnknownRecord;

    if (!response.ok) {
      const errorObject = record(payload.error);
      if (response.status === 402) return { error: "NEAS AI Gateway rejected the request because the monthly project budget or available Gateway credits are exhausted. No alternate provider was used." };
      if (response.status === 401 || response.status === 403) return { error: "NEAS AI Gateway rejected Vercel project authentication. Verify AI Gateway access and OIDC federation for this Vercel project." };
      if (response.status === 429) return { error: "NEAS AI Gateway rate limit reached. Please retry later; no alternate provider was used." };
      const detail = String(errorObject?.message ?? "Gateway request failed").slice(0, 240);
      return { error: "NEAS AI Gateway request failed (" + response.status + "): " + detail };
    }

    const text = extractGatewayText(payload);
    if (text) return { text, model };

    const choices = Array.isArray(payload.choices) ? payload.choices : [];
    const firstChoice = record(choices[0]);
    const finishReason = String(firstChoice?.finish_reason ?? "not supplied").slice(0, 60);
    const requestId = String(response.headers.get("x-request-id") ?? payload.id ?? "not supplied").slice(0, 100);
    return { error: "NEAS AI Gateway returned a successful response but no recognised text content (finish reason: " + finishReason + "; request: " + requestId + "). The response was not saved. Please retry or inspect the Gateway response format." };
  } catch {
    return { error: "Could not reach NEAS AI Gateway or the request timed out. No alternate provider was used." };
  }
}
