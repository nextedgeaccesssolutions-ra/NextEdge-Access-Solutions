import { bad, ok, str } from "@/lib/http";
import { sendWebsiteInquiry } from "@/lib/notify";
import { clientAddress, takeRateLimit } from "@/lib/rate-limit";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

function optional(value: unknown, max: number): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed : null;
}

export async function POST(req: Request) {
  const parsed = await readJson(req);
  if (!parsed.ok) return parsed.tooLarge ? bad("Inquiry is too large.", 413) : bad("Enter your inquiry details and try again.");
  const body = parsed.value;
  if (!body || typeof body !== "object" || Array.isArray(body)) return bad("Enter your inquiry details and try again.");
  const fields = body as Record<string, unknown>;

  if (typeof fields.website === "string" && fields.website.trim()) return ok({ ok: true });

  const name = str(fields.name, 120);
  const email = str(fields.email, 320)?.toLowerCase();
  const message = str(fields.message, 5000);
  const companyValue = optional(fields.company, 160);
  const phoneValue = optional(fields.phone, 60);
  const serviceValue = optional(fields.service, 120);
  if (!name || !email || !EMAIL.test(email) || !message) return bad("Enter your name, a valid email address, and a message.");
  if (companyValue === null || phoneValue === null || serviceValue === null) return bad("Optional fields must be text within their length limits.");
  const company = companyValue || undefined;
  const phone = phoneValue || undefined;
  const service = serviceValue || undefined;

  try {
    if (!await takeRateLimit("contact", clientAddress(req), 5, 15 * 60_000)) {
      return bad("Too many inquiries from this connection. Please try again in 15 minutes.", 429);
    }
  } catch {
    return bad("Inquiry service is temporarily unavailable. Please try again later.", 503);
  }

  let sent: boolean;
  try {
    sent = await sendWebsiteInquiry({ name, email, message, company, phone, service });
  } catch {
    return bad("We couldn't send your inquiry right now. Please try again or contact us on WhatsApp.", 503);
  }
  return sent
    ? ok({ ok: true, message: "Your inquiry was sent. Our team will be in touch." })
    : bad("We couldn't send your inquiry right now. Please try again or contact us on WhatsApp.", 503);
}
