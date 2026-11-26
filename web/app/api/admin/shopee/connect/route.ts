import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { publicOrigin } from "@/lib/origin";
import { authUrl, shopeeCreds } from "@/lib/shopee";

/** Starts Shopee shop authorization. The admin logs in to Shopee Seller Centre and approves. */
export async function GET(req: Request) {
  const origin = publicOrigin(req);
  if (!(await requireAdmin())) return NextResponse.redirect(new URL("/admin/login", origin));
  const c = shopeeCreds();
  if (!c) return NextResponse.redirect(new URL("/admin?s=shopee&shopee=missing_keys", origin));
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("neas_shopee_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/admin/shopee", maxAge: 900 });
  return NextResponse.redirect(authUrl(c, `${origin}/api/admin/shopee/callback?state=${state}`));
}
