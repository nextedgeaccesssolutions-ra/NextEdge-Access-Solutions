import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";

const requiredFiles = [
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "public/catalog.js",
  "public/manifest.webmanifest",
  "public/service-worker.js",
  "public/robots.txt",
  "public/sitemap.xml",
  "public/icons/icon.svg",
  "api/store-content.js",
  "api/store-request.js",
];

await Promise.all(requiredFiles.map((file) => access(file, constants.R_OK)));

const html = await readFile("public/index.html", "utf8");
for (const marker of ["#quote", "manifest.webmanifest"]) {
  if (!html.includes(marker)) throw new Error(`Missing required storefront marker: ${marker}`);
}

const app = await readFile("public/app.js", "utf8");
if (!app.includes("service-worker.js")) throw new Error("The storefront does not register its service worker.");
if (!app.includes("Request an equipment quotation")) throw new Error("The storefront is missing its quotation request state.");

console.log(`NEAS storefront ${process.argv.includes("--check") ? "check" : "build"} passed (${requiredFiles.length} required files).`);
