import { NextRequest, NextResponse } from "next/server";
import { rateLimitRequest } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
// Two sequential provider attempts at 25s each must fit inside the budget.
export const maxDuration = 60;

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
/** Tried first on every request so the free tier absorbs normal load. */
const TTS_FREE_MODEL = "fish-audio/s2.1-pro-free:free";
/** Used only when the free tier reports its quota is gone. Billed per UTF-8
 *  byte, so MAX_TEXT_LENGTH is what bounds the cost of a single reply.
 *  Override with NEAS_TTS_PAID_MODEL; set that to "off" to disable paid
 *  speech entirely and keep the previous free-only behaviour. */
const TTS_PAID_MODEL_SETTING = process.env.NEAS_TTS_PAID_MODEL?.trim() || "fish-audio/s2.1-pro";
const TTS_PAID_MODEL = /^(off|none|disabled)$/i.test(TTS_PAID_MODEL_SETTING) ? null : TTS_PAID_MODEL_SETTING;
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

  const speak = (model: string) => fetch("https://openrouter.ai/api/v1/audio/speech", {
    method: "POST",
    headers: {
      authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "content-type": "application/json",
      accept: "audio/mpeg",
      "http-referer": process.env.SITE_URL || "https://www.nextedge-access-solutions.com",
      "x-title": "NEAS AI Orchestration Core",
    },
    body: JSON.stringify({ model, input, response_format: "mp3" }),
    signal: AbortSignal.timeout(25_000),
  });

  let usedModel = TTS_FREE_MODEL;
  let billing: "free" | "paid" = "free";
  let response: Response;
  try {
    response = await speak(TTS_FREE_MODEL);
    // The free voice tier exhausts regularly, and the alternative is silence:
    // this endpoint deliberately never substitutes a browser voice. Retry once
    // on the paid voice so the assistant keeps speaking. Only a quota answer
    // triggers it, so normal load still costs nothing.
    if ((response.status === 402 || response.status === 429) && TTS_PAID_MODEL) {
      const paid = await speak(TTS_PAID_MODEL);
      if (paid.ok) {
        response = paid;
        usedModel = TTS_PAID_MODEL;
        billing = "paid";
      }
    }
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
        {
          error: TTS_PAID_MODEL
            ? "Natural voice is temporarily unavailable: the free voice quota is exhausted and the paid voice did not answer either. Please retry shortly; no robotic browser voice will be substituted."
            : "The free natural-voice quota is temporarily unavailable, and paid speech is switched off. Please retry later; no robotic browser voice will be substituted.",
        },
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
      "X-NEAS-Voice-Model": usedModel,
      // Lets an administrator see, per reply, whether the paid voice was billed.
      "X-NEAS-Voice-Billing": billing,
    },
  });
}
