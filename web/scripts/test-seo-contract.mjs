import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const layout = read("../app/layout.tsx");
const settings = read("../lib/settings.ts");
const sitemap = read("../app/sitemap.ts");
const robots = read("../app/robots.ts");
const servicePages = read("../lib/service-pages.ts");

assert.match(layout, /metadataBase:\s*new URL\("https:\/\/www\.nextedge-access-solutions\.com"\)/, "metadataBase must use the canonical public domain");
assert.match(layout, /NextEdge Access Solutions \(NEAS\) OPC/, "organization identity must be present");
assert.match(layout, /Marilao, Bulacan/, "homepage metadata must use the verified NEAS base location");
assert.match(layout, /across the Philippines/, "homepage metadata must state the national service area");
assert.doesNotMatch(layout, /Based in Cebu|rope access Cebu/i, "stale Cebu location targeting must not return");
assert.match(layout, /rope access Bulacan/i, "local SEO terms must match the verified base location");
assert.match(settings, /canonical:\s*"https:\/\/www\.nextedge-access-solutions\.com\//, "default canonical setting must match metadataBase");
assert.match(settings, /robotsIndex:\s*true/, "default SEO configuration must remain indexable");
assert.match(sitemap, /getStaticSitemapEntries\(origin, now\)/, "sitemap must include approved static routes");
assert.match(sitemap, /dedupePublicProducts/, "sitemap must deduplicate public product routes");
assert.match(robots, /sitemap:\s*`\$\{origin\}\/sitemap\.xml`/, "robots.txt must advertise the generated sitemap");
for (const route of ["/admin", "/account", "/api/"]) {
  assert.ok(robots.includes(route), "robots.txt must disallow private route " + route);
}
const serviceCount = (servicePages.match(/\bid:\s*"/g) || []).length;
const descriptionCount = (servicePages.match(/metaDescription:/g) || []).length;
const headingCount = (servicePages.match(/\bh1:/g) || []).length;
assert.ok(serviceCount >= 6, "service landing-page coverage unexpectedly shrank");
// The source type declaration contributes one occurrence to each field count.
assert.equal(descriptionCount, serviceCount + 1, "every service page must define a meta description");
assert.equal(headingCount, serviceCount + 1, "every service page must define one H1 source field");

console.log("NEAS SEO contract passed: canonical host, verified location, robots, sitemap and service-page metadata.");
