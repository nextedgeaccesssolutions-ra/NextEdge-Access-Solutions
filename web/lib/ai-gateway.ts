export const DEFAULT_AI_GATEWAY_MODEL = "google/gemini-3-flash";

export type AIGatewayResult = { text: string; model: string } | { error: string };

export async function generateAIGatewayText(
  input: { system: string; user: string },
  options: {
    token?: string;
    apiKey?: string;
    model?: string;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<AIGatewayResult> {
  const token = options.token ?? process.env.VERCEL_OIDC_TOKEN;
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

    const payload = await response.json().catch(() => ({})) as {
      choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
      error?: { message?: string; type?: string };
    };

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

    const content = payload.choices?.[0]?.message?.content;
    const text = typeof content === "string"
      ? content.trim()
      : Array.isArray(content)
        ? content.map((part) => part.text ?? "").join("\n").trim()
        : "";
    return text ? { text, model } : { error: "NEAS AI Gateway returned no text. Please retry." };
  } catch {
    return { error: "Could not reach NEAS AI Gateway or the request timed out. No alternate provider was used." };
  }
}
