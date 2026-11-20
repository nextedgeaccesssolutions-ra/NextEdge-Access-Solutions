import { NextRequest, NextResponse } from "next/server";
import { rateLimitRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const ELEVENLABS_VOICE_ID = process.env.NEAS_ELEVENLABS_VOICE_ID?.trim() || "nF0O6s45DRguoQfSSA3a";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
// The default is a ":free" variant, which is capped account-wide at 20 requests per
// minute and 50 per day until $10 of credits has been purchased (1000/day above that).
// A paid variant carries no free-model request cap but bills per request, so it only
// works once the account has credit. Override without a code change once it does.
const OPENROUTER_TTS_MODEL = process.env.OPENROUTER_TTS_MODEL?.trim() || "fish-audio/s2.1-pro-free:free";
const MAX_TEXT_LENGTH = 1000;

function unavailable(message: string, status = 503) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function providerError(response: Response, provider: string) {
  const raw = await response.text().catch(() => "");
  let detail = "";
  try {
    const parsed = JSON.parse(raw);
    detail = String(parsed?.detail?.message || parsed?.error?.message || parsed?.message || parsed?.detail?.code || "");
  } catch {
    detail = raw.slice(0, 240);
  }
  if (provider === "ElevenLabs") {
    if (response.status === 401) return new Error("ElevenLabs rejected the API key (401). Create a new key with Text to Speech permission and replace ELEVENLABS_API_KEY in Vercel Production.");
    if (response.status === 402) return new Error("ElevenLabs account has insufficient credits (402). Add credits or wait for the quota reset.");
    if (response.status === 403) return new Error("ElevenLabs denied this request (403). Check API key permissions, voice access and plan eligibility.");
    if (response.status === 429) return new Error("ElevenLabs rate or concurrency limit reached (429). Wait before retrying.");
  } else {
    if (response.status === 401 || response.status === 403) return new Error("OpenRouter authentication or permission failed. Verify OPENROUTER_API_KEY and provider access.");
    // 402 and 429 have different causes and different fixes; collapsing them into one
    // message makes a rate limit look like an empty balance and costs diagnosis time.
    if (response.status === 402) return new Error(`OpenRouter balance cannot cover this request (402). Add credits at openrouter.ai.${detail ? " " + detail : ""}`);
    if (response.status === 429) return new Error(`OpenRouter rate limit reached (429) on model ${OPENROUTER_TTS_MODEL}. Free ":free" models are capped account-wide at 20 requests per minute and 50 per day until $10 of credits has been purchased, after which the daily cap is 1000. Add credits, or set OPENROUTER_TTS_MODEL to a paid variant.${detail ? " " + detail : ""}`);
  }
  return new Error(`${provider} returned HTTP ${response.status}.${detail ? " " + detail : ""}`);
}

async function elevenLabsSpeech(text: string) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(ELEVENLABS_VOICE_ID)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY!, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: { stability: 0.48, similarity_boost: 0.78, style: 0.22, use_speaker_boost: true },
      }),
      signal: AbortSignal.timeout(18_000),
    },
  );
  if (!response.ok) throw await providerError(response, "ElevenLabs");
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) throw new Error("ElevenLabs returned an empty audio response.");
  return audio;
}

async function openRouterSpeech(text: string) {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured as a natural-voice fallback in Vercel.");
  const input = "[Warm, confident, natural conversational professional voice. Clear English pronunciation, moderate pace, expressive intonation and natural pauses.] " + text;
  const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      accept: "audio/mpeg",
      "http-referer": process.env.SITE_URL || "https://www.nextedge-access-solutions.com",
      "x-title": "NEAS AI Orchestration Core",
    },
    body: JSON.stringify({ model: OPENROUTER_TTS_MODEL, input, response_format: "mp3" }),
    signal: AbortSignal.timeout(18_000),
  });
  if (!response.ok) throw await providerError(response, "OpenRouter");
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) throw new Error("OpenRouter returned empty audio.");
  return audio;
}

export async function POST(req: NextRequest) {
  const limited = rateLimitRequest(req, "neas-natural-tts", 20, 60_000);
  if (limited) return limited;
  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return unavailable("Invalid request body.", 400); }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return unavailable("No text provided.", 400);
  if (text.length > MAX_TEXT_LENGTH) return unavailable("Text is too long.", 413);

  let audio: ArrayBuffer;
  let voiceModel = "";
  let primaryFailure: Error | null = null;

  if (ELEVENLABS_API_KEY) {
    try {
      audio = await elevenLabsSpeech(text);
      voiceModel = "elevenlabs/eleven_flash_v2_5";
    } catch (cause) {
      primaryFailure = cause instanceof Error ? cause : new Error("ElevenLabs natural voice failed.");
      console.warn("[neas-natural-tts] ElevenLabs failed; trying configured natural-voice fallback.", primaryFailure.message);
    }
  }

  if (!voiceModel) {
    try {
      audio = await openRouterSpeech(text);
      voiceModel = OPENROUTER_TTS_MODEL;
    } catch (cause) {
      const fallbackFailure = cause instanceof Error ? cause : new Error("OpenRouter natural voice failed.");
      const message = primaryFailure
        ? `Natural voice is unavailable. ElevenLabs: ${primaryFailure.message} Fallback: ${fallbackFailure.message}`
        : fallbackFailure.message;
      console.error("[neas-natural-tts] All configured natural-voice providers failed.", message);
      return unavailable(message, 503);
    }
  }

  return new NextResponse(audio!, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "X-NEAS-Voice-Model": voiceModel,
    },
  });
}
