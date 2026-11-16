/**
 * Dedicated credential for the scheduled-publishing endpoint.
 * Never derive this from DATABASE_URL, POSTGRES_URL, or SESSION_SECRET:
 * a database credential must not also authorize privileged publishing.
 */
export function cronToken(): string | null {
  const token = process.env.CRON_SECRET;
  return token && token.length >= 32 ? token : null;
}
