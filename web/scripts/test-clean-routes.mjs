import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const homepage = read("../site/home.html");
const homepageRenderer = read("../lib/homepage.ts");
const routeHandler = read("../app/[slug]/route.ts");
const sitemap = read("../app/sitemap.ts");
const sitemapRoutes = read("../lib/sitemap-routes.ts");
const storePage = read("../app/store/page.tsx");

const legacyRoutes = {
  hero: "/home",
  about: "/about",
  services: "/services",
  store: "/store",
  partners: "/partners",
  contact: "/contact",
};

for (const [fragment, destination] of Object.entries(legacyRoutes)) {
  assert.ok(homepage.includes('href="' + destination + '"'), "homepage is missing " + destination);
  assert.ok(homepageRenderer.includes(fragment + ':"' + destination + '"'), "legacy redirect map is missing #" + fragment);
  assert.ok(!homepage.includes('href="#' + fragment + '"'), "legacy href remains for #" + fragment);
}

for (const slug of ["home", "about", "services", "partners", "contact"]) {
  assert.ok(routeHandler.includes(slug + ": {"), "Next.js route handler is missing /" + slug);
}

// Section routes intentionally canonicalize to the homepage and must not be
// listed as separate sitemap destinations. Keep the test aligned with the
// canonical route registry rather than requiring obsolete section URLs.
assert.ok(sitemap.includes("getStaticSitemapEntries"), "sitemap must use the canonical static route registry");

const staticSitemapPaths = [...sitemapRoutes.matchAll(/url:\s*`\$\{origin\}([^`]+)`/g)].map((match) => match[1]);
assert.deepEqual(
  staticSitemapPaths,
  ["/", "/store", "/our-clients", "/privacy-policy"],
  "sitemap must contain only the distinct, self-canonical static pages",
);

assert.ok(storePage.includes('canonical: "https://www.next-edge-access-solutions.com/store"') || storePage.includes('canonical: "https://www.nextedge-access-solutions.com/store"'), "store canonical URL must remain /store");
assert.ok(homepageRenderer.includes("window.location.search"), "legacy redirects must preserve query strings");
assert.ok(homepageRenderer.includes("window.history.replaceState"), "legacy redirects must replace history to avoid back-button loops");
assert.ok(!homepage.includes("showStore()"), "legacy homepage store overlay handler must be removed");
assert.ok(!homepage.includes("location.hash==='#store'"), "legacy store hash-open handler must be removed");

console.log("Clean public route contract passed.");
