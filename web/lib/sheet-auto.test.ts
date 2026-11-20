import { describe, it, expect, beforeAll, vi } from "vitest";

// Integration test: needs a throwaway Postgres with the migration applied (skipped without DATABASE_URL).
const live = !!process.env.DATABASE_URL;
let sql: typeof import("./db").sql;
let autoSyncSheet: typeof import("./sheet-source").autoSyncSheet;
let setSetting: typeof import("./settings").setSetting;

const CSV = "Item Code,Item Description,Dealer Price\nZZ-AUTO-1,ZZ Auto Sync Rope,1234\n";

describe.skipIf(!live)("daily Google Sheet auto-update", () => {
  beforeAll(async () => {
    ({ sql } = await import("./db"));
    ({ autoSyncSheet } = await import("./sheet-source"));
    ({ setSetting } = await import("./settings"));
    vi.stubGlobal("fetch", async () => new Response(CSV, { status: 200, headers: { "content-type": "text/csv" } }));
  });

  it("imports sheet prices and never hides the catalogue from a tiny sheet", async () => {
    const [{ before }] = await sql`select count(*)::int as before from products where active`;
    await setSetting("sheet", { url: "https://docs.google.com/spreadsheets/d/abc/edit#gid=1", priceSource: "markup", hideMissing: true, lastSync: "", lastResult: "" });
    const r = await autoSyncSheet();
    expect(r.error).toBeUndefined();
    const [p] = await sql`select dealer_price from products where code = 'ZZ-AUTO-1'`;
    expect(Number(p.dealer_price)).toBe(1234);
    const [{ after }] = await sql`select count(*)::int as after from products where active`;
    expect(after).toBe(before + 1);
    await sql`delete from products where code = 'ZZ-AUTO-1'`;
  });

  it("does nothing when auto-update is turned off", async () => {
    await setSetting("sheet", { url: "https://docs.google.com/spreadsheets/d/abc/edit#gid=1", priceSource: "markup", hideMissing: true, lastSync: "", lastResult: "", autoSync: false });
    expect((await autoSyncSheet()).skipped).toBe("auto-update turned off");
  });
});
