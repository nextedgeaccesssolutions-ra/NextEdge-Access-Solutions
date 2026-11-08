import { listProducts } from "@/lib/db";
import { dedupePublicProducts } from "@/lib/catalog";
import { ok } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const products = dedupePublicProducts(await listProducts());
  return ok(products.map(({ dealer_price: _d, price_override: _o, active: _a, ...p }) => p));
}
