import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("./settings", () => ({ getSetting: vi.fn(), setSetting: vi.fn() }));
vi.mock("./config-crypto", () => ({ encryptConfigBlob: (s: string) => s, decryptConfigBlob: (s: string) => s }));
import { authUrl, matchItems, shopeeCreds, shopeeSign, toItem, SHOPEE_HOSTS } from "./shopee";

const c = { partnerId: 1001, partnerKey: "k", host: SHOPEE_HOSTS.live };

describe("shopee", () => {
  it("reads trimmed credentials and picks the sandbox host", () => {
    expect(shopeeCreds({} as NodeJS.ProcessEnv)).toBeNull();
    const t = shopeeCreds({ SHOPEE_PARTNER_ID: " 1001\n", SHOPEE_PARTNER_KEY: "k\n", SHOPEE_ENV: "test" } as NodeJS.ProcessEnv);
    expect(t).toEqual({ partnerId: 1001, partnerKey: "k", host: SHOPEE_HOSTS.test });
  });

  it("signs public and shop calls per the v2 base string", () => {
    const h = (s: string) => createHmac("sha256", "k").update(s).digest("hex");
    expect(shopeeSign(c, "/api/v2/shop/auth_partner", 10)).toBe(h("1001/api/v2/shop/auth_partner10"));
    expect(shopeeSign(c, "/p", 10, "tok", 55)).toBe(h("1001/p10tok55"));
  });

  it("builds the authorization link with the redirect", () => {
    const u = new URL(authUrl(c, "https://x.test/cb?state=s", 10));
    expect(u.pathname).toBe("/api/v2/shop/auth_partner");
    expect(u.searchParams.get("redirect")).toBe("https://x.test/cb?state=s");
    expect(u.searchParams.get("sign")).toHaveLength(64);
  });

  it("matches listings to store products by SKU", () => {
    const items = [
      toItem({ item_id: 1, item_sku: " ab-1 ", item_name: "A", price_info: [{ original_price: 100 }] }),
      toItem({ item_id: 2, item_sku: "B2", item_name: "B", price_info: [{ original_price: 50 }] }),
      toItem({ item_id: 3, item_sku: "C3", item_name: "C", has_model: true }),
      toItem({ item_id: 4, item_sku: "", item_name: "D" }),
    ];
    const products = [
      { id: "a", code: "AB-1", name: "A", price: 120, active: true },
      { id: "b", code: "b2", name: "B", price: 50, active: true },
      { id: "c", code: "C3", name: "C", price: 10, active: true },
      { id: "z", code: "Z9", name: "Z", price: 1, active: true },
    ];
    const { rows, notOnShopee } = matchItems(items, products);
    expect(rows.map(r => r.action)).toEqual(["update", "same", "variants", "unmatched"]);
    expect(rows[0].storePrice).toBe(120);
    expect(notOnShopee).toBe(1);
  });
});
