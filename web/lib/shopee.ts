import { createHmac } from "node:crypto";
import { decryptConfigBlob, encryptConfigBlob } from "./config-crypto";
import { getSetting, setSetting } from "./settings";

/**
 * Shopee Open Platform v2 client.
 * Credentials come from the deployment environment (never the database):
 *   SHOPEE_PARTNER_ID, SHOPEE_PARTNER_KEY, optional SHOPEE_ENV=test for the sandbox.
 * The shop's access/refresh tokens are stored encrypted in the `shopee` setting.
 */
export const SHOPEE_HOSTS = {
  live: "https://partner.shopeemobile.com",
  test: "https://partner.test-stable.shopeemobile.com",
} as const;

export type ShopeeCreds = { partnerId: number; partnerKey: string; host: string };

export function shopeeCreds(env: NodeJS.ProcessEnv = process.env): ShopeeCreds | null {
  const partnerId = Number(env.SHOPEE_PARTNER_ID?.trim());
  const partnerKey = env.SHOPEE_PARTNER_KEY?.trim() || "";
  if (!Number.isInteger(partnerId) || partnerId <= 0 || !partnerKey) return null;
  const host = env.SHOPEE_ENV?.trim() === "test" ? SHOPEE_HOSTS.test : SHOPEE_HOSTS.live;
  return { partnerId, partnerKey, host };
}

/** sign = HMAC-SHA256(partner_key, partner_id + path + timestamp [+ access_token + shop_id]) */
export function shopeeSign(c: ShopeeCreds, path: string, ts: number, accessToken = "", shopId: number | "" = ""): string {
  return createHmac("sha256", c.partnerKey)
    .update(`${c.partnerId}${path}${ts}${accessToken}${shopId}`)
    .digest("hex");
}

export function authUrl(c: ShopeeCreds, redirect: string, ts = Math.floor(Date.now() / 1000)): string {
  const path = "/api/v2/shop/auth_partner";
  const u = new URL(c.host + path);
  u.searchParams.set("partner_id", String(c.partnerId));
  u.searchParams.set("timestamp", String(ts));
  u.searchParams.set("sign", shopeeSign(c, path, ts));
  u.searchParams.set("redirect", redirect);
  return u.toString();
}

export type ShopeeLink = {
  shopId: number;
  shopName: string;
  tokens: string; // encrypted {access, refresh, expires}
  connectedAt: string;
  lastSync: string;
  lastResult: string;
  lastError: string;
};
type Tokens = { access: string; refresh: string; expires: number };

export const EMPTY_LINK: ShopeeLink = { shopId: 0, shopName: "", tokens: "", connectedAt: "", lastSync: "", lastResult: "", lastError: "" };

export const getLink = () => getSetting<ShopeeLink>("shopee", EMPTY_LINK);
export const saveLink = (l: ShopeeLink) => setSetting("shopee", l);

async function call<T>(c: ShopeeCreds, path: string, opts: { method?: "GET" | "POST"; query?: Record<string, string | number>; body?: unknown; shop?: { id: number; token: string } } = {}): Promise<T> {
  const ts = Math.floor(Date.now() / 1000);
  const u = new URL(c.host + path);
  u.searchParams.set("partner_id", String(c.partnerId));
  u.searchParams.set("timestamp", String(ts));
  u.searchParams.set("sign", shopeeSign(c, path, ts, opts.shop?.token ?? "", opts.shop?.id ?? ""));
  if (opts.shop) {
    u.searchParams.set("access_token", opts.shop.token);
    u.searchParams.set("shop_id", String(opts.shop.id));
  }
  for (const [k, v] of Object.entries(opts.query ?? {})) u.searchParams.set(k, String(v));
  const res = await fetch(u, {
    method: opts.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string } & T;
  if (!res.ok || data.error) throw new Error(`Shopee ${path}: ${data.error || res.status} ${data.message || ""}`.trim());
  return data;
}

function storeTokens(link: ShopeeLink, t: { access_token: string; refresh_token: string; expire_in: number }) {
  const tokens: Tokens = { access: t.access_token, refresh: t.refresh_token, expires: Date.now() + (t.expire_in - 300) * 1000 };
  link.tokens = encryptConfigBlob(JSON.stringify(tokens));
}

/** Exchange the one-time code from the authorization redirect for shop tokens. */
export async function connectShop(c: ShopeeCreds, code: string, shopId: number): Promise<ShopeeLink> {
  const t = await call<{ access_token: string; refresh_token: string; expire_in: number }>(c, "/api/v2/auth/token/get", {
    method: "POST",
    body: { code, shop_id: shopId, partner_id: c.partnerId },
  });
  const link: ShopeeLink = { ...EMPTY_LINK, shopId, connectedAt: new Date().toISOString() };
  storeTokens(link, t);
  try {
    const info = await call<{ shop_name?: string }>(c, "/api/v2/shop/get_shop_info", { shop: { id: shopId, token: t.access_token } });
    link.shopName = info.shop_name ?? "";
  } catch { /* the name is cosmetic */ }
  await saveLink(link);
  return link;
}

async function shopAuth(c: ShopeeCreds, link: ShopeeLink) {
  if (!link.shopId || !link.tokens) throw new Error("Shopee is not connected yet.");
  const tok = JSON.parse(decryptConfigBlob(link.tokens)) as Tokens;
  if (Date.now() < tok.expires) return { id: link.shopId, token: tok.access };
  const t = await call<{ access_token: string; refresh_token: string; expire_in: number }>(c, "/api/v2/auth/access_token/get", {
    method: "POST",
    body: { refresh_token: tok.refresh, shop_id: link.shopId, partner_id: c.partnerId },
  });
  storeTokens(link, t);
  await saveLink(link);
  return { id: link.shopId, token: t.access_token };
}

export type ShopeeItem = { itemId: number; sku: string; name: string; price: number | null; stock: number | null; hasModels: boolean; status: string };

export async function listItems(c: ShopeeCreds, link: ShopeeLink): Promise<ShopeeItem[]> {
  const shop = await shopAuth(c, link);
  const ids: number[] = [];
  for (let offset = 0; offset < 5000; ) {
    const r = await call<{ response?: { item?: { item_id: number }[]; has_next_page?: boolean; next_offset?: number } }>(c, "/api/v2/product/get_item_list", {
      shop, query: { offset, page_size: 100, item_status: "NORMAL" },
    });
    for (const i of r.response?.item ?? []) ids.push(i.item_id);
    if (!r.response?.has_next_page) break;
    offset = r.response.next_offset ?? offset + 100;
  }
  const out: ShopeeItem[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const r = await call<{ response?: { item_list?: RawItem[] } }>(c, "/api/v2/product/get_item_base_info", {
      shop, query: { item_id_list: ids.slice(i, i + 50).join(",") },
    });
    for (const it of r.response?.item_list ?? []) out.push(toItem(it));
  }
  return out;
}

type RawItem = {
  item_id: number; item_sku?: string; item_name?: string; item_status?: string; has_model?: boolean;
  price_info?: { original_price?: number; current_price?: number }[];
  stock_info_v2?: { summary_info?: { total_available_stock?: number } };
};
export function toItem(it: RawItem): ShopeeItem {
  const p = it.price_info?.[0];
  return {
    itemId: it.item_id,
    sku: (it.item_sku ?? "").trim(),
    name: it.item_name ?? "",
    price: p?.original_price ?? p?.current_price ?? null,
    stock: it.stock_info_v2?.summary_info?.total_available_stock ?? null,
    hasModels: !!it.has_model,
    status: it.item_status ?? "",
  };
}

export async function updatePrice(c: ShopeeCreds, link: ShopeeLink, itemId: number, price: number) {
  const shop = await shopAuth(c, link);
  await call(c, "/api/v2/product/update_price", { method: "POST", shop, body: { item_id: itemId, price_list: [{ original_price: price }] } });
}

export const normSku = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");

export type MatchRow = {
  itemId: number; sku: string; shopeeName: string; shopeePrice: number | null; stock: number | null;
  productId: string | null; storeName: string; storePrice: number | null;
  action: "update" | "same" | "variants" | "unmatched";
};

/** Pair Shopee listings with store products by SKU = product code. */
export function matchItems(items: ShopeeItem[], products: { id: string; code: string; name: string; price: number; active: boolean }[]): { rows: MatchRow[]; notOnShopee: number } {
  const byCode = new Map<string, (typeof products)[number]>();
  for (const p of products) if (p.active && p.code) byCode.set(normSku(p.code), p);
  const seen = new Set<string>();
  const rows: MatchRow[] = items.map(i => {
    const p = i.sku ? byCode.get(normSku(i.sku)) : undefined;
    if (p) seen.add(p.id);
    const action: MatchRow["action"] = !p ? "unmatched" : i.hasModels ? "variants" : i.price === p.price ? "same" : "update";
    return { itemId: i.itemId, sku: i.sku, shopeeName: i.name, shopeePrice: i.price, stock: i.stock, productId: p?.id ?? null, storeName: p?.name ?? "", storePrice: p?.price ?? null, action };
  });
  return { rows, notOnShopee: [...byCode.values()].filter(p => !seen.has(p.id)).length };
}
