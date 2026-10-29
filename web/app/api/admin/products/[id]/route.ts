import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const { id } = await params;
  const b = await req.json().catch(() => ({}));
  if ("priceOverride" in b) {
    const v = b.priceOverride === null || b.priceOverride === "" ? null : Number(b.priceOverride);
    if (v !== null && (!Number.isFinite(v) || v < 0 || v > 10_000_000)) return bad("Enter a valid price.");
    await sql`update products set price_override = ${v} where id = ${id}`;
  }
  if ("dealerPrice" in b) {
    const v = Number(b.dealerPrice);
    if (!Number.isFinite(v) || v < 0 || v > 10_000_000) return bad("Enter a valid dealer price.");
    await sql`update products set dealer_price = ${v} where id = ${id}`;
  }
  if ("active" in b) await sql`update products set active = ${Boolean(b.active)} where id = ${id}`;
  return ok();
}
