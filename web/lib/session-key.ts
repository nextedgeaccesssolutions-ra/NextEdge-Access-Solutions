/** Session signing keys.
 *
 *  Deliberately free of any `next/*` import so this module can be unit tested by the root
 *  Vitest run, which resolves only the root dependency tree.
 */

/** The dedicated session signing key. Null when SESSION_SECRET is missing or too short. */
export function strongKey(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  return secret && secret.length >= 32 ? new TextEncoder().encode(secret) : null;
}

/** Whether the dedicated session signing key is configured and meets the minimum length. */
export function hasStrongSessionSecret(): boolean {
  return strongKey() !== null;
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
 * Only the dedicated session secret is trusted for authentication.
 *
 * Tokens signed with the former DATABASE_URL-derived key are intentionally rejected. That key
 * cannot distinguish a legitimate pre-migration cookie from a newly forged token, so accepting
 * it during a migration window would preserve the original session-forgery vulnerability.
 */
export function verifyKeys(): Uint8Array[] {
  const strong = strongKey();
  if (!strong) {
    throw new Error("SESSION_SECRET must be configured with at least 32 characters before verifying sessions");
  }
  return [strong];
}
