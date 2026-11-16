import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptConfigBlob, decryptConfigObject, encryptConfigBlob } from "./config-crypto";

const envKeys = ["CONFIG_ENCRYPTION_KEY", "DATABASE_URL", "POSTGRES_URL", "SESSION_SECRET"] as const;
const originalEnv = new Map<string, string | undefined>();

function legacyEncrypt(plaintext: string, credential?: string): string {
  const base = credential ?? process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.SESSION_SECRET ?? "neas";
  const key = createHash("sha256").update("neas-config-v1:" + base).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

describe("admin integration settings encryption", () => {
  beforeEach(() => {
    originalEnv.clear();
    for (const key of envKeys) {
      originalEnv.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = originalEnv.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("requires a dedicated key for new writes even when a database URL exists", () => {
    process.env.DATABASE_URL = "postgres://user:password@db.example.test/neas";
    expect(() => encryptConfigBlob("{}")).toThrow(/CONFIG_ENCRYPTION_KEY/);
  });

  it("rejects a malformed dedicated key", () => {
    process.env.CONFIG_ENCRYPTION_KEY = "not-a-32-byte-hex-key";
    expect(() => encryptConfigBlob("{}")).toThrow(/64 hexadecimal characters/);
  });

  it("writes a versioned AES-256-GCM envelope and round-trips with the dedicated key", () => {
    process.env.CONFIG_ENCRYPTION_KEY = "a".repeat(64);
    const plaintext = JSON.stringify({ META_APP_SECRET: "test-value" });
    const blob = encryptConfigBlob(plaintext);
    expect(blob.split(".")).toHaveLength(4);
    expect(blob.startsWith("v2.")).toBe(true);
    expect(decryptConfigBlob(blob)).toBe(plaintext);
    expect(decryptConfigObject(blob)).toEqual({ META_APP_SECRET: "test-value" });
  });

  it("reads legacy database-derived ciphertext so the next admin save can migrate the whole settings bundle", () => {
    process.env.DATABASE_URL = "postgres://legacy-user:legacy-password@db.example.test/neas";
    const legacy = legacyEncrypt(JSON.stringify({ LINKEDIN_CLIENT_SECRET: "legacy-value" }));
    process.env.CONFIG_ENCRYPTION_KEY = "b".repeat(64);
    expect(decryptConfigObject(legacy)).toEqual({ LINKEDIN_CLIENT_SECRET: "legacy-value" });
  });

  it("tries the previous Postgres credential when DATABASE_URL has rotated", () => {
    const previousUrl = "postgres://previous-user:previous-password@old-db.example.test/neas";
    process.env.DATABASE_URL = "postgres://current-user:current-password@new-db.example.test/neas";
    process.env.POSTGRES_URL = previousUrl;
    const legacy = legacyEncrypt(JSON.stringify({ LINKEDIN_CLIENT_SECRET: "legacy-value" }), previousUrl);
    expect(decryptConfigObject(legacy)).toEqual({ LINKEDIN_CLIENT_SECRET: "legacy-value" });
  });

  it("does not accept legacy ciphertext protected only by the historical hardcoded fallback", () => {
    const legacy = legacyEncrypt(JSON.stringify({ RESEND_API_KEY: "legacy-value" }));
    expect(() => decryptConfigObject(legacy)).toThrow(/original deployment credential/);
  });

  it("requires the dedicated key to decrypt v2 data and never falls back to the database URL", () => {
    process.env.CONFIG_ENCRYPTION_KEY = "c".repeat(64);
    const blob = encryptConfigBlob("{}");
    delete process.env.CONFIG_ENCRYPTION_KEY;
    process.env.DATABASE_URL = "postgres://user:password@db.example.test/neas";
    expect(() => decryptConfigBlob(blob)).toThrow(/CONFIG_ENCRYPTION_KEY/);
  });

  it("rejects tampered ciphertext instead of returning an empty settings object", () => {
    process.env.CONFIG_ENCRYPTION_KEY = "d".repeat(64);
    const blob = encryptConfigBlob(JSON.stringify({ RESEND_API_KEY: "test-value" }));
    const parts = blob.split(".");
    const ciphertext = Buffer.from(parts[3], "base64url");
    ciphertext[0] ^= 1;
    parts[3] = ciphertext.toString("base64url");
    expect(() => decryptConfigObject(parts.join("."))).toThrow();
  });

  it("does not swallow saved-settings decryption failures before an admin save", () => {
    const source = readFileSync(new URL("./config.ts", import.meta.url), "utf8");
    const start = source.indexOf("async function readSaved");
    const end = source.indexOf("\nfunction effectiveValue", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const readSaved = source.slice(start, end);
    expect(readSaved).toContain("return decryptConfigObject(blob);");
    expect(readSaved).not.toMatch(/catch/);
  });
});
