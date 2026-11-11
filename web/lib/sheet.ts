import { createHash } from "node:crypto";
import { sql, ensureProductColumns } from "./db";

export type SheetRow = { id: string; category: string; code: string; name: string; dealer: number; sell: number | null; image: string };

/** Parse RFC-4180-style CSV, including quoted commas, quotes and line breaks. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') {
      if (field.length) field += c;
      else quoted = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((v) => v.trim())) rows.push(row);
      row = []; field = "";
    } else field += c;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted field. Re-export the worksheet as CSV and try again.");
  if (field.length || row.length) { row.push(field); if (row.some((v) => v.trim())) rows.push(row); }
  return rows;
}

const clean = (s: string | undefined) => String(s ?? "").replace(/^\uFEFF/, "").replace(/\s+/g, " ").trim();
const key = (s: string | undefined) => clean(s).toLowerCase().replace(/[^a-z0-9]+/g, "");
const num = (v: string | undefined) => {
  const raw = String(v ?? "").trim();
  if (!raw || /^[-—n/a]+$/i.test(raw)) return null;
  const n = Number(raw.replace(/[₱,$\s]/g, "").replace(/^\((.*)\)$/, "-$1"));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const CATS: Record<string, string> = { HELMET: "Helmets", "SUSPENSION HARNESS": "Harnesses", "FALL ARREST HARNESS": "Harnesses", ASCENDER: "Ascenders", DESCENDER: "Descenders", COWSTAIL: "Ropes & Cowstails", CARABINER: "Carabiners", "BACK UP DEVICE WITH ABSORBER": "Back-up Devices", "GEAR BAG": "Bags", "TEXTILE ANCHOR": "Anchors & Slings", "FALL ARREST LANYARD": "Lanyards", "POSITIONING LANYARD": "Lanyards", "CABLE FALL ARREST": "Fall Arrest", PULLEY: "Pulleys", SHEILD: "Rope Protection", SHIELD: "Rope Protection" };

function findHeader(headers: string[], candidates: string[]) {
  const normalized = headers.map(key);
  for (const candidate of candidates) {
    const index = normalized.findIndex((h) => h === candidate || h.includes(candidate));
    if (index >= 0) return index;
  }
  return -1;
}

/** Reads KH Trading-style sheets with common supplier header aliases and optional second-row subheaders. */
export function rowsFromCsv(text: string): SheetRow[] {
  const rows = parseCsv(text).map((r) => r.map(clean));
  const hi = rows.findIndex((r) => {
    const h = r.map(key);
    return h.some((v) => v.includes("itemcode") || v === "sku" || v === "productcode") &&
      h.some((v) => v.includes("description") || v === "productname" || v === "itemname");
  });
  if (hi < 0) throw new Error("Could not locate the product header row. Expected columns similar to Item Code/SKU and Item Description/Product Name.");
  const headers = rows[hi];
  const iCode = findHeader(headers, ["itemcode", "productcode", "sku", "stockcode"]);
  const iName = findHeader(headers, ["itemdescription", "productdescription", "description", "productname", "itemname"]);
  let iDealer = findHeader(headers, ["dealerprice", "unitprice", "costprice", "netprice", "price"]);
  if (iDealer < 0) throw new Error("Could not locate a dealer/unit/cost price column. Check the selected worksheet tab.");
  const iImg = findHeader(headers, ["imageurl", "photourl", "image", "photo"]);
  let iSell = findHeader(headers, ["sellingpricevat", "sellpricevat", "sellingprice", "sellprice", "retailprice"]);
  const sub = rows[hi + 1] ?? [];
  if (iSell < 0) {
    const subIndex = findHeader(sub, ["sellingpricevat", "sellpricevat", "sellingprice", "sellprice", "retailprice"]);
    if (subIndex >= 0) iSell = subIndex;
  }
  const imgOf = (v: string | undefined) => {
    const m = String(v ?? "").match(/https?:\/\/[^\s"')]+/);
    return m ? m[0].slice(0, 1000) : "";
  };
  let category = "Other";
  const out: SheetRow[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(hi + 1)) {
    const code = clean(r[iCode]), name = clean(r[iName]);
    if (!name) continue;
    const dealer = num(r[iDealer]);
    if (dealer === null) {
      const label = name.toUpperCase();
      if (!code && (CATS[label] || (name === label && !/\d/.test(name)) || (!/\d/.test(name) && name.split(" ").length <= 2))) {
        category = CATS[label] ?? titleCase(name);
      }
      continue;
    }
    let c = category;
    const n = name.toLowerCase();
    if (n.includes("glove")) c = "Gloves";
    else if (n.includes("harness")) c = "Harnesses";
    else if (n.includes("carabin")) c = "Carabiners";
    else if (/cord\b|rope\b/.test(n) && !n.includes("shield")) c = c === "Other" ? "Ropes & Cowstails" : c;
    const identity = code ? "code:" + code.toLowerCase() : "name:" + name.toLowerCase();
    if (seen.has(identity)) continue;
    seen.add(identity);
    const id = "s" + createHash("sha1").update(identity).digest("hex").slice(0, 10);
    out.push({ id, category: c, code: code.slice(0, 100), name: name.slice(0, 200), dealer, sell: iSell >= 0 ? num(r[iSell]) : null, image: iImg >= 0 ? imgOf(r[iImg]) : "" });
  }
  if (!out.length) throw new Error("No priced products were found. The selected tab may be incorrect or its price column may be empty.");
  return out;
}

/** Converts a Google Sheets URL to the CSV export endpoint for its selected worksheet. */
export function csvUrl(input: string): string {
  let u: URL;
  try { u = new URL(input.trim()); } catch { throw new Error("Enter a valid Google Sheets URL."); }
  if (u.protocol !== "https:" || u.hostname !== "docs.google.com") throw new Error("Use a secure docs.google.com spreadsheet link.");
  const id = u.pathname.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/)?.[1];
  if (!id) throw new Error("The link does not contain a valid Google spreadsheet ID.");
  const gid = u.searchParams.get("gid") ?? u.hash.match(/(?:^|[&#])gid=(\d+)/)?.[1] ?? "0";
  if (!/^\d+$/.test(gid)) throw new Error("The worksheet tab ID (gid) is invalid.");
  return "https://docs.google.com/spreadsheets/d/" + id + "/export?format=csv&gid=" + gid;
}

export function fingerprintCsv(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

export async function applyRows(rows: SheetRow[], hideMissing: boolean) {
  await ensureProductColumns();
  return sql.begin(async (tx) => {
    // Match on what the sheet last wrote, not the displayed value: an admin
    // override of code or name must not orphan the row and create a duplicate.
    const existing = await tx`select id, coalesce(code_sheet, code) as code, coalesce(name_sheet, name) as name, active from products`;
    const byCode = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const p of existing) {
      const code = String(p.code ?? "").trim().toLowerCase();
      const name = String(p.name ?? "").trim().toLowerCase();
      if (code && !byCode.has(code)) byCode.set(code, String(p.id));
      if (name && !byName.has(name)) byName.set(name, String(p.id));
    }
    const activeCount = existing.filter((p) => p.active).length;
    if (hideMissing && rows.length < Math.max(10, Math.ceil(activeCount * 0.7))) {
      throw new Error("Safety stop: the sheet returned only " + rows.length + " products while the store has " + activeCount + " active products. Nothing was hidden. Verify the worksheet and headers, then retry with Hide missing items disabled if this smaller list is intentional.");
    }
    const matchedIds: string[] = [];
    let added = 0, updated = 0;
    for (const [i, p] of rows.entries()) {
      const existingId = p.code ? byCode.get(p.code.trim().toLowerCase()) : byName.get(p.name.trim().toLowerCase());
      const id = existingId ?? p.id;
      if (existingId) updated++; else added++;
      matchedIds.push(id);
      await tx`insert into products (id, category, code, name, category_sheet, code_sheet, name_sheet, dealer_price, dealer_price_sheet, sheet_price, image_url, active, sort)
        values (${id}, ${p.category}, ${p.code}, ${p.name}, ${p.category}, ${p.code}, ${p.name}, ${p.dealer}, ${p.dealer}, ${p.sell}, ${p.image || null}, true, ${i})
        on conflict (id) do update set
          category_sheet = excluded.category, code_sheet = excluded.code, name_sheet = excluded.name,
          category = coalesce(products.category_override, excluded.category),
          code = coalesce(products.code_override, excluded.code),
          name = coalesce(products.name_override, excluded.name),
          dealer_price_sheet = excluded.dealer_price, dealer_price = coalesce(products.dealer_override, excluded.dealer_price), sheet_price = excluded.sheet_price, image_url = coalesce(excluded.image_url, products.image_url), active = true, sort = excluded.sort`;
    }
    let hidden = 0;
    if (hideMissing) {
      const result = await tx`update products set active = false where active and id not in ${tx(matchedIds)} returning id`;
      hidden = result.length;
    }
    return { added, updated, hidden, total: rows.length };
  });
}
