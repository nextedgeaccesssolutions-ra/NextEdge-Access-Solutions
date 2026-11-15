import { sql } from "./db";
import { listProducts, type Product } from "./db";
import { dedupePublicProducts } from "./catalog";
import { getSetting } from "./settings";
import { DEFAULT_BRAND, generate, type Brand } from "./marketing";

export type StorePromoSettings = {
  enabled: boolean;
  dailyCount: number;
  platforms: string[];
};

export const DEFAULT_STORE_PROMO: StorePromoSettings = {
  enabled: false,
  dailyCount: 5,
  platforms: ["facebook", "instagram"],
};

const ALLOWED = ["facebook", "instagram", "linkedin", "google_business"];
const CURSOR_KEY = "mk_store_promo_cursor";

function manilaDate(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(d);
  const v = Object.fromEntries(p.map((x) => [x.type, x.value]));
  return `${v.year}-${v.month}-${v.day}`;
}

function fallbackCaption(p: Product, url: string) {
  const details = [p.description?.trim(), p.features?.trim()].filter(Boolean).join("\n");
  const price = Number(p.price) > 0 ? `Listed price: ₱${Number(p.price).toLocaleString("en-PH")} (subject to stock confirmation).\n\n` : "";
  return [
    `NEAS Store Feature: ${p.name}`,
    `${p.category} | Item code: ${p.code || "See product page"}`,
    details || "Explore this item in the NEAS online catalogue and review the product information before purchase.",
    price.trim(),
    `View product details: ${url}`,
    "For availability, bulk requirements and delivery arrangements, contact NEAS at +63 991 426 5886.",
    "#NEAS #RopeAccess #WorkAtHeight #HeightSafety #PPE #Philippines",
  ].filter(Boolean).join("\n\n");
}

async function captionFor(p: Product, url: string, brand: Brand) {
  const source = [
    `Product name: ${p.name}`,
    `Category: ${p.category}`,
    `Item code: ${p.code || "Not listed"}`,
    Number(p.price) > 0 ? `Current store price: PHP ${Number(p.price).toLocaleString("en-PH")} (stock and final availability must be confirmed)` : "",
    p.description ? `Store description: ${p.description}` : "",
    p.features ? `Listed features: ${p.features}` : "",
    `Product page: ${url}`,
  ].filter(Boolean).join("\n");
  const prompt = `Write one polished NEAS product marketing caption (60–100 words) for this exact store item. Include a clear hook, the supplied product name and category, a concise description based only on the supplied source facts, the product page URL, and a quotation/availability call to action. Include the supplied item code when present. If a price is supplied, call it the listed store price and say availability is subject to confirmation. Do not invent certifications, standards, load ratings, compatibility, performance claims, specifications, stock status, discounts or warranty terms. Never imply that an item is suitable for a particular safety application unless the source details explicitly say so. Return only the ready-to-post caption.\n\nSOURCE FACTS:\n${source}`;
  const result = await generate("caption", prompt, { brand, tone: "Professional, accurate, conversion-focused, safety-conscious" });
  if (!("text" in result) || !result.text.trim()) return fallbackCaption(p, url);
  let text = result.text.trim();
  if (!text.includes(url)) text += `\\n\\nView product details: ${url}`;
  if (!text.includes("+63 991 426 5886")) text += "\\n\\nFor availability and delivery, contact NEAS at +63 991 426 5886.";
  if (!text.includes("#NEAS")) text += "\\n\\n#NEAS #RopeAccess #WorkAtHeight #HeightSafety #PPE";
  return text;
}

/** Creates one idempotent daily batch of store-product posts. The caller publishes the due queue. */
export async function createDailyStorePosts(origin: string) {
  const cfg = await getSetting<StorePromoSettings>("mk_store_promo", DEFAULT_STORE_PROMO);
  if (!cfg.enabled) return { enabled: false, skipped: "Store product autopilot is disabled.", created: 0 };
  const count = Math.max(1, Math.min(5, Math.floor(Number(cfg.dailyCount) || 5)));
  const requested = (Array.isArray(cfg.platforms) ? cfg.platforms : DEFAULT_STORE_PROMO.platforms)
    .filter((x) => ALLOWED.includes(x));
  if (!requested.length) return { enabled: true, skipped: "Select at least one supported social platform.", created: 0 };
  const accounts = await sql`select distinct platform from mk_social_accounts where status = 'ok' and ws is null and platform in ${sql(requested)}`;
  const connected = new Set(accounts.map((a) => String(a.platform)));
  const activePlatforms = requested.filter((p) => connected.has(p));
  if (!activePlatforms.length) return { enabled: true, skipped: "No selected social platform has a healthy connected NEAS account.", created: 0 };

  const products = dedupePublicProducts(await listProducts());
  if (!products.length) return { enabled: true, skipped: "The live store returned no active products.", created: 0 };
  const day = manilaDate();
  const campaign = `NEAS Store Product Daily ${day}`;
  const exists = await sql`select count(*)::int as n from mk_posts where ws is null and campaign = ${campaign}`;
  if (Number(exists[0]?.n ?? 0) > 0) return { enabled: true, skipped: "Today's store product batch already exists.", created: 0, campaign };

  const cursorState = await getSetting<{ cursor?: number }>(CURSOR_KEY, {});
  const start = Math.max(0, Number(cursorState.cursor) || 0) % products.length;
  const chosen: { product: Product; platforms: string[]; url: string; media: string }[] = [];
  let scanned = 0;
  while (chosen.length < count && scanned < products.length) {
    const p = products[(start + scanned) % products.length];
    scanned++;
    const page = `${origin.replace(/\/$/, "")}/store/p/${encodeURIComponent(p.id)}`;
    const hasImage = !!String(p.image ?? "").trim();
    const platforms = activePlatforms.filter((pl) => pl !== "instagram" || hasImage);
    if (!platforms.length) continue;
    const image = String(p.image ?? "").trim();
    const media = image ? (image.startsWith("/") ? origin.replace(/\/$/, "") + image : image) : page;
    chosen.push({ product: p, platforms, url: page, media });
  }
  if (!chosen.length) return { enabled: true, skipped: "No products have media compatible with the selected connected platforms.", created: 0 };

  const brand = { ...DEFAULT_BRAND, ...(await getSetting<Brand>("mk_brand", DEFAULT_BRAND)) };
  const drafts = await Promise.all(chosen.map(async (x) => ({
    ...x,
    body: await captionFor(x.product, x.url, brand),
  })));

  const inserted = await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(78421, 20261115)`;
    const already = await tx`select count(*)::int as n from mk_posts where ws is null and campaign = ${campaign}`;
    if (Number(already[0]?.n ?? 0) > 0) return [];
    const ids: number[] = [];
    for (const x of drafts) {
      const p = x.product;
      const title = `Store: ${p.name}`.slice(0, 200);
      const notes = `Automated NEAS store promotion · product_id=${p.id} · code=${p.code || "n/a"} · ${day}`;
      const row = await tx`insert into mk_posts (title, body, platforms, status, scheduled_at, media_url, campaign, notes, created_by, ws)
        values (${title}, ${x.body}, ${x.platforms}, 'scheduled', now(), ${x.media}, ${campaign}, ${notes}, null, null)
        returning id`;
      ids.push(Number(row[0].id));
    }
    await tx`insert into settings (key, value) values (${CURSOR_KEY}, ${JSON.stringify({ cursor: (start + scanned) % products.length, lastDate: day })})
      on conflict (key) do update set value = excluded.value`;
    return ids;
  });
  return {
    enabled: true,
    created: inserted.length,
    ids: inserted,
    campaign,
    catalogCount: products.length,
    selected: drafts.map((x) => ({ name: x.product.name, platforms: x.platforms })),
    nextCursor: (start + scanned) % products.length,
  };
}
