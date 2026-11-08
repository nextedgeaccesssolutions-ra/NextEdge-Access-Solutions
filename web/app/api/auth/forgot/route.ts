import { sql } from "@/lib/db";
import { bad, ok, str } from "@/lib/http";
import { createResetLink, sendResetEmail, originOf } from "@/lib/reset";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ipLimit = await consumeRateLimit("auth-forgot-ip", clientIp(req), 5, 15 * 60_000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);

  const b = await req.json().catch(() => ({}));
  const email = str(b.email, 320)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Enter a valid email address.");
  const emailLimit = await consumeRateLimit("auth-forgot-email", email, 3, 60 * 60_000);
  if (!emailLimit.allowed) return rateLimitResponse(emailLimit);

  const u = (await sql`select id from users where email = ${email}`)[0];
  if (u) { const link = await createResetLink(u.id, originOf(req)); await sendResetEmail(email, link); }
  // Same answer whether or not the account exists, so emails can't be discovered.
  return ok({ ok: true });
}
