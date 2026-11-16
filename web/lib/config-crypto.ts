import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function dedicatedKey(): Buffer {
  const raw = process.env.CONFIG_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("CONFIG_ENCRYPTION_KEY is required to save admin-managed integration settings.");
  }
  if (!/^[0-9a-f]{64}$/i.test(raw)) {
    throw new Error("CONFIG_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).");
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_BYTES) throw new Error("CONFIG_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  return key;
}

/**
 * Compatibility keys for ciphertext written before CONFIG_ENCRYPTION_KEY existed.
 * They are decrypt-only: all new writes require the independent deployment secret.
 * Never retain the historical hardcoded "neas" fallback as a migration key.
 */
function legacyKeys(): Buffer[] {
  const bases = [process.env.DATABASE_URL, process.env.POSTGRES_URL, process.env.SESSION_SECRET]
    .filter((base): base is string => Boolean(base));
  const uniqueBases = [...new Set(bases)];
  if (uniqueBases.length === 0) {
    throw new Error("Cannot decrypt legacy integration settings without the original deployment credential.");
  }
  return uniqueBases.map((base) => createHash("sha256").update("neas-config-v1:" + base).digest());
}

function decryptParts(parts: string[], key: Buffer): string {
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Invalid encrypted integration settings envelope.");
  }
  const [ivText, tagText, ciphertextText] = parts;
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const ciphertext = Buffer.from(ciphertextText, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || ciphertext.length === 0) {
    throw new Error("Invalid encrypted integration settings envelope.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Encrypts new settings with a dedicated, deployment-managed AES-256-GCM key. */
export function encryptConfigBlob(plaintext: string): string {
  const key = dedicatedKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v2", iv, tag, ciphertext].map((part) => typeof part === "string" ? part : part.toString("base64url")).join(".");
}

/** Reads v2 ciphertext with CONFIG_ENCRYPTION_KEY and legacy ciphertext only for migration. */
export function decryptConfigBlob(blob: string): string {
  if (typeof blob !== "string") throw new Error("Invalid encrypted integration settings value.");
  const parts = blob.split(".");
  if (parts.length === 4 && parts[0] === "v2") {
    return decryptParts(parts.slice(1), dedicatedKey());
  }
  if (parts.length === 3) {
    let authenticated = false;
    for (const key of legacyKeys()) {
      try {
        const plaintext = decryptParts(parts, key);
        authenticated = true;
        return plaintext;
      } catch {
        // Try the next configured legacy credential; never fall back to a static key.
      }
    }
    if (!authenticated) {
      throw new Error("Cannot authenticate legacy integration settings with the available deployment credentials.");
    }
  }
  throw new Error("Unsupported encrypted integration settings version.");
}

/** Parses the encrypted settings object without swallowing authentication or JSON errors. */
export function decryptConfigObject(blob: string): Record<string, string> {
  const parsed: unknown = JSON.parse(decryptConfigBlob(blob));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Saved integration settings must be a JSON object.");
  }
  const entries = Object.entries(parsed);
  if (entries.some(([, value]) => typeof value !== "string")) {
    throw new Error("Saved integration settings contain a non-string value.");
  }
  return parsed as Record<string, string>;
}
