import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { sql } from "@/lib/db";
import { encrypt } from "@/lib/social-token-crypto";

export const dynamic = "force-dynamic";
const ACCOUNTS = {
  info: "info.nextedgeaccesssolutions@gmail.com",
  operations: "nextedgeaccesssolutions@gmail.com",
} as const;

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
function finish(req: Request, result: string) {
  return NextResponse.redirect(new URL("/admin/ai-workforce/email?gmail=" + encodeURIComponent(result), req.url));
}

export async function GET(req: Request) {
  const user = await getUser();
  const jar = await cookies();
  const expectedState = jar.get("neas_gmail_oauth_state")?.value ?? "";
  const accountKey = jar.get("neas_gmail_oauth_account")?.value as keyof typeof ACCOUNTS | undefined;
  jar.delete("neas_gmail_oauth_state");
  jar.delete("neas_gmail_oauth_account");
  if (!user || user.role !== "admin") return finish(req, "admin-required");
  const incoming = new URL(req.url);
  if (incoming.searchParams.has("error")) return finish(req, "google-denied");
  const state = incoming.searchParams.get("state") ?? "";
  const code = incoming.searchParams.get("code") ?? "";
  if (!expectedState || !state || !same(expectedState, state) || !code || !accountKey || !(accountKey in ACCOUNTS)) return finish(req, "invalid-state");

  try {
    await loadConfig(true);
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
    if (!clientId || !clientSecret) return finish(req, "missing-client");
    const redirectUri = new URL("/api/admin/gmail/callback", incoming.origin).toString();
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      cache: "no-store",
    });
    const token = await tokenRes.json();
    if (!tokenRes.ok || !token.access_token) return finish(req, "token-exchange-failed");
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { authorization: "Bearer " + token.access_token }, cache: "no-store" });
    const profile = await profileRes.json();
    const expectedEmail = ACCOUNTS[accountKey];
    if (!profileRes.ok || String(profile.email ?? "").toLowerCase() !== expectedEmail || profile.verified_email !== true) return finish(req, "wrong-google-account");
    if (!token.refresh_token) return finish(req, "refresh-token-missing");
    if (!process.env.TOKEN_ENCRYPTION_KEY || !/^[0-9a-f]{64}$/i.test(process.env.TOKEN_ENCRYPTION_KEY)) return finish(req, "missing-encryption-key");
    const encrypted = encrypt(JSON.stringify({ access_token: token.access_token, refresh_token: token.refresh_token, token_type: token.token_type, scope: token.scope, expires_at: Date.now() + Number(token.expires_in || 3600) * 1000 }));
    await sql`insert into aiw_gmail_accounts (account_key,email,token_enc,scope,expires_at,status,last_error,connected_by,connected_at,updated_at)
      values (${accountKey},${expectedEmail},${encrypted},${String(token.scope ?? "")},now() + (${Number(token.expires_in || 3600)} * interval '1 second'),'connected',null,${user.id},now(),now())
      on conflict (account_key) do update set email=excluded.email,token_enc=excluded.token_enc,scope=excluded.scope,expires_at=excluded.expires_at,status='connected',last_error=null,connected_by=excluded.connected_by,connected_at=now(),updated_at=now()`;
    return finish(req, "connected");
  } catch {
    return finish(req, "connection-error");
  }
}
