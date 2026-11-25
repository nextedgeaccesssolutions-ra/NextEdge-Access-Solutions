import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { hasStrongSessionSecret } from "@/lib/session-key";
import { publicOrigin } from "@/lib/origin";
import { rateLimitRequest } from "@/lib/rate-limit";
import { loadConfig } from "@/lib/config";

const COOKIE = "neas_admin_google_oauth";
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

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

/** Logs why verification failed (never tokens or secrets), so the generic browser
 *  message can be traced in the deployment's runtime logs. */
function verifyFail(req: Request, detail: string) {
  console.warn(`[admin-google:callback] verification failed: ${detail}`);
  return fail(req, "verification");
}

function fail(req: Request, reason = "denied") {
  return NextResponse.redirect(new URL(`/admin/login?google_error=${encodeURIComponent(reason)}`, req.url));
}

export async function GET(req: Request) {
  const limited = rateLimitRequest(req, "admin-google-callback", 30, 15 * 60_000);
  if (limited) return limited;
  if (!hasStrongSessionSecret()) return fail(req, "unavailable");

  await loadConfig().catch(() => {});
  const jar = await cookies();
  let saved: { state?: string; nonce?: string; verifier?: string } = {};
  try { saved = JSON.parse(jar.get(COOKIE)?.value ?? "{}"); } catch {}
  jar.delete(COOKIE);

  const url = new URL(req.url);
  if (url.searchParams.has("error")) return fail(req, "cancelled");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !saved.state || state !== saved.state || !saved.nonce || !saved.verifier) {
    return fail(req, "expired");
  }

  // Trimmed for the same reason as the start route: a stray newline breaks the
  // token exchange (invalid_client) and the ID-token audience check.
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const allowlist = new Set((process.env.ADMIN_GOOGLE_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
  if (!clientId || !clientSecret || allowlist.size === 0) {
    logMissingConfig("callback", clientId, clientSecret, allowlist.size);
    return fail(req, "unavailable");
  }

  const redirectUri = `${publicOrigin(req)}/api/auth/admin/google/callback`;
  let idToken: string;
  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: saved.verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });
    const tokens = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || typeof tokens.id_token !== "string") {
      // Google's error code (e.g. invalid_client, redirect_uri_mismatch, invalid_grant) is safe to log.
      return verifyFail(req, `token exchange ${tokenResponse.status} ${tokens.error ?? "no id_token"}${tokens.error_description ? ` (${tokens.error_description})` : ""}; redirect_uri=${redirectUri}`);
    }
    idToken = tokens.id_token;
  } catch (err) {
    return verifyFail(req, `token request threw: ${(err as Error).message}`);
  }

  let email = "";
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_KEYS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
      clockTolerance: 60,
    });
    if (payload.nonce !== saved.nonce) return verifyFail(req, "nonce mismatch");
    if (payload.email_verified !== true) return verifyFail(req, "Google account email is not verified");
    if (typeof payload.email !== "string") return verifyFail(req, "ID token has no email");
    email = payload.email.trim().toLowerCase();
  } catch (err) {
    return verifyFail(req, `ID token rejected: ${(err as Error).message}`);
  }

  if (!allowlist.has(email)) {
    console.warn(`[admin-google:callback] ${email} is not in ADMIN_GOOGLE_EMAILS`);
    return fail(req, "denied");
  }

  const user = (await sql`select id, role from users where lower(email) = ${email} limit 1`)[0];
  if (!user || user.role !== "admin") {
    console.warn(`[admin-google:callback] ${email} has no admin user record (role: ${user?.role ?? "none"})`);
    return fail(req, "denied");
  }

  await createSession(Number(user.id));
  return NextResponse.redirect(new URL("/admin", req.url));
}
