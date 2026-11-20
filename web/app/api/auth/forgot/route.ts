import { sql } from "@/lib/db";
import { bad, ok, str } from "@/lib/http";
import { createResetLink, sendResetEmail, originOf } from "@/lib/reset";
import { rateLimitRequest } from "@/lib/rate-limit";
export async function POST(req: Request) {
  const limited = rateLimitRequest(req, "auth-forgot", 5, 15 * 60_000);
  if (limited) return limited;
  const rawBody = await req.json().catch(() => ({}));
  const b: Record<string, unknown> = rawBody && typeof rawBody === "object" && !Array.isArray(rawBody) ? rawBody as Record<string, unknown> : {};
  const email = str(b.email, 320)?.toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad("Enter a valid email address.");
  const u = (await sql`select id from users where email = ${email}`)[0];
  if (u) { const link = await createResetLink(u.id, originOf(req)); await sendResetEmail(email, link); }
  // Same answer whether or not the account exists, so emails can't be discovered.
  return ok({ ok: true });
}
