import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { bad, ok, str } from "@/lib/http";
import { rateLimitRequest } from "@/lib/rate-limit";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function POST(req: Request) {
  const limited = rateLimitRequest(req, "auth-login", 10, 15 * 60_000);
  if (limited) return limited;

  try {
    const rawBody = await req.json().catch(() => ({}));
    const b: Record<string, unknown> = rawBody && typeof rawBody === "object" && !Array.isArray(rawBody) ? rawBody as Record<string, unknown> : {};
    const email = str(b.email, 320)?.toLowerCase();
    const password = typeof b.password === "string" ? b.password : "";

    if (!email || !password) return bad("Enter your email and password.");

    const rows = await sql`select id, password_hash, role from users where email = ${email}`;
    const u = rows[0];
    const valid = u?.password_hash
      ? await bcrypt.compare(password, u.password_hash)
      : await bcrypt.compare(password, DUMMY_HASH);

    if (!u || !u.password_hash || !valid) {
      return bad("Incorrect email or password. If you registered with Google or Facebook, use that sign-in method.", 401);
    }
    if (b.portal === "admin" && u.role !== "admin") {
      return bad("This account does not have admin access.", 403);
    }

    await createSession(u.id);
    return ok({ ok: true, role: u.role });
  } catch (error) {
    // Keep credentials, SQL values, cookies and provider responses out of logs.
    const e = error as { name?: string; code?: string };
    console.error("[auth/login] Authentication request failed", {
      errorName: e?.name || "UnknownError",
      errorCode: e?.code || "NO_CODE",
    });
    return bad("The sign-in service is temporarily unavailable. Please try again shortly.", 503);
  }
}
