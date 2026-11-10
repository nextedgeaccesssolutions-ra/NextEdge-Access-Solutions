import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "./db";
import { applyRows, type SheetRow } from "./sheet";

// Integration test: needs a throwaway Postgres with the migration applied.
//   DATABASE_URL=postgres://user@127.0.0.1:5432/db npx vitest run sheet-override
// Skipped in ordinary CI, which has no database.
const live = !!process.env.DATABASE_URL;

const ID = "p-override-test";
const row = (over: Partial<SheetRow> = {}): SheetRow => ({
  id: ID, category: "Helmets", code: "ZZ-OVR-001",
  name: "ZZ Override Test Helmet", dealer: 3785, sell: 4165, image: "", ...over,
});
const get = async () => (await sql`select name, code, category, dealer_price, name_sheet, code_sheet,
  category_sheet, name_override, code_override, category_override from products where id = ${ID}`)[0];

describe.skipIf(!live)("sheet sync vs admin overrides", () => {
  beforeAll(async () => { await sql`delete from products where id = ${ID}`; });

  it("records the sheet values on first sync and sets no override", async () => {
    await applyRows([row()], false);
    const p = await get();
    expect(p.name).toBe("ZZ Override Test Helmet");
    expect(p.name_sheet).toBe("ZZ Override Test Helmet");
    expect(p.name_override).toBeNull();
  });

  it("keeps an admin override through a later sync, without duplicating the row", async () => {
    await sql`update products set name_override = 'ZZ Override Test Helmet (renamed)', name = 'ZZ Override Test Helmet (renamed)',
      code_override = 'ZZ-OVR-001-RENAMED', code = 'ZZ-OVR-001-RENAMED',
      category_override = 'Head Protection', category = 'Head Protection' where id = ${ID}`;
    await applyRows([row()], false);
    const p = await get();
    expect([p.name, p.code, p.category]).toEqual(["ZZ Override Test Helmet (renamed)", "ZZ-OVR-001-RENAMED", "Head Protection"]);
    // The row must still be matched by its sheet code, not the overridden one.
    const [{ c }] = await sql`select count(*)::int c from products where id = ${ID} or code_sheet = 'ZZ-OVR-001'`;
    expect(Number(c)).toBe(1);
  });

  it("still takes price and sheet-value updates while the override stands", async () => {
    await applyRows([row({ dealer: 3999, name: "ZZ Override Test Helmet v2" })], false);
    const p = await get();
    expect(p.name).toBe("ZZ Override Test Helmet (renamed)");
    expect(p.name_sheet).toBe("ZZ Override Test Helmet v2");
    expect(Number(p.dealer_price)).toBe(3999);
  });

  it("falls back to the latest sheet value when the override is cleared", async () => {
    await sql`update products set name_override = null, name = coalesce(name_sheet, name),
      code_override = null, code = coalesce(code_sheet, code),
      category_override = null, category = coalesce(category_sheet, category) where id = ${ID}`;
    const p = await get();
    expect([p.name, p.code, p.category]).toEqual(["ZZ Override Test Helmet v2", "ZZ-OVR-001", "Helmets"]);
  });
});
