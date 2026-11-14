import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import { strongKey, legacyKey, signingKey, verifyKeys } from "./session-key";

const LONG = "x".repeat(32);
const DB = "postgres://user:pw@db.example.org:5432/neas";
const buf = (k: Uint8Array) => Buffer.from(k);

describe("session signing keys", () => {
  const saved = { ...process.env };
  beforeEach(() => { delete process.env.SESSION_SECRET; delete process.env.DATABASE_URL; delete process.env.POSTGRES_URL; });
  afterEach(() => { process.env = { ...saved }; });

  it("signs with SESSION_SECRET when it is set", () => {
    process.env.SESSION_SECRET = LONG;
    process.env.DATABASE_URL = DB;
    expect(buf(signingKey())).toEqual(buf(strongKey()!));
  });

  it("never signs with the database-derived key once SESSION_SECRET is set", () => {
    process.env.SESSION_SECRET = LONG;
    process.env.DATABASE_URL = DB;
    expect(buf(signingKey())).not.toEqual(buf(legacyKey()!));
  });

  it("still accepts a cookie signed with the legacy key after SESSION_SECRET is set", async () => {
    // A session issued before SESSION_SECRET existed.
    process.env.DATABASE_URL = DB;
    const old = await new SignJWT({ uid: 7 }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(signingKey());

    // The operator now sets SESSION_SECRET. That cookie must keep working.
    process.env.SESSION_SECRET = LONG;
    const keys = verifyKeys();
    expect(keys).toHaveLength(2);
    let uid: number | null = null;
    for (const k of keys) { try { uid = Number((await jwtVerify(old, k)).payload.uid); break; } catch { /* next key */ } }
    expect(uid).toBe(7);
  });

  it("rejects a cookie signed with an unrelated key", async () => {
    process.env.SESSION_SECRET = LONG;
    process.env.DATABASE_URL = DB;
    const forged = await new SignJWT({ uid: 1 }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(new TextEncoder().encode("y".repeat(32)));
    let accepted = false;
    for (const k of verifyKeys()) { try { await jwtVerify(forged, k); accepted = true; } catch { /* expected */ } }
    expect(accepted).toBe(false);
  });

  it("treats a SESSION_SECRET under 32 characters as absent", () => {
    process.env.SESSION_SECRET = "tooshort";
    process.env.DATABASE_URL = DB;
    expect(strongKey()).toBeNull();
    expect(buf(signingKey())).toEqual(buf(legacyKey()!));
  });

  it("throws when neither a secret nor a database URL exists", () => {
    expect(() => verifyKeys()).toThrow(/SESSION_SECRET/);
    expect(() => signingKey()).toThrow(/SESSION_SECRET/);
  });
});
