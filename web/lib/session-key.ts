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
 *  This key is retained only to verify sessions issued before SESSION_SECRET was configured.
 *  It must never be used to sign or verify sessions while the dedicated secret is absent.
 *  Delete this function and its use in verifyKeys once SESSION_SECRET has been set in every
 *  environment and the 30-day legacy session window has passed.
 */
export function legacyKey(): Uint8Array | null {
  const db = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return db ? new Uint8Array(createHash("sha256").update("neas-session-v1:" + db).digest()) : null;
}

/** New sessions must be signed only with the dedicated, independently managed secret. */
export function signingKey(): Uint8Array {
  const strong = strongKey();
  if (!strong) throw new Error("SESSION_SECRET must be configured with at least 32 characters before issuing sessions");
  return strong;
}

/** Verify with the dedicated key first, then the legacy key for existing sessions.
 *  Requiring the dedicated key before accepting either key prevents DATABASE_URL alone from
 *  remaining an authentication credential when SESSION_SECRET has not been configured.
 */
export function verifyKeys(): Uint8Array[] {
  const strong = strongKey();
  if (!strong) throw new Error("SESSION_SECRET must be configured with at least 32 characters before verifying sessions");
  const legacy = legacyKey();
  return legacy ? [strong, legacy] : [strong];
}
