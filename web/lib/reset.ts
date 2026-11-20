import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { sql } from "./db";
import { publicOrigin } from "./origin";

const hash = (t: string) => createHash("sha256").update(t).digest("hex");

/** One-time reset token, valid for `hours`. Only its SHA-256 hash is stored. */
export async function createResetLink(userId: number, origin: string, hours = 1): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await sql`delete from password_resets where user_id = ${userId} and (used_at is not null or expires_at < now())`;
  await sql`insert into password_resets (token_hash, user_id, expires_at) values (${hash(token)}, ${userId}, now() + make_interval(hours => ${hours}))`;
  return `${origin}/reset-password?token=${token}`;
}

export async function useResetToken(token: string, password: string): Promise<{ ok: true; role: string } | { error: string }> {
  if (!/^[A-Za-z0-9_-]{30,100}$/.test(token)) return { error: "This reset link is invalid." };
  if (password.length < 8 || password.length > 200) return { error: "Password must be at least 8 characters." };
  const ph = await bcrypt.hash(password, 12);
  const result = await sql.begin(async (tx) => {
    // Claim the token atomically. Concurrent requests can consume it only once.
    const claimed = await tx`update password_resets set used_at = now()
      where token_hash = ${hash(token)} and used_at is null and expires_at > now()
      returning user_id`;
    if (!claimed.length) return null;

    const userId = claimed[0].user_id;
    const user = (await tx`select role from users where id = ${userId} for update`)[0];
    if (!user) throw new Error("Reset token account no longer exists.");

    await tx`update users set password_hash = ${ph} where id = ${userId}`;
    await tx`update password_resets set used_at = now() where user_id = ${userId} and used_at is null`;
    return { role: user.role as string };
  });
  if (!result) return { error: "This reset link is invalid, expired or already used. Request a new one." };
  return { ok: true, role: result.role };
}

const DEFAULT_FROM = "NEAS <no-reply@nextedge-access-solutions.com>";

/** Sends email through Resend when RESEND_API_KEY and MAIL_FROM are set. Returns false if email isn't configured or failed. */
export async function sendResetEmail(to: string, link: string): Promise<boolean> {
  await (await import("./config")).loadConfig().catch(() => {});
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM || DEFAULT_FROM;
  if (!key) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST", headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject: "Reset your NEAS password",
        html: `<p>Hello,</p><p>Someone asked to reset the password for your NEAS account. Click the link below within 1 hour to choose a new password:</p><p><a href="${link}">Reset my password</a></p><p>If you didn't ask for this, you can ignore this email.</p><p>NextEdge Access Solutions</p>` }),
    });
    return r.ok;
  } catch { return false; }
}

export const emailConfigured = () => !!process.env.RESEND_API_KEY;

/**
 * Canonical public origin. Re-exported from this module because the reset,
 * social and marketing routes already import it from here.
 */
export const originOf = publicOrigin;
