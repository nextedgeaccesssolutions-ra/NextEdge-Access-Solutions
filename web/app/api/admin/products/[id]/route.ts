import { sql, ensureProductColumns } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const { id } = await params;
  await ensureProductColumns();
  const b = await req.json().catch(() => ({}));
  if ("priceOverride" in b) {
    const v = b.priceOverride === null || b.priceOverride === "" ? null : Number(b.priceOverride);
    if (v !== null && (!Number.isFinite(v) || v < 0 || v > 10_000_000)) return bad("Enter a valid price.");
    await sql`update products set price_override = ${v} where id = ${id}`;
  }
  if ("dealerOverride" in b) {
    if (b.dealerOverride === null || b.dealerOverride === "") {
      await sql`update products set dealer_override = null, dealer_price = coalesce(dealer_price_sheet, dealer_price) where id = ${id}`;
    } else {
      const v = Number(b.dealerOverride);
      if (!Number.isFinite(v) || v < 0 || v > 10_000_000) return bad("Enter a valid dealer price.");
      await sql`update products set dealer_override = ${v}, dealer_price = ${v} where id = ${id}`;
    }
  }
  if ("dealerPrice" in b) {
    const v = Number(b.dealerPrice);
    if (!Number.isFinite(v) || v < 0 || v > 10_000_000) return bad("Enter a valid dealer price.");
    await sql`update products set dealer_price = ${v} where id = ${id}`;
  }
  if ("description" in b) await sql`update products set description = ${String(b.description ?? "").slice(0, 4000) || null} where id = ${id}`;
  if ("features" in b) await sql`update products set features = ${String(b.features ?? "").slice(0, 8000) || null} where id = ${id}`;
  if ("specsUrl" in b) {
    const u = String(b.specsUrl ?? "").trim();
    if (u && !/^https?:\/\/\S+$/i.test(u) && !u.startsWith("/")) return bad("Technical specs link must start with https://");
    await sql`update products set specs_url = ${u.slice(0, 1000) || null} where id = ${id}`;
  }
  // Sheet-owned fields. Setting an override writes both the override (so the
  // next sync preserves it) and the effective column (so every existing query
  // -- store listing, search, category markup, bulk pricing -- keeps working
  // unchanged). Clearing it restores whatever the sheet last supplied.
  for (const [field, column] of [["nameOverride", "name"], ["codeOverride", "code"], ["categoryOverride", "category"]] as const) {
    if (!(field in b)) continue;
    const raw = b[field as keyof typeof b];
    const v = raw === null || String(raw ?? "").trim() === "" ? null : String(raw).trim().slice(0, 200);
    if (column === "name" && v === null) {
      const [row] = await sql`select name_sheet from products where id = ${id}`;
      if (!row?.name_sheet) return bad("This item has no sheet name to fall back to. Type a name instead of clearing it.");
    }
    if (v === null) {
      if (column === "name") await sql`update products set name_override = null, name = coalesce(name_sheet, name) where id = ${id}`;
      else if (column === "code") await sql`update products set code_override = null, code = coalesce(code_sheet, code) where id = ${id}`;
      else await sql`update products set category_override = null, category = coalesce(category_sheet, category) where id = ${id}`;
    } else {
      if (column === "name") await sql`update products set name_override = ${v}, name = ${v} where id = ${id}`;
      else if (column === "code") await sql`update products set code_override = ${v}, code = ${v} where id = ${id}`;
      else await sql`update products set category_override = ${v}, category = ${v} where id = ${id}`;
    }
  }
  if ("active" in b) await sql`update products set active = ${Boolean(b.active)} where id = ${id}`;
  return ok();
}
