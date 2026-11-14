import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sql } from "./db";
import { loadConfig } from "./config";
import { signingKey, verifyKeys } from "./session-key";

const COOKIE = "neas_session";
export type SessionUser = { id: number; email: string; name: string; phone: string | null; role: "customer" | "admin" };

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(signingKey());
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getUser(): Promise<SessionUser | null> {
  await loadConfig().catch(() => {});
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let uid: number | null = null;
  for (const k of verifyKeys()) {
    try {
      const { payload } = await jwtVerify(token, k);
      uid = Number(payload.uid);
      break;
    } catch {
      // Try the next accepted key; a cookie signed with the legacy key is still valid.
    }
  }
  if (uid === null || !Number.isSafeInteger(uid)) return null;
  const rows = await sql`select id, email, name, phone, role from users where id = ${uid}`;
  return (rows[0] as unknown as SessionUser) ?? null;
}
