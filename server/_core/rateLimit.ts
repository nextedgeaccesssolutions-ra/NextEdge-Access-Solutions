import type { Request, Response } from "express";

type WindowEntry = { count: number; resetAt: number };
type RateLimitOptions = {
  windowMs: number;
  limit: number;
  maxKeys: number;
  keyGenerator: (req: Request) => string;
};

export function createMemoryRateLimiter({
  windowMs,
  limit,
  maxKeys,
  keyGenerator,
}: RateLimitOptions) {
  const windows = new Map<string, WindowEntry>();

  return function rateLimit(req: Request, res: Response): boolean {
    const now = Date.now();
    const key = keyGenerator(req) || "unknown";
    let current = windows.get(key);

    if (!current || current.resetAt <= now) {
      if (windows.size >= maxKeys) {
        for (const [client, entry] of windows) {
          if (entry.resetAt <= now) windows.delete(client);
          if (windows.size < maxKeys) break;
        }
        if (windows.size >= maxKeys) {
          res.setHeader("Retry-After", String(Math.max(1, Math.ceil(windowMs / 1000))));
          res.status(429).json({ error: "rate-limit-capacity-exceeded" });
          return true;
        }
      }
      current = { count: 0, resetAt: now + windowMs };
      windows.set(key, current);
    }

    current.count += 1;
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, limit - current.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count <= limit) return false;

    res.setHeader("Retry-After", String(Math.max(1, Math.ceil((current.resetAt - now) / 1000))));
    res.status(429).json({ error: "rate-limited" });
    return true;
  };
}

/**
 * Use only the socket peer address here. X-Forwarded-For is attacker-controlled
 * unless Express is configured with a narrowly scoped trusted proxy boundary.
 * This keeps the local fallback conservative; production should also enforce
 * a shared edge/KV quota before the serverless handler.
 */
export function getSocketClientKey(req: Request): string {
  return req.socket.remoteAddress || "unknown";
}
