import { requireAdmin } from "@/lib/admin";
import { listProducts } from "@/lib/db";
import { bad, ok } from "@/lib/http";
import { EMPTY_LINK, getLink, listItems, matchItems, saveLink, shopeeCreds, updatePrice } from "@/lib/shopee";

export const maxDuration = 300;

function view(link: Awaited<ReturnType<typeof getLink>>) {
  return {
    configured: !!shopeeCreds(),
    connected: !!(link.shopId && link.tokens),
    shopId: link.shopId, shopName: link.shopName, connectedAt: link.connectedAt,
    lastSync: link.lastSync, lastResult: link.lastResult, lastError: link.lastError,
  };
}

export async function GET() {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  return ok(view(await getLink()));
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const body = (await req.json().catch(() => ({}))) as { action?: string; itemIds?: unknown };
  const link = await getLink();
  if (body.action === "disconnect") {
    await saveLink(EMPTY_LINK);
    return ok(view(EMPTY_LINK));
  }
  const c = shopeeCreds();
  if (!c) return bad("Shopee keys are not set. Add SHOPEE_PARTNER_ID and SHOPEE_PARTNER_KEY in Vercel.");
  if (body.action !== "preview" && body.action !== "push") return bad("Choose Preview or Push prices.");
  try {
    const items = await listItems(c, link);
    const { rows, notOnShopee } = matchItems(items, await listProducts(true));
    if (body.action === "preview") {
      link.lastError = "";
      await saveLink(link);
      return ok({ ...view(link), rows, notOnShopee });
    }
    const pick = Array.isArray(body.itemIds) ? new Set(body.itemIds.map(Number)) : null;
    let updated = 0;
    const failed: string[] = [];
    for (const r of rows) {
      if (r.action !== "update" || r.storePrice == null || (pick && !pick.has(r.itemId))) continue;
      try { await updatePrice(c, link, r.itemId, r.storePrice); updated++; }
      catch (e) { failed.push(`${r.sku}: ${e instanceof Error ? e.message : "error"}`); }
    }
    link.lastSync = new Date().toISOString();
    link.lastResult = `${updated} Shopee price(s) updated${failed.length ? `, ${failed.length} failed` : ""}`;
    link.lastError = failed.slice(0, 5).join("; ");
    await saveLink(link);
    return ok({ ...view(link), updated, failed });
  } catch (e) {
    link.lastError = e instanceof Error ? e.message : "Shopee sync failed.";
    await saveLink(link);
    return bad(link.lastError, 502);
  }
}
