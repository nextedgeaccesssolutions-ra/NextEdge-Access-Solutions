import { SERVICE_PAGES } from "./service-pages";

/**
 * Public routes that represent distinct, self-canonical pages.
 * The services directory and each service detail page are separate,
 * crawlable destinations. Legacy /about, /partners and /contact URLs
 * remain section views and are intentionally omitted.
 */
export function getStaticSitemapEntries(origin: string, now: Date) {
  return [
    { url: `${origin}/`, lastModified: now, priority: 1 },
    { url: `${origin}/services`, lastModified: now, priority: 0.95 },
    { url: `${origin}/store`, lastModified: now, priority: 0.9 },
    { url: `${origin}/our-clients`, lastModified: now, priority: 0.8 },
    { url: `${origin}/locations/marilao-bulacan`, lastModified: now, priority: 0.9 },
    ...SERVICE_PAGES.map(p => ({
      url: `${origin}/services/${p.id}`,
      lastModified: now,
      priority: 0.9,
    })),
    { url: `${origin}/privacy-policy`, lastModified: now, priority: 0.3 },
  ];
}
