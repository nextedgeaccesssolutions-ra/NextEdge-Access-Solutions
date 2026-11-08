import { bad, ok } from "@/lib/http";
import { loadConfig } from "@/lib/config";
import { answerVisitor, type AssistantMessage } from "@/lib/assistant";
import { clientAddress, takeRateLimit } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 16_000;

async function readJson(req: Request): Promise<{ ok: true; value: unknown } | { ok: false; tooLarge?: boolean }> {
  const contentLength = req.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return { ok: false };
    if (Number(contentLength) > MAX_BODY_BYTES) return { ok: false, tooLarge: true };
  }
  if (!req.body) return { ok: false };

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return { ok: false, tooLarge: true };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown };
  } catch {
    return { ok: false };
  } finally {
    reader.releaseLock();
  }
}

export async function POST(req: Request) {
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.tooLarge ? bad("That conversation is too large.", 413) : bad("Send a valid message to the assistant.");
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("Send a valid message to the assistant.");

  const raw = (body as Record<string, unknown>).messages;
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 8) return bad("Keep the conversation to the latest eight messages.");
  const messages: AssistantMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return bad("A conversation message is invalid.");
    const message = item as Record<string, unknown>;
    if ((message.role !== "user" && message.role !== "assistant")
      || typeof message.content !== "string"
      || !message.content.trim()
      || message.content.length > 1200) return bad("Messages must be 1–1,200 characters.");
    if (messages.length > 0 && messages[messages.length - 1].role === message.role) {
      return bad("Conversation messages must alternate between visitor and assistant.");
    }
    messages.push({ role: message.role, content: message.content.trim() });
  }
  if (messages[messages.length - 1].role !== "user") return bad("Send a new visitor message to continue.");

  try {
    if (!await takeRateLimit("assistant", clientAddress(req), 15, 60 * 60_000)) {
      return bad("The assistant is receiving too many requests from this connection. Please try again later.", 429);
    }
  } catch {
    return bad("The assistant is temporarily unavailable. Please try again later.", 503);
  }

  try {
    await loadConfig();
  } catch {
    return bad("The assistant is temporarily unavailable. Please try again later.", 503);
  }
  const reply = await answerVisitor(messages);
  return reply
    ? ok({ reply })
    : bad("The assistant is temporarily unavailable. Please message our team on WhatsApp instead.", 503);
}
