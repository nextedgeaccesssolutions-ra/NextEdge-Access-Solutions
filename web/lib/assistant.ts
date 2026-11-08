export type AssistantMessage = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are the website assistant for NextEdge Access Solutions (NEAS) OPC in the Philippines.
Help visitors understand NEAS services and products, and how to contact the team. NEAS works in rope access and facade works, NDT and industrial inspection, blasting/painting/coatings, telecom and met mast services, wind turbine services, training, consultancy, and PPE supply.
Be concise, warm, and professional. Never invent prices, availability, certifications, project history, or safety advice. If asked for a quote or a detail that is not provided, say the team must confirm it. Direct visitors to WhatsApp +63 991 426 5886 for quotes and urgent follow-up. Do not claim to submit forms, make bookings, or contact the team on the visitor's behalf. Keep replies under 120 words.`;

async function answerWithAnthropic(key: string, messages: AssistantMessage[], signal: AbortSignal): Promise<string | null> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.MK_AI_MODEL || "claude-sonnet-5-5",
      max_tokens: 350,
      system: SYSTEM,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
    signal,
  });
  if (!response.ok) {
    console.error("NEAS assistant provider request failed", { provider: "anthropic", status: response.status });
    return null;
  }
  const result = await response.json();
  if (!result || typeof result !== "object" || !Array.isArray((result as { content?: unknown }).content)) return null;
  const text = ((result as { content: unknown[] }).content)
    .filter((part): part is { type: "text"; text: string } =>
      !!part && typeof part === "object" && (part as { type?: unknown }).type === "text"
      && typeof (part as { text?: unknown }).text === "string")
    .map((part) => part.text)
    .join("\n").trim();
  return text ? text.slice(0, 2000) : null;
}

async function answerWithGemini(key: string, messages: AssistantMessage[], signal: AbortSignal): Promise<string | null> {
  const model = encodeURIComponent(process.env.MK_GEMINI_MODEL || "gemini-flash-latest");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: messages.map(({ role, content }) => ({ role: role === "assistant" ? "model" : "user", parts: [{ text: content }] })),
      generationConfig: { maxOutputTokens: 350 },
    }),
    signal,
  });
  if (!response.ok) {
    console.error("NEAS assistant provider request failed", { provider: "gemini", status: response.status });
    return null;
  }
  const result = await response.json();
  const candidates = result && typeof result === "object" ? (result as { candidates?: unknown }).candidates : null;
  if (!Array.isArray(candidates)) return null;
  const content = candidates[0] && typeof candidates[0] === "object"
    ? (candidates[0] as { content?: unknown }).content
    : null;
  const parts = content && typeof content === "object" ? (content as { parts?: unknown }).parts : null;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .filter((part): part is { text: string } =>
      !!part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string")
    .map((part) => part.text)
    .join("").trim();
  return text ? text.slice(0, 2000) : null;
}

export async function answerVisitor(messages: AssistantMessage[]): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!key && !geminiKey) return null;

  const signal = AbortSignal.timeout(15_000);
  for (const [provider, providerKey, answer] of [
    ["anthropic", key, answerWithAnthropic],
    ["gemini", geminiKey, answerWithGemini],
  ] as const) {
    if (!providerKey || signal.aborted) continue;
    try {
      const reply = await answer(providerKey, messages, signal);
      if (reply) return reply;
    } catch (error) {
      console.error("NEAS assistant request could not be completed", {
        provider,
        error: error instanceof Error ? error.name : "unknown error",
      });
    }
  }
  return null;
}
