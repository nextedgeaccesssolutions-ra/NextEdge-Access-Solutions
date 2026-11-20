type Bucket = { count: number; resetAt: number };
export type RateLimitDecision = { allowed: boolean; limit: number; remaining: number; resetAt: number; retryAfterSeconds: number };

export function createRateLimiter(maxKeys = 10_000) {
  const buckets = new Map<string, Bucket>();

  return (key: string, namespace: string, limit: number, windowMs: number, now = Date.now()): RateLimitDecision => {
    const bucketKey = `${namespace}:${key || "unknown"}`;
    let bucket = buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size >= maxKeys) {
        for (const [existingKey, entry] of buckets) {
          if (entry.resetAt <= now) buckets.delete(existingKey);
          if (buckets.size < maxKeys) break;
        }
        if (buckets.size >= maxKeys) {
          const retryAfterSeconds = Math.max(1, Math.ceil(windowMs / 1000));
          return { allowed: false, limit, remaining: 0, resetAt: now + windowMs, retryAfterSeconds };
        }
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, limit - bucket.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return {
      allowed: bucket.count <= limit,
      limit,
      remaining,
      resetAt: Math.ceil(bucket.resetAt / 1000),
      retryAfterSeconds,
    };
  };
}

const limiter = createRateLimiter();

/**
 * Vercel overwrites X-Forwarded-For with the public client address.
 * Outside Vercel, use a shared local key rather than trusting spoofable headers.
 * This in-process limiter is a fallback; enforce the distributed quota at Vercel WAF.
 */
export function rateLimitRequest(
  request: Request,
  namespace: string,
  limit: number,
  windowMs: number,
): Response | null {
  const forwarded = process.env.VERCEL === "1" ? request.headers.get("x-forwarded-for") : null;
  const clientKey = forwarded?.split(",")[0]?.trim() || (process.env.VERCEL === "1" ? "unknown" : "local");
  const result = limiter(clientKey, namespace, limit, windowMs);

  if (result.allowed) return null;
  return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
    status: 429,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "retry-after": String(result.retryAfterSeconds),
      "ratelimit-limit": String(result.limit),
      "ratelimit-remaining": String(result.remaining),
      "ratelimit-reset": String(result.resetAt),
    },
  });
}
