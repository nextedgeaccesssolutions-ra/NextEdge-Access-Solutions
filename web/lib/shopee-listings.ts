// Live Shopee PH listings for the NEAS shop, copied from Seller Centre on 2026-11-27.
// The Shopee Open Platform API is not available to this shop yet (Shopee requires Mall,
// Managed Seller, or 600+ orders/30 days), so this list is maintained by hand.
// price = list price in PHP (null when the listing has variants with different prices).

export const SHOPEE_SHOP_ID = 1626241104;
export const SHOPEE_SHOP_URL = "https://shopee.ph/nextedgeaccesssolutionsneas";

export type ShopeeListing = { itemId: number; name: string; price: number | null };

export const SHOPEE_LISTINGS: ShopeeListing[] = [
  { itemId: 50254407981, name: "5m Up You Go", price: 25112 },
  { itemId: 58054415233, name: "Waist Tec Professional / Work Harnesses", price: 21407 },
  { itemId: 43627892569, name: "Spark", price: 18083 },
  { itemId: 48904430745, name: "Sparrow 200R Self-Braking Descender for Rope Work", price: null },
  { itemId: 58154400763, name: "SKYLOTEC GRYPHON ASCENDER Ergonomic Rope Access Harness with Integrated Chest Ascender", price: null },
  { itemId: 52104400788, name: "Work Tec", price: null },
  { itemId: 40627892387, name: "SKYLOTEC SIRIUS Compact Industrial and Rescue Descender with Auto-Lock", price: null },
  { itemId: 45554427782, name: "Quick Roll Right Hand Ascender with Integrated Pulley", price: null },
  { itemId: 56304415248, name: "FLEX ABS 140 STEEL Y", price: 9571 },
  { itemId: 47904421122, name: "Fox", price: 7929 },
  { itemId: 26843984645, name: "Roller - Metal Rope Shield", price: 7444 },
  { itemId: 55154415607, name: "Orange Aries Air", price: 6876 },
  { itemId: 45154430665, name: "Yellow Hi Viz Aries Air", price: 6876 },
  { itemId: 55704406059, name: "Orbiter H", price: 6060 },
  { itemId: 46954425799, name: "Rescue Triangle", price: null },
  { itemId: 50304401068, name: "Orbiter T", price: null },
  { itemId: 48004426127, name: "Orange/Anthracite RollNLock Ultra-Light Multi-Function Device", price: 5608 },
  { itemId: 53004405971, name: "Aries Air Professional / Helmets / Work Helmets", price: 6876 },
  { itemId: 55154412350, name: "Quick Up DX Left Hand Ascender", price: 5133 },
  { itemId: 49954427778, name: "Quick Up DX Right Hand Ascender", price: 5133 },
  { itemId: 47653241605, name: "Orange/Anthracite RollNLock", price: 9968 },
  { itemId: 48753251941, name: "Otto R S-Steel Professional / Descenders", price: 3956 },
  { itemId: 48103246495, name: "100cm Web Ankor | Climbing Technology", price: 2289 },
  { itemId: 45454425768, name: "Climbing Technology Orbiter D Professional High Efficiency Pulley with Ball Bearings", price: 4394 },
  { itemId: 40727905870, name: "SNAPPY - Alloy Triple Action Twist Lock HMS Carabiner", price: 1676 },
  { itemId: 43477898258, name: "PILLAR - Steel Oval Screw Gate Carabiner", price: 1504 },
  { itemId: 50604417394, name: "PILLAR - Steel Triple Action Twist Lock Oval Carabiner", price: null },
  { itemId: 45954437412, name: "LARGE - Steel Screw Gate Carabiner", price: null },
  { itemId: 55504417328, name: "OVX Alloy Screw Gate Oval Carabiner", price: null },
  { itemId: 47154427718, name: "Quick Roll Left Hand Ascender with Integrated Pulley", price: null },
  { itemId: 48754421269, name: "Electric Blue/Anthracite RollNLock Ultra-Light Multi-Function Device", price: null },
  { itemId: 46554421233, name: "Foot Loop Adjustable Monotrier", price: null },
  { itemId: 43077887638, name: "Link 40", price: 2289 },
  { itemId: 26393989699, name: "Orbiter S", price: 3989 },
  { itemId: 46204430202, name: "Orbiter D Professional / Pulleys & Rope Clamps / Pulleys", price: 3924 },
  { itemId: 44177897383, name: "100cm Web Ankor", price: 2507 },
  { itemId: 57554405859, name: "160cm Web Ankor", price: 2507 },
  { itemId: 57654410343, name: "Small Blue Cheese Plate", price: 2588 },
  { itemId: 40627887523, name: "Large Red Cheese Plate", price: null },
  { itemId: 45254420998, name: "Tuner I", price: null },
  { itemId: 55454405726, name: "Tuner Y", price: null },
  { itemId: 47304435191, name: "Medium Progrip Full-Finger Gloves", price: null },
  { itemId: 40177902224, name: "Large Progrip Full-Finger Gloves", price: null },
  { itemId: 50654415206, name: "2XL Progrip Full-Finger Gloves", price: null },
  { itemId: 52354400874, name: "Rope Shield Protector", price: 1008 },
  { itemId: 55004400683, name: "Transparent Visor A Professional / Helmets / Visors & Accessories", price: 5356 },
  { itemId: 45954425679, name: "Smoky A-F Visor Professional / Helmets / Visors & Accessories", price: 5356 },
  { itemId: 43677315563, name: "XL Progrip Full-Finger Gloves", price: 3749 },
];

export const shopeeItemUrl = (itemId: number) => `https://shopee.ph/product/${SHOPEE_SHOP_ID}/${itemId}`;

const STOP = new Set(["professional", "with", "for", "and", "the", "work", "climbing", "technology", "skylotec", "new", "hand", "integrated", "helmets", "pulleys", "clamps", "accessories", "visors", "descenders", "harnesses"]);
const tokens = (s: string) =>
  new Set(s.toLowerCase().replace(/&amp;/g, " ").replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t && !STOP.has(t)));

/** Similarity 0..1: share of the shorter name's distinctive words found in the other. */
export function nameScore(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  const [small, big] = ta.size <= tb.size ? [ta, tb] : [tb, ta];
  small.forEach((t) => { if (big.has(t)) hit++; });
  return hit / small.size;
}

function jaccard(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  let hit = 0;
  ta.forEach((t) => { if (tb.has(t)) hit++; });
  return hit / (ta.size + tb.size - hit || 1);
}

/** Best Shopee listing for a website product name, or null if nothing is a confident match. */
export function findShopeeListing(name: string, min = 0.99): ShopeeListing | null {
  let best: ShopeeListing | null = null, bestScore = 0, bestJ = 0;
  for (const l of SHOPEE_LISTINGS) {
    const s = nameScore(name, l.name), j = jaccard(name, l.name);
    if (s > bestScore || (s === bestScore && j > bestJ)) { best = l; bestScore = s; bestJ = j; }
  }
  return bestScore >= min ? best : null;
}
