import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { loadConfig } from "@/lib/config";
import { ensureAiwGmailAccountsTable, GMAIL_ACCOUNTS, gmailSendScopeApproved } from "@/lib/aiw-gmail";

export const dynamic = "force-dynamic";
function getCanonicalCallback(origin: string) {
  const configured = process.env.SITE_URL?.trim() || origin;
  const base = new URL(configured);
  if (base.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL must use HTTPS in production.");
  }
  return new URL("/api/admin/gmail/callback", base.origin).toString();
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  await loadConfig(true);
  await ensureAiwGmailAccountsTable();
  const url = new URL(req.url);
  const key = url.searchParams.get("account") as keyof typeof GMAIL_ACCOUNTS | null;
  if (!key || !(key in GMAIL_ACCOUNTS)) return NextResponse.json({ error: "Choose a valid NEAS mailbox." }, { status: 400 });
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) return NextResponse.redirect(new URL("/admin/ai-workforce/email?gmail=missing-client", url.origin));
  let callback: string;
  try {
    callback = getCanonicalCallback(url.origin);
  } catch {
    return NextResponse.redirect(new URL("/admin/ai-workforce/email?gmail=invalid-site-url", url.origin));
  }
  const state = randomBytes(32).toString("base64url");
  const jar = await cookies();
  jar.set("neas_gmail_oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/gmail/callback", maxAge: 600 });
  jar.set("neas_gmail_oauth_account", key, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/admin/gmail/callback", maxAge: 600 });
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callback,
    response_type: "code",
    scope: ["openid", "email", "profile", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.compose", ...(gmailSendScopeApproved() ? ["https://www.googleapis.com/auth/gmail.send"] : [])].join(" "),
    access_type: "offline",
    prompt: "consent select_account",
    login_hint: GMAIL_ACCOUNTS[key],
    state,
    include_granted_scopes: "true",
  }).toString();
  return NextResponse.redirect(auth);
}
