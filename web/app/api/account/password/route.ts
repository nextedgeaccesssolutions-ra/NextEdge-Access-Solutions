import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { bad, ok } from "@/lib/http";
import { clientIp, consumeRateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ipLimit = await consumeRateLimit("account-password-ip", clientIp(req), 10, 15 * 60_000);
  if (!ipLimit.allowed) return rateLimitResponse(ipLimit);
  const u = await getUser();
  if (!u) return bad("Please log in.", 401);
  const userLimit = await consumeRateLimit("account-password-user", String(u.id), 5, 60 * 60_000);
  if (!userLimit.allowed) return rateLimitResponse(userLimit);

  const b = await req.json().catch(() => ({}));
  const cur = typeof b.current === "string" ? b.current : "", next = typeof b.password === "string" ? b.password : "";
  if (next.length < 8 || next.length > 200) return bad("New password must be at least 8 characters.");
  const row = (await sql`select password_hash from users where id = ${u.id}`)[0];
  if (row?.password_hash && !(await bcrypt.compare(cur, row.password_hash))) return bad("Your current password is incorrect.", 401);
  await sql`update users set password_hash = ${await bcrypt.hash(next, 12)} where id = ${u.id}`;
  return ok({ ok: true });
}
