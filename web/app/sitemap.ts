import type { MetadataRoute } from "next";
import { getSetting, DEFAULT_SEO, type Seo } from "@/lib/settings";
import { listProducts } from "@/lib/db";
import { dedupePublicProducts } from "@/lib/catalog";
import { getStaticSitemapEntries } from "@/lib/sitemap-routes";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSetting<Seo>("seo", DEFAULT_SEO);
  const origin = (() => {
    try {
      return new URL(seo.canonical).origin;
    } catch {
      return "https://www.nextedge-access-solutions.com";
    }
  })();

  // Section routes share the homepage document and canonicalize to "/".
  // Only standalone, self-canonical pages belong in the sitemap.
  const now = new Date();
  const products = dedupePublicProducts(
    await listProducts().catch((err) => {
      console.error("[sitemap] listProducts failed; product URLs omitted:", err);
      return [];
    }),
  );

  return [
    ...getStaticSitemapEntries(origin, now),
    ...products.map((product) => ({
      url: `${origin}/store/p/${product.id}`,
      lastModified: now,
      priority: 0.7,
    })),
  ];
}
