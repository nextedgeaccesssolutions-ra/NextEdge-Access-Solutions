import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decrypt, encrypt } from "./social-token-crypto";

const saved = { ...process.env };
const LEGACY_DATABASE_URL = "postgres://legacy-db-key@example.test/neas";

function legacyEncrypt(plaintext: string, credential: string): string {
  const key = createHash("sha256").update("neas-token-v1:" + credential).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

describe("social OAuth token encryption", () => {
  beforeEach(() => {
    process.env = { ...saved };
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.POSTGRES_URL;
    delete process.env.SESSION_SECRET;
    process.env.DATABASE_URL = LEGACY_DATABASE_URL;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("refuses new token writes when only database credentials are configured", () => {
    expect(() => encrypt("facebook-token")).toThrow(/TOKEN_ENCRYPTION_KEY is required/);
  });

  it("rejects a missing-strength or malformed dedicated key", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "not-a-256-bit-key";
    expect(() => encrypt("facebook-token")).toThrow(/64 hexadecimal characters/);
  });

  it("writes a versioned v2 envelope and round-trips with a dedicated key", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
    const blob = encrypt("facebook-token");

    expect(blob.split(".")).toHaveLength(4);
    expect(blob.startsWith("v2.")).toBe(true);
    expect(decrypt(blob)).toBe("facebook-token");
  });

  it("keeps v2 ciphertext readable after database and session credentials change", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "b".repeat(64);
    const blob = encrypt("linkedin-token");

    process.env.DATABASE_URL = "postgres://rotated-db-key@example.test/neas";
    process.env.POSTGRES_URL = "postgres://another-db-key@example.test/neas";
    process.env.SESSION_SECRET = "s".repeat(40);

    expect(decrypt(blob)).toBe("linkedin-token");
  });

  it("reads legacy database-derived ciphertext while new writes use the dedicated key", () => {
    const legacy = legacyEncrypt("legacy-facebook-token", LEGACY_DATABASE_URL);
    process.env.TOKEN_ENCRYPTION_KEY = "c".repeat(64);

    expect(decrypt(legacy)).toBe("legacy-facebook-token");
    expect(() => encrypt("new-facebook-token")).not.toThrow();
  });

  it("tries POSTGRES_URL when DATABASE_URL no longer matches legacy ciphertext", () => {
    const originalPostgresUrl = "postgres://original-postgres-key@example.test/neas";
    const legacy = legacyEncrypt("legacy-youtube-token", originalPostgresUrl);
    process.env.DATABASE_URL = "postgres://rotated-database-key@example.test/neas";
    process.env.POSTGRES_URL = originalPostgresUrl;
    process.env.TOKEN_ENCRYPTION_KEY = "d".repeat(64);

    expect(decrypt(legacy)).toBe("legacy-youtube-token");
  });

  it("continues to read ciphertext created with the previous explicit token key", () => {
    const previousKey = "previous-token-encryption-key";
    const legacy = legacyEncrypt("legacy-tiktok-token", previousKey);
    process.env.TOKEN_ENCRYPTION_KEY = previousKey;

    expect(decrypt(legacy)).toBe("legacy-tiktok-token");
  });

  it("rejects tampered v2 ciphertext", () => {
    process.env.TOKEN_ENCRYPTION_KEY = "e".repeat(64);
    const parts = encrypt("instagram-token").split(".");
    parts[2] = (parts[2][0] === "A" ? "B" : "A") + parts[2].slice(1);

    expect(() => decrypt(parts.join("."))).toThrow();
  });

  it("rejects unsupported ciphertext formats", () => {
    expect(() => decrypt("unsupported.token.format.version")).toThrow(/Unsupported/);
  });
});
