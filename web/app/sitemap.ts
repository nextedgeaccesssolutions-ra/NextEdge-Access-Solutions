import type { MetadataRoute } from "next";
import { getSetting, DEFAULT_SEO, type Seo } from "@/lib/settings";
import { listProducts } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSetting<Seo>("seo", DEFAULT_SEO);
  const origin = (() => { try { return new URL(seo.canonical).origin; } catch { return "https://www.nextedge-access-solutions.com"; } })();
  // Keep the sitemap limited to public, indexable destinations. Authentication and account routes are intentionally excluded.
  return [
    { url: `${origin}/`, priority: 1 },
    { url: `${origin}/store`, priority: 0.9 },
    { url: `${origin}/privacy-policy`, priority: 0.3 },
    ...(await listProducts().catch(() => [])).map((p) => ({ url: `${origin}/store/p/${p.id}`, priority: 0.7 })),
  ];
}
