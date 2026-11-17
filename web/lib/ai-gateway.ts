export const DEFAULT_AI_GATEWAY_MODEL = "recursive/flint-v1.0";

export type AIGatewayResult = { text: string; model: string } | { error: string };

type GatewayPayload = {
  id?: string;
  model?: string;
  output_text?: unknown;
  choices?: Array<{ finish_reason?: string | null; message?: { content?: unknown; refusal?: string } }>;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string; type?: string };
};

function extractGatewayText(payload: GatewayPayload): string {
  if (typeof payload.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content.trim();
  if (Array.isArray(content)) {
    const parts = content.filter((part): part is { text?: string } => !!part && typeof part === "object")
      .map((part) => typeof part.text === "string" ? part.text : "").filter(Boolean);
    if (parts.length) return parts.join("\n").trim();
  }
  const refusal = payload.choices?.[0]?.message?.refusal;
  if (typeof refusal === "string" && refusal.trim()) return refusal.trim();
  if (Array.isArray(payload.output)) {
    const parts = payload.output.flatMap((item) => Array.isArray(item.content) ? item.content.map((part) => typeof part.text === "string" ? part.text : "") : []).filter(Boolean);
    if (parts.length) return parts.join("\n").trim();
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

    const payload = await response.json().catch(() => ({})) as GatewayPayload;

    if (!response.ok) {
      if (response.status === 402) {
        return { error: "NEAS AI Gateway rejected the request because the monthly project budget or available Gateway credits are exhausted. No alternate provider was used." };
      }
      if (response.status === 401 || response.status === 403) {
        return { error: "NEAS AI Gateway rejected Vercel project authentication. Verify AI Gateway access and OIDC federation for this Vercel project." };
      }
      if (response.status === 429) {
        return { error: "NEAS AI Gateway rate limit reached. Please retry later; no alternate provider was used." };
      }
      const detail = String(payload.error?.message ?? "Gateway request failed").slice(0, 240);
      return { error: `NEAS AI Gateway request failed (${response.status}): ${detail}` };
    }

    const text = extractGatewayText(payload);
    if (text) return { text, model: payload.model || model };

    // Safe response metadata makes empty completions diagnosable without
    // logging prompts, OIDC tokens, or other sensitive data.
    const finishReason = payload.choices?.[0]?.finish_reason || "not-provided";
    const responseId = payload.id ? ", response_id=" + payload.id.slice(0, 80) : "";
    return {
      error: "NEAS AI Gateway returned an empty completion (finish_reason=" + finishReason + responseId + "). The request reached the Gateway, but the model supplied no text. No unbudgeted provider fallback was attempted.",
    };
  } catch {
    return { error: "Could not reach NEAS AI Gateway or the request timed out. No alternate provider was used." };
  }
}
