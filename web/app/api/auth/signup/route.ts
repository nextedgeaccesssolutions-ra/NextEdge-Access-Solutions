import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { bad, ok, str } from "@/lib/http";

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const email = str(b.email, 320)?.toLowerCase();
  const name = str(b.name, 160);
  const phone = str(b.phone, 40);
  const password = typeof b.password === "string" ? b.password : "";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad("Enter a valid email address.");
  if (!name) return bad("Enter your name or company.");
  if (password.length < 8 || password.length > 200) return bad("Password must be at least 8 characters.");
  const exists = await sql`select 1 from users where email = ${email}`;
  if (exists.length) return bad("An account with this email already exists. Please log in.", 409);
  const hash = await bcrypt.hash(password, 12);
  const [u] = await sql`insert into users (email, name, phone, password_hash, role) values (${email}, ${name}, ${phone}, ${hash}, 'customer') returning id`;
  await createSession(u.id);
  return ok({ ok: true, role: "customer" });
}
