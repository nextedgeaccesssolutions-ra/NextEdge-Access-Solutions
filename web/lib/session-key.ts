/**
 * Session signing keys.
 *
 * Deliberately free of any `next/*` import so it can be unit tested by the root Vitest run,
 * which resolves only the root dependency tree.
 */

/** The dedicated session signing key. Null when SESSION_SECRET is missing or too short. */
export function strongKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? new TextEncoder().encode(secret) : null;
}

/** New sessions must be signed only with the dedicated, independently managed secret. */
export function signingKey(): Uint8Array {
  const strong = strongKey();
  if (!strong) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters before issuing sessions");
  }
  return strong;
}

/**
 * Only the dedicated session secret is accepted for verification.
 *
 * Legacy cookies signed from DATABASE_URL are intentionally rejected. Keeping that derived
 * key as an accepted verification key would let anyone who obtains the database URL forge
 * authenticated sessions, including administrator sessions.
 */
export function verifyKeys(): Uint8Array[] {
  const strong = strongKey();
  if (!strong) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters before verifying sessions");
  }
  return [strong];
}
