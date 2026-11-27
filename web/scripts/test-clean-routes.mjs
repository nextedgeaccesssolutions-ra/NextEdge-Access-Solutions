import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const homepage = read("../site/home.html");
const homepageRenderer = read("../lib/homepage.ts");
const routeHandler = read("../app/[slug]/route.ts");
const sitemap = read("../lib/sitemap-routes.ts");
const servicesDirectory = read("../app/services/page.tsx");
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

for (const slug of ["home", "about", "partners", "contact"]) {
  assert.ok(routeHandler.includes(slug + ": {"), "Next.js route handler is missing /" + slug);
}
assert.ok(!routeHandler.includes('services: {'), "legacy dynamic section route must not shadow the services directory");
assert.ok(servicesDirectory.includes('canonical: "/services"'), "services directory must declare its own canonical URL");
assert.ok(servicesDirectory.includes('href={`/services/${service.id}`}'), "services directory must link to each detail page");
assert.ok(servicesDirectory.includes("SERVICE_PAGES"), "services directory must use the maintained service catalog");

for (const route of ["/", "/services", "/store", "/our-clients", "/privacy-policy"]) {
  assert.ok(sitemap.includes("${origin}" + route), "sitemap route helper is missing " + route);
}
for (const obsolete of ["/about", "/partners", "/contact"]) {
  const bare = new RegExp("\\$\\{origin\\}" + obsolete.replace("/", "\\/") + "[`'\\"]");
  assert.ok(!bare.test(sitemap), "obsolete route remains in sitemap: " + obsolete);
}

assert.ok(storePage.includes('canonical: "https://www.nextedge-access-solutions.com/store"'), "store canonical URL must remain /store");
assert.ok(homepageRenderer.includes("window.location.search"), "legacy redirects must preserve query strings");
assert.ok(homepageRenderer.includes("window.history.replaceState"), "legacy redirects must replace history to avoid back-button loops");
assert.ok(!homepage.includes("showStore()"), "legacy homepage store overlay handler must be removed");
assert.ok(!homepage.includes("location.hash==='#store'"), "legacy store hash-open handler must be removed");

console.log("Clean public route contract passed.");
