import { NextRequest, NextResponse } from "next/server";
import { rateLimitRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const TTS_MODEL = "fish-audio/s2.1-pro-free:free";
const MAX_TEXT_LENGTH = 1000;

export async function POST(req: NextRequest) {
  const limited = rateLimitRequest(req, "neas-natural-tts", 20, 60_000);
  if (limited) return limited;

  if (!OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "NEAS natural voice is currently unavailable. Please contact your system administrator." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "No text provided." }, { status: 400 });
  if (text.length > MAX_TEXT_LENGTH) return NextResponse.json({ error: "Text is too long." }, { status: 413 });

  // Fish Audio S2.1 accepts natural-language delivery cues in square brackets.
  const input = "[Warm, confident, natural conversational professional voice. Clear English pronunciation, moderate pace, expressive intonation and natural pauses.] " + text;

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "content-type": "application/json",
        accept: "audio/mpeg",
        "http-referer": process.env.SITE_URL || "https://www.nextedge-access-solutions.com",
        "x-title": "NEAS AI Orchestration Core",
      },
      body: JSON.stringify({ model: TTS_MODEL, input, response_format: "mp3" }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json(
      { error: timedOut ? "Natural voice generation timed out. Please try again." : "Natural voice provider is temporarily unreachable. Your written AI response remains available." },
      { status: timedOut ? 504 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!response.ok) {
    const status = response.status;
    // Do not expose upstream response bodies or account diagnostics to the browser.
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Natural voice authentication failed. Please contact your system administrator." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    if (status === 402 || status === 429) {
      return NextResponse.json(
        { error: "The free natural-voice quota is temporarily unavailable. Please retry later; no robotic browser voice will be substituted." },
        { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "The natural voice provider returned an error. Your written AI response remains available." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const audio = await response.arrayBuffer().catch(() => null);
  if (!audio || audio.byteLength === 0) {
    return NextResponse.json({ error: "The natural voice provider returned empty audio." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const contentType = response.headers.get("content-type")?.split(";")[0] || "audio/mpeg";
  if (!contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
    return NextResponse.json({ error: "The natural voice provider returned an unsupported audio format." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return new NextResponse(audio, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
      "X-NEAS-Voice-Model": TTS_MODEL,
    },
  });
}
