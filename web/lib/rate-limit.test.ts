import { beforeEach, describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
  state: new Map<string, { resetAt: number; count: number }>(),
  sql: vi.fn(),
}));

vi.mock("./db", () => ({ sql: fake.sql }));

import { clientIp, consumeRateLimit, rateLimitResponse } from "./rate-limit";

beforeEach(() => {
  fake.state.clear();
  fake.sql.mockImplementation(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = strings.join(" ");
    if (query.includes("INSERT INTO settings")) {
      const key = String(values[0]);
      const seed = JSON.parse(String(values[1])) as { resetAt: number; count: number };
      const now = Number(values[2]);
      const current = fake.state.get(key);
      const next = !current || current.resetAt <= now
        ? seed
        : { ...current, count: current.count + 1 };
      fake.state.set(key, next);
      return [{ value: JSON.stringify(next) }];
    }
    return [];
  });
});

describe("shared Next.js API rate limiter", () => {
  it("allows requests up to the limit and then blocks with a retry interval", async () => {
    expect((await consumeRateLimit("login", "user@example.com", 2, 60_000, 1_000)).allowed).toBe(true);
    expect((await consumeRateLimit("login", "user@example.com", 2, 60_000, 2_000)).allowed).toBe(true);
    const blocked = await consumeRateLimit("login", "user@example.com", 2, 60_000, 3_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("isolates different subjects and scopes", async () => {
    expect((await consumeRateLimit("login", "alice", 1, 60_000, 1_000)).allowed).toBe(true);
    expect((await consumeRateLimit("login", "bob", 1, 60_000, 1_000)).allowed).toBe(true);
    expect((await consumeRateLimit("signup", "alice", 1, 60_000, 1_000)).allowed).toBe(true);
  });

  it("starts a new window after the previous window expires", async () => {
    expect((await consumeRateLimit("login", "alice", 1, 60_000, 1_000)).allowed).toBe(true);
    expect((await consumeRateLimit("login", "alice", 1, 60_000, 2_000)).allowed).toBe(false);
    expect((await consumeRateLimit("login", "alice", 1, 60_000, 61_000)).allowed).toBe(true);
  });

  it("uses Vercel's x-real-ip and ignores caller-supplied X-Forwarded-For", () => {
    const req = new Request("https://example.test", {
      headers: { "x-real-ip": "203.0.113.10", "x-forwarded-for": "198.51.100.99" },
    });
    expect(clientIp(req)).toBe("203.0.113.10");
  });

  it("uses a shared unknown bucket rather than trusting X-Forwarded-For when no trusted IP exists", () => {
    const req = new Request("https://example.test", {
      headers: { "x-forwarded-for": "198.51.100.99" },
    });
    expect(clientIp(req)).toBe("unknown");
  });

  it("returns HTTP 429 with Retry-After and no-store headers", async () => {
    const result = await consumeRateLimit("login", "alice", 1, 60_000, 1_000);
    const blocked = await consumeRateLimit("login", "alice", 1, 60_000, 2_000);
    expect(result.allowed).toBe(true);
    const response = rateLimitResponse(blocked);
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).not.toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
