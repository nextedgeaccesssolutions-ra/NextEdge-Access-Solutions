import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/config";
import { PROVIDERS, enabled, isProvider, redirectUri } from "@/lib/oauth";

export async function GET(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  if (!isProvider(provider)) return NextResponse.redirect(new URL("/login?error=unavailable", req.url));
  // Keys an admin saved in the Marketing Command Center live encrypted in the database, not in the
  // hosting environment. loadConfig() hydrates them into process.env before we test for them.
  await loadConfig().catch(() => {});
  if (!enabled(provider)) return NextResponse.redirect(new URL("/login?error=unavailable", req.url));
  const next = new URL(req.url).searchParams.get("next") || "/store";
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("neas_oauth", JSON.stringify({ state, provider, next: next.startsWith("/") && !next.startsWith("//") ? next : "/store" }),
    { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  const cfg = PROVIDERS[provider];
  const url = new URL(cfg.authorize);
  url.search = new URLSearchParams({ client_id: cfg.id()!, redirect_uri: redirectUri(req, provider), response_type: "code", scope: cfg.scope, state, ...(provider === "google" ? { prompt: "select_account" } : {}) }).toString();
  return NextResponse.redirect(url);
}
