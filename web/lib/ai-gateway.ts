export type GatewayResult = { text: string } | { error: string };

export function resolveGatewayToken(input: { apiKey?: string | null; oidcToken?: string | null }): string | null {
  return input.apiKey?.trim() || input.oidcToken?.trim() || null;
}

export async function generateGatewayText(input: {
  token?: string | null;
  model?: string;
  system: string;
  user: string;
  fetcher?: typeof fetch;
}): Promise<GatewayResult> {
  const token = input.token?.trim();
  if (!token) return { error: "AI Gateway authentication is unavailable for this request." };
  const model = input.model?.trim() || "anthropic/claude-sonnet-5.5";
  const fetcher = input.fetcher ?? fetch;
  try {
    const response = await fetcher("https://ai-gateway.vercel.sh/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: input.system }, { role: "user", content: input.user }], max_tokens: 3000, stream: false }),
      signal: AbortSignal.timeout(45_000),
    });
    const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }> } | null;
    if (!response.ok) {
      if (response.status === 402) return { error: "NEAS AI Gateway monthly budget or credit limit has been reached. Try again after the budget refresh or review billing." };
      if (response.status === 401 || response.status === 403) return { error: "NEAS AI Gateway authentication or project access failed. Contact the system administrator." };
      if (response.status === 429) return { error: "NEAS AI Gateway or model provider is rate-limited. Please retry shortly." };
      return { error: `NEAS AI Gateway request failed (${response.status}). Please retry or contact the administrator.` };
    }
    const content = payload?.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : Array.isArray(content) ? content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n").trim() : "";
    return text ? { text } : { error: "The AI Gateway returned no text. Please retry." };
  } catch {
    return { error: "NEAS AI Gateway could not be reached or timed out. Please retry shortly." };
  }
}
