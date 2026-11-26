import { SERVICE_PAGES } from "./service-pages";

/**
 * Public routes that represent distinct, self-canonical pages.
 *
 * The /home, /about, /services, /partners, and /contact routes are section
 * views of the same homepage document. They intentionally canonicalize to
 * "/" and must not be advertised as separate sitemap destinations.
 */
export function getStaticSitemapEntries(origin: string, now: Date) {
  return [
    { url: `${origin}/`, lastModified: now, priority: 1 },
    { url: `${origin}/store`, lastModified: now, priority: 0.9 },
    { url: `${origin}/our-clients`, lastModified: now, priority: 0.8 },
    // Each service landing page is its own self-canonical page and the main
    // target for commercial searches, so it must be discoverable here.
    ...SERVICE_PAGES.map((p) => ({ url: `${origin}/services/${p.id}`, lastModified: now, priority: 0.9 })),
    { url: `${origin}/privacy-policy`, lastModified: now, priority: 0.3 },
  ];
}
