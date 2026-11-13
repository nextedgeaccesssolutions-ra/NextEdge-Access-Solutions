import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { loadConfig } from "@/lib/config";

const COOKIE = "neas_admin_google_oauth";

export async function GET(req: Request) {
  await loadConfig().catch(() => {});
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const allowed = (process.env.ADMIN_GOOGLE_EMAILS || "").split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
  if (!clientId || !clientSecret || allowed.length === 0) {
    return NextResponse.redirect(new URL("/admin/login?google_error=unavailable", req.url));
  }

  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const redirectUri = `${publicOrigin(req)}/api/auth/admin/google/callback`;

  (await cookies()).set(COOKIE, JSON.stringify({ state, nonce, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/admin/google",
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
