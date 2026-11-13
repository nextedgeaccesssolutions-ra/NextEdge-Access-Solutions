import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { sql } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { publicOrigin } from "@/lib/origin";

const COOKIE = "neas_admin_google_oauth";
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function fail(req: Request, reason = "denied") {
  return NextResponse.redirect(new URL(`/admin/login?google_error=${encodeURIComponent(reason)}`, req.url));
}

export async function GET(req: Request) {
  const jar = await cookies();
  let saved: { state?: string; nonce?: string; verifier?: string } = {};
  try { saved = JSON.parse(jar.get(COOKIE)?.value ?? "{}"); } catch {}
  jar.delete(COOKIE, { path: "/api/auth/admin/google" });

  const url = new URL(req.url);
  if (url.searchParams.has("error")) return fail(req, "cancelled");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state || !saved.state || state !== saved.state || !saved.nonce || !saved.verifier) {
    return fail(req, "expired");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const allowlist = new Set((process.env.ADMIN_GOOGLE_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
  if (!clientId || !clientSecret || allowlist.size === 0) return fail(req, "unavailable");

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
    const tokens = await tokenResponse.json();
    if (!tokenResponse.ok || typeof tokens.id_token !== "string") return fail(req, "verification");
    idToken = tokens.id_token;
  } catch {
    return fail(req, "verification");
  }

  let email = "";
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_KEYS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience: clientId,
    });
    if (payload.nonce !== saved.nonce || payload.email_verified !== true || typeof payload.email !== "string") {
      return fail(req, "verification");
    }
    email = payload.email.trim().toLowerCase();
  } catch {
    return fail(req, "verification");
  }

  if (!allowlist.has(email)) return fail(req, "denied");

  const user = (await sql`select id, role from users where lower(email) = ${email} limit 1`)[0];
  if (!user || user.role !== "admin") return fail(req, "denied");

  await createSession(Number(user.id));
  return NextResponse.redirect(new URL("/admin", req.url));
}
