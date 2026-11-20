import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sql: vi.fn() }));

vi.mock("./db", () => ({ sql: mocks.sql }));
vi.mock("./social-video", () => ({
  googleAuthUrl: vi.fn(),
  tiktokAuthUrl: vi.fn(),
  connectGoogle: vi.fn(),
  connectTikTok: vi.fn(),
  publishVideoPlatform: vi.fn(),
}));

import { decrypt, encrypt } from "./social";

const saved = { ...process.env };

describe("social token encryption key selection", () => {
  beforeEach(() => {
    process.env = { ...saved };
    process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    delete process.env.SESSION_SECRET;
    process.env.DATABASE_URL = "postgres://legacy-db-key@example.test/neas";
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("keeps dedicated-key ciphertext readable when SESSION_SECRET is added", () => {
    const ciphertext = encrypt("legacy-facebook-token");

    process.env.SESSION_SECRET = "s".repeat(32);

    expect(decrypt(ciphertext)).toBe("legacy-facebook-token");
  });

  it("prefers an explicit token encryption key over database and session keys", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "b".repeat(64);
    const ciphertext = encrypt("stable-facebook-token");

    process.env.DATABASE_URL = "postgres://changed-db-key@example.test/neas";
    process.env.SESSION_SECRET = "n".repeat(32);

    expect(decrypt(ciphertext)).toBe("stable-facebook-token");
  });
});
