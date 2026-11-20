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
    { url: `${origin}/privacy-policy`, lastModified: now, priority: 0.3 },
  ];
}
