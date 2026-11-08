import { createHash } from "node:crypto";
import { sql } from "./db";

let lastCleanup = 0;

export async function takeRateLimit(scope: string, key: string, limit: number, windowMs: number): Promise<boolean> {
  const seconds = Math.ceil(windowMs / 1000);
  if (!scope || !Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(seconds) || seconds < 1) {
    throw new RangeError("Invalid rate limit configuration");
  }

  const now = Date.now();
  if (now - lastCleanup > 5 * 60_000) {
    lastCleanup = now;
    await sql`delete from public_rate_limits where expires_at <= now()`.catch(() => []);
  }

  const keyHash = createHash("sha256").update(key).digest("hex");
  const rows = await sql`
    insert into public_rate_limits (scope, key_hash, window_start, expires_at, hits)
    values (
      ${scope},
      ${keyHash},
      to_timestamp(floor(extract(epoch from now()) / ${seconds}) * ${seconds}),
      to_timestamp((floor(extract(epoch from now()) / ${seconds}) + 1) * ${seconds}),
      1
    )
    on conflict (scope, key_hash) do update set
      window_start = case
        when public_rate_limits.window_start < excluded.window_start then excluded.window_start
        else public_rate_limits.window_start
      end,
      expires_at = case
        when public_rate_limits.window_start < excluded.window_start then excluded.expires_at
        else public_rate_limits.expires_at
      end,
      hits = case
        when public_rate_limits.window_start < excluded.window_start then 1
        else public_rate_limits.hits + 1
      end
    returning hits
  `;
  return Number(rows[0]?.hits ?? limit + 1) <= limit;
}

export function clientAddress(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")?.trim()
    || "unknown").slice(0, 128);
}
