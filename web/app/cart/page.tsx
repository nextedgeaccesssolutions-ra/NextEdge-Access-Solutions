import { listProducts, type Product } from "@/lib/db";
import { dedupePublicProducts } from "@/lib/catalog";
import CartClient from "./CartClient";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Shopping Cart — NEAS Online Store",
  description: "Review rope-access and height-safety equipment selected from the NEAS online store.",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const products = await listProducts().catch((): Product[] => []);
  const pub = dedupePublicProducts(products).map(p => ({
    id: p.id, category: p.category, code: p.code, name: p.name, price: p.price,
    image: (p as { image?: string }).image ?? "",
  }));
  return <CartClient products={pub} />;
}
