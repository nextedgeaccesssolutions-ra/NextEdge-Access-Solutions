import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

/** New social-token writes require an independently managed 256-bit key. */
function dedicatedKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required to save social account tokens.");
  }
  if (!/^[0-9a-f]{64}$/i.test(raw)) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).");
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_BYTES) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

/**
 * Read-only compatibility for tokens written before TOKEN_ENCRYPTION_KEY existed.
 * Keep the original credential available until every legacy social account has
 * been reconnected or refreshed. These keys are never used for new encryption.
 */
function legacyKeys(): Buffer[] {
  const bases = [
    process.env.TOKEN_ENCRYPTION_KEY,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.SESSION_SECRET,
  ].filter((base): base is string => Boolean(base));
  const uniqueBases = [...new Set(bases)];
  if (uniqueBases.length === 0) {
    throw new Error("Cannot decrypt legacy social tokens without the original deployment credential.");
  }
  return uniqueBases.map((base) =>
    createHash("sha256").update("neas-token-v1:" + base).digest(),
  );
}

function decryptParts(parts: string[], key: Buffer): string {
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("Invalid encrypted social token envelope.");
  }
  const [ivText, tagText, ciphertextText] = parts;
  const iv = Buffer.from(ivText, "base64url");
  const tag = Buffer.from(tagText, "base64url");
  const ciphertext = Buffer.from(ciphertextText, "base64url");
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES || ciphertext.length === 0) {
    throw new Error("Invalid encrypted social token envelope.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Encrypt new OAuth tokens with a versioned AES-256-GCM envelope and dedicated key. */
export function encrypt(text: string): string {
  const key = dedicatedKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return ["v2", iv, cipher.getAuthTag(), ciphertext]
    .map((part) => typeof part === "string" ? part : part.toString("base64url"))
    .join(".");
}

/** Read v2 tokens with TOKEN_ENCRYPTION_KEY; read legacy tokens only for migration. */
export function decrypt(blob: string): string {
  if (typeof blob !== "string") {
    throw new Error("Invalid encrypted social token value.");
  }
  const parts = blob.split(".");
  if (parts.length === 4 && parts[0] === "v2") {
    return decryptParts(parts.slice(1), dedicatedKey());
  }
  if (parts.length === 3) {
    for (const key of legacyKeys()) {
      try {
        return decryptParts(parts, key);
      } catch {
        // Try the next configured historical credential.
      }
    }
    throw new Error("Cannot authenticate legacy social token with the available deployment credentials.");
  }
  throw new Error("Unsupported social token encryption version.");
}
