import { NextRequest, NextResponse } from "next/server";
import { rateLimitRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ElevenLabs voice ID for the NEAS AI Voice Agent
// Agent ID: agent_4401m7e4gjxfejwbvx9t4vgr8bth
// Match the published NEAS AI Voice Agent voice. Keep the API key server-side.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "cjVigY5qzO86Huf0OWal";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const MAX_TEXT_LENGTH = 1000;

export async function POST(req: NextRequest) {
  // Rate limit: 20 TTS requests per minute per IP
  const limited = rateLimitRequest(req, "elevenlabs-tts", 20, 60_000);
  if (limited) return limited;

  if (!ELEVENLABS_API_KEY) {
    return NextResponse.json({ error: "TTS service not configured" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "Text too long" }, { status: 413 });
  }

  const ttsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
  const ttsBody = {
    text,
    model_id: "eleven_v4_turbo",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
      style: 0.0,
      use_speaker_boost: true,
    },
  };

  let ttsRes: Response;
  try {
    ttsRes = await fetch(ttsUrl, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify(ttsBody),
    });
  } catch (err) {
    console.error("[elevenlabs-tts] fetch error:", err);
    return NextResponse.json({ error: "TTS service unavailable" }, { status: 502 });
  }

  if (!ttsRes.ok) {
    const errText = await ttsRes.text().catch(() => "");
    console.error("[elevenlabs-tts] API error:", ttsRes.status, errText);
    return NextResponse.json({ error: "TTS request failed" }, { status: 502 });
  }

  const audioBuffer = await ttsRes.arrayBuffer();
  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
