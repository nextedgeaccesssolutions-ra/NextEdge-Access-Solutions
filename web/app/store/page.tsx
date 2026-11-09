import { listProducts } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { BANK } from "@/lib/http";
import StoreClient from "./StoreClient";
import catalog from "../../scripts/catalog.json";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rope Access & Height Safety Equipment Store | NEAS Philippines", description: "Shop height-safety and rope-access equipment from NEAS, including Skylotec, Singing Rock and Trestec products. Request availability and delivery across the Philippines.", alternates: { canonical: "/store" } };

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
    <section aria-labelledby="store-guide" style={{ maxWidth: 900, margin: "56px auto 20px", lineHeight: 1.75 }}>
      <h2 id="store-guide">Rope Access and Height-Safety Equipment for Philippine Worksites</h2>
      <p>NEAS supplies selected personal protective equipment and work-at-height products for rope access technicians, industrial maintenance teams, construction contractors, renewable-energy operators, telecom crews, and facility managers in the Philippines. The online catalogue includes equipment categories such as helmets, full-body harnesses, ropes, descenders, ascenders, connectors, lanyards, pulleys, anchors, slings, rope-protection products, bags, and accessories.</p>
      <p>Choosing equipment requires more than comparing prices. Confirm that each item is appropriate for the task, compatible with the rest of the system, within its inspection and service life, and compliant with the applicable manufacturer instructions and workplace requirements. Product specifications, certification markings, intended use, user weight limits, compatibility, and environmental conditions should be reviewed by a competent person before purchase or deployment. Never substitute a product solely because it appears similar.</p>
      <p>Use the catalogue search and category filters to identify products, then add items to your enquiry or checkout. Stock, final pricing, delivery arrangements, and product suitability are confirmed by NEAS before an order is finalized. For project quantities, technical questions, equipment packages, or procurement support, contact the NEAS team with your required product, intended application, quantity, and delivery location.</p>
      <h3>Equipment selection and ordering</h3>
      <p>NEAS supports customers seeking rope-access PPE and height-safety equipment for industrial, commercial, construction, telecom, and renewable-energy applications. Orders are subject to stock confirmation. Where a product requires a specific technical document or manufacturer reference, request the latest information from NEAS before use. All equipment must be selected, inspected, maintained, and used in accordance with its manufacturer instructions and the site's approved risk assessment and safe system of work.</p>
      <p>For bulk requirements or specialist project scopes, <a href="/#contact">request a quotation from NEAS</a>. For information about handling customer and order information, read our <a href="/privacy-policy">Privacy Policy</a>.</p>
    </section>
  </div>;
}
