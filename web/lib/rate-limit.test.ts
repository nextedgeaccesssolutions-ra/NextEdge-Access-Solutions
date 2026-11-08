import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("bounded API rate limiter", () => {
  it("allows the configured number of requests and then blocks", () => {
    const limit = createRateLimiter();
    expect(limit("192.0.2.1", "login", 2, 60_000, 1_000).allowed).toBe(true);
    expect(limit("192.0.2.1", "login", 2, 60_000, 2_000).allowed).toBe(true);
    const blocked = limit("192.0.2.1", "login", 2, 60_000, 3_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets an expired window", () => {
    const limit = createRateLimiter();
    expect(limit("192.0.2.1", "login", 1, 1_000, 1_000).allowed).toBe(true);
    expect(limit("192.0.2.1", "login", 1, 1_000, 1_500).allowed).toBe(false);
    expect(limit("192.0.2.1", "login", 1, 1_000, 2_001).allowed).toBe(true);
  });

  it("keeps separate endpoint namespaces independent", () => {
    const limit = createRateLimiter();
    expect(limit("192.0.2.1", "login", 1, 60_000, 1_000).allowed).toBe(true);
    expect(limit("192.0.2.1", "signup", 1, 60_000, 1_001).allowed).toBe(true);
  });

  it("fails closed rather than growing beyond its key cap", () => {
    const limit = createRateLimiter(1);
    expect(limit("192.0.2.1", "login", 1, 60_000, 1_000).allowed).toBe(true);
    expect(limit("192.0.2.2", "login", 1, 60_000, 1_001).allowed).toBe(false);
  });
});
