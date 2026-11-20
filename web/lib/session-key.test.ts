import { createHash } from "node:crypto";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { hasStrongSessionSecret, strongKey, signingKey, verifyKeys } from "./session-key";

const LONG = "x".repeat(32);
const DB = "postgres://user:pw@db.example.org:5432/neas";
const buf = (key: Uint8Array) => Buffer.from(key);

describe("session signing keys", () => {
  const saved = { ...process.env };

  beforeEach(() => {
    delete process.env.SESSION_SECRET;
    delete process.env.DATABASE_URL;
    delete process.env.POSTGRES_URL;
  });

  afterEach(() => {
    process.env = { ...saved };
  });

  it("signs with SESSION_SECRET when it is set", () => {
    process.env.SESSION_SECRET = LONG;
    process.env.DATABASE_URL = DB;
    expect(buf(signingKey())).toEqual(buf(strongKey()!));
  });

  it("verifies with only the dedicated session secret", () => {
    process.env.SESSION_SECRET = LONG;
    process.env.DATABASE_URL = DB;
    const keys = verifyKeys();
    expect(keys).toHaveLength(1);
    expect(buf(keys[0])).toEqual(buf(strongKey()!));
  });

  it("rejects a fresh JWT signed with the database-derived legacy key", async () => {
    process.env.SESSION_SECRET = LONG;
    process.env.DATABASE_URL = DB;

    // Reproduce the former derivation to model an attacker who knows DATABASE_URL.
    const legacy = new Uint8Array(
      createHash("sha256").update("neas-session-v1:" + DB).digest()
    );
    const forged = await new SignJWT({ uid: 7 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(legacy);

    const [trustedKey] = verifyKeys();
    await expect(jwtVerify(forged, trustedKey)).rejects.toThrow();
  });

  it("rejects a cookie signed with an unrelated key", async () => {
    process.env.SESSION_SECRET = LONG;
    process.env.DATABASE_URL = DB;
    const forged = await new SignJWT({ uid: 1 })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(new TextEncoder().encode("y".repeat(32)));

    await expect(jwtVerify(forged, verifyKeys()[0])).rejects.toThrow();
  });

  it("fails closed when SESSION_SECRET is missing even if DATABASE_URL exists", () => {
    process.env.DATABASE_URL = DB;
    expect(strongKey()).toBeNull();
    expect(hasStrongSessionSecret()).toBe(false);
    expect(() => signingKey()).toThrow(/SESSION_SECRET/);
    expect(() => verifyKeys()).toThrow(/SESSION_SECRET/);
  });

  it("treats a SESSION_SECRET under 32 characters as absent", () => {
    process.env.SESSION_SECRET = "tooshort";
    process.env.DATABASE_URL = DB;
    expect(strongKey()).toBeNull();
    expect(hasStrongSessionSecret()).toBe(false);
    expect(() => signingKey()).toThrow(/SESSION_SECRET/);
    expect(() => verifyKeys()).toThrow(/SESSION_SECRET/);
  });

  it("throws when neither a secret nor a database URL exists", () => {
    expect(() => verifyKeys()).toThrow(/SESSION_SECRET/);
    expect(() => signingKey()).toThrow(/SESSION_SECRET/);
  });
});
