import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { ensureAiwGmailAccountsTable } from "@/lib/aiw-gmail";

export const dynamic = "force-dynamic";
const ACCOUNTS = {
  info: "info.nextedgeaccesssolutions@gmail.com",
  operations: "nextedgeaccesssolutions@gmail.com",
} as const;

export async function GET(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await loadConfig(true);
  await ensureAiwGmailAccountsTable();
  const url = new URL(req.url);
  const key = url.searchParams.get("account") as keyof typeof ACCOUNTS | null;
  if (!key || !(key in ACCOUNTS)) return NextResponse.json({ error: "Choose a valid NEAS mailbox." }, { status: 400 });
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return NextResponse.redirect(new URL("/admin/ai-workforce/email?gmail=missing-client", url.origin));
  const state = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set("neas_gmail_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/gmail/callback", maxAge: 600 });
  jar.set("neas_gmail_oauth_account", key, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/gmail/callback", maxAge: 600 });
  const callback = new URL("/api/admin/gmail/callback", url.origin).toString();
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    response_type: "code",
    scope: "openid email profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose",
    access_type: "offline",
    prompt: "consent select_account",
    login_hint: ACCOUNTS[key],
    state,
    include_granted_scopes: "true",
  }).toString();
  return NextResponse.redirect(auth);
}
