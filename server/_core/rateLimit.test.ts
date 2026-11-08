import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { createMemoryRateLimiter, getSocketClientKey } from "./rateLimit";

function request(key = "192.0.2.10") {
  return { socket: { remoteAddress: key }, headers: {} } as unknown as Request;
}

function response() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    setHeader(name: string, value: string) { headers[name] = value; return this; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return { res: res as unknown as Response, headers, state: res };
}

describe("scheduled publish rate limiter", () => {
  afterEach(() => vi.restoreAllMocks());

  it("allows requests up to the configured limit", () => {
    const limiter = createMemoryRateLimiter({
      windowMs: 60_000, limit: 2, maxKeys: 10, keyGenerator: getSocketClientKey,
    });
    const first = response();
    const second = response();

    expect(limiter(request(), first.res)).toBe(false);
    expect(limiter(request(), second.res)).toBe(false);
    expect(second.headers["RateLimit-Remaining"]).toBe("0");
  });

  it("rejects excess requests with 429 and Retry-After", () => {
    const limiter = createMemoryRateLimiter({
      windowMs: 60_000, limit: 1, maxKeys: 10, keyGenerator: getSocketClientKey,
    });
    const first = response();
    const second = response();

    expect(limiter(request(), first.res)).toBe(false);
    expect(limiter(request(), second.res)).toBe(true);
    expect(second.state.statusCode).toBe(429);
    expect(Number(second.headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("tracks separate socket peers independently", () => {
    const limiter = createMemoryRateLimiter({
      windowMs: 60_000, limit: 1, maxKeys: 10, keyGenerator: getSocketClientKey,
    });

    expect(limiter(request("192.0.2.10"), response().res)).toBe(false);
    expect(limiter(request("192.0.2.11"), response().res)).toBe(false);
  });

  it("does not use untrusted X-Forwarded-For as the client key", () => {
    const req = {
      socket: { remoteAddress: "192.0.2.20" },
      headers: { "x-forwarded-for": "198.51.100.99" },
    } as unknown as Request;

    expect(getSocketClientKey(req)).toBe("192.0.2.20");
  });

  it("fails closed when the bounded key table is full of active entries", () => {
    const limiter = createMemoryRateLimiter({
      windowMs: 60_000, limit: 1, maxKeys: 1, keyGenerator: getSocketClientKey,
    });
    const first = response();
    const second = response();

    expect(limiter(request("192.0.2.1"), first.res)).toBe(false);
    expect(limiter(request("192.0.2.2"), second.res)).toBe(true);
    expect(second.state.statusCode).toBe(429);
  });
});
