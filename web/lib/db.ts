import postgres from "postgres";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const g = globalThis as unknown as { __neasSql?: ReturnType<typeof postgres> };
export const sql = g.__neasSql ?? postgres(url, {
  ssl: /localhost|127\.0\.0\.1|host=\/tmp/.test(url) ? false : "require",
  max: 5, idle_timeout: 20,
});
if (process.env.NODE_ENV !== "production") g.__neasSql = sql;

export type Product = { id: string; category: string; code: string; name: string; dealer_price: number; price_override: number | null; active: boolean; price: number; image: string; description: string; features: string; specs_url: string;
  /** What the Google Sheet last supplied, shown as the placeholder when an override is cleared. */
  name_sheet: string; code_sheet: string; category_sheet: string;
  /** Admin overrides. Non-null wins over the sheet and survives every sync. */
  name_override: string | null; code_override: string | null; category_override: string | null };

export async function getMarkup(): Promise<number> {
  const rows = await sql`select value from settings where key = 'markup_percent'`;
  const n = Number(rows[0]?.value);
  return Number.isFinite(n) && n >= 0 ? n : 20;
}

export function sellPrice(dealer: number, override: number | null, markup: number): number {
  if (override != null) return Number(override);
  return Math.ceil((Number(dealer) * (1 + markup / 100)) / 5) * 5;
}

// Additive, idempotent schema repair for the admin item-override columns (#52).
// Production builds no longer run scripts/migrate.mjs, so make sure the columns exist at runtime.
let productColumnsReady: Promise<void> | null = null;
export function ensureProductColumns(): Promise<void> {
  productColumnsReady ??= (async () => {
    for (const col of ["name_sheet", "code_sheet", "category_sheet", "name_override", "code_override", "category_override"]) {
      await sql.unsafe(`alter table products add column if not exists ${col} text`);
    }
  })().catch((err) => {
    productColumnsReady = null; // retry on a later request
    console.error("[db] could not add product override columns (run `npm run migrate`):", err);
  });
  return productColumnsReady;
}

export async function listProducts(includeInactive = false): Promise<Product[]> {
  await ensureProductColumns();
  const markup = await getMarkup();
  const { getCategoryMarkup } = await import("./settings");
  const catMarkup = await getCategoryMarkup();
  const { getSetting } = await import("./settings");
  const sheetCfg = await getSetting<{ priceSource: string }>("sheet", { priceSource: "markup" });
  const useSheet = sheetCfg.priceSource === "sheet";
  let rows;
  try {
    rows = includeInactive
      ? await sql`select id, category, code, name, dealer_price, price_override, active, sort, image_url, sheet_price, description, features, specs_url, name_sheet, code_sheet, category_sheet, name_override, code_override, category_override from products order by active desc, sort`
      : await sql`select id, category, code, name, dealer_price, price_override, active, sort, image_url, sheet_price, description, features, specs_url, name_sheet, code_sheet, category_sheet, name_override, code_override, category_override from products where active order by sort`;
  } catch (err) {
    // 42703 = undefined_column: the item-override migration has not been applied yet. Serve the real catalogue without overrides.
    if ((err as { code?: string }).code !== "42703") throw err;
    console.error("[db] products override columns missing — run `npm run migrate`. Falling back to legacy query.");
    rows = includeInactive
      ? await sql`select id, category, code, name, dealer_price, price_override, active, sort, image_url, sheet_price, description, features, specs_url from products order by active desc, sort`
      : await sql`select id, category, code, name, dealer_price, price_override, active, sort, image_url, sheet_price, description, features, specs_url from products where active order by sort`;
  }
  return rows.map((r) => {
    const dealer = Number(r.dealer_price);
    const override = r.price_override == null ? null : Number(r.price_override);
    return { id: r.id, category: r.category, code: r.code, name: r.name,
      name_sheet: r.name_sheet ?? r.name, code_sheet: r.code_sheet ?? r.code, category_sheet: r.category_sheet ?? r.category,
      name_override: r.name_override ?? null, code_override: r.code_override ?? null, category_override: r.category_override ?? null, dealer_price: dealer, price_override: override, active: r.active, image: r.image_url ?? "", description: r.description ?? "", features: r.features ?? "", specs_url: r.specs_url ?? "", price: useSheet && r.sheet_price != null && override == null ? Math.ceil(Number(r.sheet_price)) : sellPrice(dealer, override, catMarkup[r.category] ?? markup) };
  });
}
