import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { sql } from "./db";

const KEY_PREFIX = "rate-limit:";
const WINDOW_CLEANUP_INTERVAL_MS = 15 * 60_000;
const KEY_RETENTION_MS = 24 * 60 * 60_000;
let lastCleanupAt = 0;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
};

const digest = (value: string) => createHmac("sha256", process.env.SESSION_SECRET || process.env.DATABASE_URL || process.env.POSTGRES_URL || "neas-rate-limit-local").update(value).digest("hex");

/**
 * Vercel supplies x-real-ip from its edge and overwrites the forwarded client
 * IP header. Never fall back to a caller-provided X-Forwarded-For value.
 */
export function clientIp(req: Request): string {
  const ip = req.headers.get("x-real-ip")?.trim();
  return ip && ip.length <= 64 ? ip : "unknown";
}

/**
 * Shared, atomic fixed-window limiter backed by the existing PostgreSQL
 * settings table. This works across serverless instances and requires no
 * schema migration. Only hashed subjects are stored.
 */
export async function consumeRateLimit(
  scope: string,
  subject: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): Promise<RateLimitResult> {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1_000) {
    throw new Error("Invalid rate-limit configuration");
  }

  const safeScope = scope.replace(/[^a-z0-9:_-]/gi, "_").slice(0, 80) || "unknown";
  const key = `${KEY_PREFIX}${safeScope}:${digest(subject.trim().slice(0, 512) || "unknown")}`;
  const seed = JSON.stringify({ resetAt: now + windowMs, count: 1 });

  const rows = await sql`
    INSERT INTO settings (key, value)
    VALUES (${key}, ${seed})
    ON CONFLICT (key) DO UPDATE
    SET value = CASE
      WHEN COALESCE((settings.value::jsonb ->> 'resetAt')::bigint, 0) <= ${now}
        THEN ${seed}
      ELSE jsonb_set(
        settings.value::jsonb,
        '{count}',
        to_jsonb(LEAST(\${limit} + 1, COALESCE((settings.value::jsonb ->> 'count')::integer, 0) + 1)),
        true
      )::text
    END
    RETURNING value
  `;

  const state = JSON.parse(String(rows[0]?.value ?? seed)) as { resetAt: number; count: number };
  const allowed = state.count <= limit;
  const retryAfter = allowed ? 0 : Math.max(1, Math.ceil((state.resetAt - now) / 1000));

  // Best-effort expiry cleanup; no timer or background worker is required.
  if (now - lastCleanupAt >= WINDOW_CLEANUP_INTERVAL_MS) {
    lastCleanupAt = now;
    void sql`
      DELETE FROM settings
      WHERE key LIKE 'rate-limit:%'
        AND COALESCE((value::jsonb ->> 'resetAt')::bigint, 0) < ${now - KEY_RETENTION_MS}
    `.catch(() => {});
  }

  return {
    allowed,
    remaining: Math.max(0, limit - state.count),
    retryAfter,
  };
}

export function rateLimitResponse(result: RateLimitResult, message = "Too many requests. Please try again later.") {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, result.retryAfter)),
        "Cache-Control": "no-store",
      },
    },
  );
}
