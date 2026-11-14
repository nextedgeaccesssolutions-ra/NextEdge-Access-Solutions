import { createHash } from "node:crypto";

/** Session signing keys.
 *
 *  Deliberately free of any `next/*` import so it can be unit tested by the root vitest run,
 *  which resolves only the root dependency tree. Keep it that way: a `next/headers` import here
 *  breaks CI even though it works locally once web/node_modules exists.
 */

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
