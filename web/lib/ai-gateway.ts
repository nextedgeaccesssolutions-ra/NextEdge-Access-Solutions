export const DEFAULT_AI_GATEWAY_MODEL = "recursive/flint-v1.0";

export function usesProjectAIGateway(task: string): boolean {
  return task === "specialist" || task === "outreach";
}

export type AIGatewayResult = { text: string; model: string } | { error: string };

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
        // Flint spends part of its output budget on reasoning tokens; reserve room for the user-facing answer.
        max_tokens: 6000,
        reasoning: { effort: "minimal" },
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
