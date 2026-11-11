import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { sql } from "./db";
import { loadConfig } from "./config";

const COOKIE = "neas_session";
import { createHash } from "node:crypto";
/** The dedicated session signing key. Null when SESSION_SECRET is missing or too short. */
export function strongKey(): Uint8Array | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? new TextEncoder().encode(s) : null;
}

/** Legacy key derived from the database URL.
 *
 *  Deriving the session key from DATABASE_URL means anyone who learns the database URL can forge
 *  an admin session, and the two secrets cannot be rotated independently. It is kept only so that
 *  sessions issued before SESSION_SECRET was set still verify; it is never used for signing once
 *  SESSION_SECRET is present. Delete this function, and its use in verifyKeys, once SESSION_SECRET
 *  has been set in every environment and the 30-day session window has passed. */
export function legacyKey(): Uint8Array | null {
  const db = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return db ? new Uint8Array(createHash("sha256").update("neas-session-v1:" + db).digest()) : null;
}

let warned = false;
/** Key that NEW sessions are signed with: the dedicated secret whenever it exists. */
export function signingKey(): Uint8Array {
  const strong = strongKey();
  if (strong) return strong;
  const legacy = legacyKey();
  if (!legacy) throw new Error("Set SESSION_SECRET (32+ characters)");
  if (!warned) {
    warned = true;
    console.error("[auth] SESSION_SECRET is not set (or is under 32 characters), so sessions are being signed with a key derived from the database URL. Anyone who learns that URL can forge an admin session. Set SESSION_SECRET to 32+ random characters in every environment.");
  }
  return legacy;
}

/** Keys accepted when verifying an existing cookie: the dedicated secret first, then the legacy
 *  derived key. Accepting both means setting SESSION_SECRET signs nobody out mid-session. */
export function verifyKeys(): Uint8Array[] {
  const keys = [strongKey(), legacyKey()].filter((k): k is Uint8Array => k !== null);
  if (!keys.length) throw new Error("Set SESSION_SECRET (32+ characters)");
  return keys;
}

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
