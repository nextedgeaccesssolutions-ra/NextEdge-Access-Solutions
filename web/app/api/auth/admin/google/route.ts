import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { rateLimitRequest } from "@/lib/rate-limit";
import { loadConfig } from "@/lib/config";

const COOKIE = "neas_admin_google_oauth";

/** Names the missing configuration in the server log only. The browser keeps the
 *  generic "unavailable" message so an anonymous visitor learns nothing about setup. */
function logMissingConfig(where: string, clientId?: string, clientSecret?: string, allowCount = 0) {
  const missing = [
    !clientId && "GOOGLE_CLIENT_ID",
    !clientSecret && "GOOGLE_CLIENT_SECRET",
    allowCount === 0 && "ADMIN_GOOGLE_EMAILS",
  ].filter(Boolean);
  if (missing.length) console.warn(`[admin-google:${where}] not configured, missing: ${missing.join(", ")}`);
}

export async function GET(req: Request) {
  const limited = rateLimitRequest(req, "admin-google-start", 20, 15 * 60_000);
  if (limited) return limited;
  // Preview deployments must hand off to the canonical host before checking
  // credentials or setting the OAuth state cookie. OAuth is configured on the
  // production deployment, and cookies cannot be shared across preview hosts.
  const canonicalOrigin = publicOrigin(req);
  if (new URL(req.url).origin !== canonicalOrigin) {
    return NextResponse.redirect(new URL("/api/auth/admin/google", canonicalOrigin), 307);
  }

  await loadConfig().catch(() => {});
  // Trim: values pasted into Vercel often carry a trailing newline, which Google
  // tolerates on the consent screen but not in the token exchange or the ID-token audience.
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const allowed = (process.env.ADMIN_GOOGLE_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!clientId || !clientSecret || allowed.length === 0) {
    logMissingConfig("start", clientId, clientSecret, allowed.length);
    return NextResponse.redirect(new URL("/admin/login?google_error=unavailable", canonicalOrigin));
  }

  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = `${canonicalOrigin}/api/auth/admin/google/callback`;

  (await cookies()).set(COOKIE, JSON.stringify({ state, nonce, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return NextResponse.redirect(authorize);
}
