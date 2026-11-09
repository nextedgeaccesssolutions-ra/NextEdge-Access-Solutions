import type { Metadata } from "next";
import { listProducts } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { BANK } from "@/lib/http";
import StoreClient from "./StoreClient";
import catalog from "../../scripts/catalog.json";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Online Store — NEAS",
  description: "Shop genuine rope access, PPE and working-at-height safety equipment from NEAS Philippines. Browse certified helmets, harnesses, ropes and accessories, with bank-transfer checkout.",
  alternates: { canonical: "/store" },
  openGraph: {
    type: "website",
    title: "Online Store — NEAS",
    description: "Shop genuine rope access, PPE and working-at-height safety equipment from NEAS Philippines.",
    url: "/store",
    images: ["/img/hero-city.jpg"],
  },
};

export default async function Store() {
  const [products, user] = await Promise.all([
    listProducts().catch(() => catalog.map((p, i) => ({
      id: p.id,
      category: p.cat,
      code: p.code,
      name: p.name,
      dealer_price: p.dealer,
      price_override: null,
      active: true,
      price: Math.ceil((Number(p.dealer) * 1.2) / 5) * 5,
      sort: i,
    }))),
    getUser().catch(() => null),
  ]);
  const pub = products.map((p) => ({ id: p.id, category: p.category, code: p.code, name: p.name, price: p.price, image: (p as { image?: string }).image ?? "", description: (p as { description?: string }).description ?? "", features: (p as { features?: string }).features ?? "", specs_url: (p as { specs_url?: string }).specs_url ?? "" }));
  return <div className="wrap" style={{ padding: "40px 20px" }}>
    <div className="eyebrow">Online Store · PPE &amp; Rope Access Equipment</div>
    <h1>Shop Certified Height-Safety Gear</h1>
    <p className="muted" style={{ maxWidth: 680 }}>Genuine Skylotec, Singing Rock and Trestec equipment. Order online and pay by bank transfer. We confirm stock and delivery once payment is received.</p>
    <StoreClient products={pub} user={user ? { name: user.name, phone: user.phone, email: user.email } : null} bank={BANK} />
  </div>;
}
