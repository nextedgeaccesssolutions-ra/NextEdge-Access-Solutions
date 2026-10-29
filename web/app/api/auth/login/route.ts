import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { bad, ok, str } from "@/lib/http";

const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 12);

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = str(b.email, 320)?.toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !password) return bad("Enter your email and password.");
  const rows = await sql`select id, password_hash, role from users where email = ${email}`;
  const u = rows[0];
  if (u && !u.password_hash) return bad("This account signs in with Google or Facebook. Use those buttons above.", 400);
  const valid = u ? await bcrypt.compare(password, u.password_hash) : await bcrypt.compare(password, DUMMY_HASH);
  if (!u || !valid) return bad("Incorrect email or password.", 401);
  if (b.portal === "admin" && u.role !== "admin") return bad("This account does not have admin access.", 403);
  await createSession(u.id);
  return ok({ ok: true, role: u.role });
}
