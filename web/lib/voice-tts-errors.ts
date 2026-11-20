// Error mapping for the natural-voice TTS route, kept free of framework imports so
// it can be unit tested directly (see scripts/test-voice-tts-errors.mjs).

export type VoiceProvider = "ElevenLabs" | "OpenRouter";

/**
 * Pulls a human-readable detail out of a provider's error body.
 * Falls back to the raw text when the body is not JSON.
 */
export function parseProviderDetail(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return String(
      parsed?.detail?.message ||
        parsed?.error?.message ||
        parsed?.message ||
        parsed?.detail?.code ||
        "",
    );
  } catch {
    return raw.slice(0, 240);
  }
}

/**
 * Maps a provider's HTTP status onto a message that names the cause and the fix.
 *
 * The OpenRouter 402 and 429 cases are deliberately distinct: 402 means the balance
 * cannot cover the request, 429 means a rate limit was hit. Collapsing them reads as
 * an empty balance when the account is simply over the free-model daily cap.
 */
export function providerErrorMessage(
  provider: VoiceProvider,
  status: number,
  detail = "",
  model = "",
): string {
  const suffix = detail ? " " + detail : "";

  if (provider === "ElevenLabs") {
    if (status === 401) return "ElevenLabs rejected the API key (401). Create a new key with Text to Speech permission and replace ELEVENLABS_API_KEY in Vercel Production.";
    if (status === 402) return "ElevenLabs account has insufficient credits (402). Add credits or wait for the quota reset.";
    if (status === 403) return "ElevenLabs denied this request (403). Check API key permissions, voice access and plan eligibility.";
    if (status === 429) return "ElevenLabs rate or concurrency limit reached (429). Wait before retrying.";
  } else {
    if (status === 401 || status === 403) return "OpenRouter authentication or permission failed. Verify OPENROUTER_API_KEY and provider access.";
    if (status === 402) return `OpenRouter balance cannot cover this request (402). Add credits at openrouter.ai.${suffix}`;
    if (status === 429) return `OpenRouter rate limit reached (429)${model ? " on model " + model : ""}. Free ":free" models are capped account-wide at 20 requests per minute and 50 per day until $10 of credits has been purchased, after which the daily cap is 1000. Add credits, or set OPENROUTER_TTS_MODEL to a paid variant.${suffix}`;
  }

  return `${provider} returned HTTP ${status}.${suffix}`;
}
