import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cronToken } from "./cron-token";

const keys = ["CRON_SECRET", "SESSION_SECRET", "DATABASE_URL", "POSTGRES_URL"] as const;
const saved = new Map<string, string | undefined>();

describe("scheduled-publishing credential", () => {
  beforeEach(() => {
    saved.clear();
    for (const key of keys) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of keys) {
      const value = saved.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("uses an explicit CRON_SECRET of at least 32 characters", () => {
    const secret = "c".repeat(32);
    process.env.CRON_SECRET = secret;
    expect(cronToken()).toBe(secret);
  });

  it("fails closed when CRON_SECRET is missing instead of deriving a token from other credentials", () => {
    process.env.SESSION_SECRET = "s".repeat(40);
    process.env.DATABASE_URL = "postgres://user:password@db.example.test/neas";
    process.env.POSTGRES_URL = "postgres://user:password@db.example.test/neas";
    expect(cronToken()).toBeNull();
  });

  it("rejects a short CRON_SECRET and does not fall back to database or session credentials", () => {
    process.env.CRON_SECRET = "too-short";
    process.env.SESSION_SECRET = "s".repeat(40);
    process.env.DATABASE_URL = "postgres://user:password@db.example.test/neas";
    expect(cronToken()).toBeNull();
  });
});
