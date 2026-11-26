import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireAdmin } from "@/lib/admin";
import { publicOrigin } from "@/lib/origin";
import { connectShop, shopeeCreds } from "@/lib/shopee";

export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const back = (r: string) => NextResponse.redirect(new URL(`/admin?s=shopee&shopee=${r}`, origin));
  if (!(await requireAdmin())) return NextResponse.redirect(new URL("/admin/login", origin));
  const q = new URL(req.url).searchParams;
  const jar = await cookies();
  const expected = jar.get("neas_shopee_state")?.value;
  jar.delete("neas_shopee_state");
  if (!expected || q.get("state") !== expected) return back("state");
  const c = shopeeCreds();
  const code = q.get("code");
  const shopId = Number(q.get("shop_id"));
  if (!c) return back("missing_keys");
  if (!code || !Number.isInteger(shopId) || shopId <= 0) return back("denied");
  try {
    await connectShop(c, code, shopId);
    return back("connected");
  } catch (e) {
    console.warn("[shopee:callback] token exchange failed:", e instanceof Error ? e.message : e);
    return back("failed");
  }
}
