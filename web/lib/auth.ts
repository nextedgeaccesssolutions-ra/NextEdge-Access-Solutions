import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sql } from "./db";

const COOKIE = "neas_session";
function key() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return new TextEncoder().encode(s);
}

export type SessionUser = { id: number; email: string; name: string; phone: string | null; role: "customer" | "admin" };

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(key());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    const rows = await sql`select id, email, name, phone, role from users where id = ${Number(payload.uid)}`;
    return (rows[0] as unknown as SessionUser) ?? null;
  } catch {
    return null;
  }
}
