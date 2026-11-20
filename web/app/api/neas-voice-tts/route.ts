import { NextRequest, NextResponse } from "next/server";
import { rateLimitRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY?.trim();
const ELEVENLABS_VOICE_ID = process.env.NEAS_ELEVENLABS_VOICE_ID?.trim() || "nF0O6s45DRguoQfSSA3a";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_TTS_MODEL = "fish-audio/s2.1-pro-free:free";
const MAX_TEXT_LENGTH = 1000;

function unavailable(message: string, status = 503) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
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
      signal: AbortSignal.timeout(25_000),
    },
  );
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("ElevenLabs authentication failed. Verify ELEVENLABS_API_KEY in Vercel Production environment.");
    if (response.status === 402 || response.status === 429) throw new Error("ElevenLabs voice credits or rate limit are unavailable. Check the ElevenLabs workspace quota and billing.");
    throw new Error(`ElevenLabs speech service returned HTTP ${response.status}. Written AI replies remain available.`);
  }
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) throw new Error("ElevenLabs returned an empty audio response.");
  return audio;
}

async function openRouterSpeech(text: string) {
  if (!OPENROUTER_API_KEY) throw new Error("No natural-voice provider key is configured. Add ELEVENLABS_API_KEY or OPENROUTER_API_KEY in Vercel.");
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
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) {
    if (response.status === 402 || response.status === 429) throw new Error("Natural voice provider quota is unavailable. Check provider credits or retry after the quota resets.");
    if (response.status === 401 || response.status === 403) throw new Error("Natural voice provider authentication failed. Verify the server-side API key.");
    throw new Error(`Natural voice provider returned HTTP ${response.status}.`);
  }
  const audio = await response.arrayBuffer();
  if (!audio.byteLength) throw new Error("Natural voice provider returned empty audio.");
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

  try {
    // Prefer the configured ElevenLabs account rather than the exhausted free Fish Audio allowance.
    const audio = ELEVENLABS_API_KEY ? await elevenLabsSpeech(text) : await openRouterSpeech(text);
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
        "X-NEAS-Voice-Model": ELEVENLABS_API_KEY ? "elevenlabs/eleven_flash_v2_5" : OPENROUTER_TTS_MODEL,
      },
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Natural voice generation failed. Written AI replies remain available.";
    const timedOut = cause instanceof Error && (cause.name === "TimeoutError" || cause.name === "AbortError");
    return unavailable(timedOut ? "Natural voice generation timed out. Please try again." : message, timedOut ? 504 : 503);
  }
}
