import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { DEFAULT_SEO, DEFAULT_SOCIAL, DEFAULT_BUSINESS } from "./settings";

// getSetting reads the settings table; this suite is about tag selection, so
// serve the shipped defaults instead of standing up a database.
vi.mock("./db", () => ({ sql: async () => [] }));

const { renderHomepage } = await import("./homepage");

/** Reads a meta tag's content out of rendered HTML. */
const meta = (html: string, attr: "property" | "name", key: string) =>
  html.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)"`))?.[1] ?? null;
const title = (html: string) => html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;
/** Mirrors the escaping renderHomepage applies, so expectations compare like with like. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

describe("per-service Open Graph tags", () => {
  let plain: string, ndt: string, unknown: string;
  const cwd = process.cwd();

  beforeAll(async () => {
    // renderHomepage resolves site/home.html from cwd; point it at web/ and restore after.
    process.chdir(fileURLToPath(new URL("..", import.meta.url)));
    [plain, ndt, unknown] = await Promise.all([
      renderHomepage(), renderHomepage("ndt-inspection"), renderHomepage("not-a-service"),
    ]);
  });

  afterAll(() => process.chdir(cwd));

  it("serves the site-level tags with no service", () => {
    expect(title(plain)).toBe(esc(DEFAULT_SEO.title));
    expect(meta(plain, "property", "og:title")).toBe(esc(DEFAULT_SEO.title));
    expect(meta(plain, "property", "og:description")).toBe(esc(DEFAULT_SEO.description));
  });

  it("describes the service when one is named", () => {
    expect(meta(ndt, "property", "og:title")).toBe(esc(`NDT & Industrial Inspection | ${DEFAULT_BUSINESS.name}`));
    expect(meta(ndt, "property", "og:description")).toContain("Non-destructive testing");
    expect(meta(ndt, "property", "og:description")).not.toBe(esc(DEFAULT_SEO.description));
  });

  it("points og:image at that service's own absolute image", () => {
    const img = meta(ndt, "property", "og:image");
    expect(img).toBe("https://www.nextedge-access-solutions.com/img/877206fcf5ba.jpg");
    expect(img).not.toBe(meta(plain, "property", "og:image"));
  });

  it("sets og:url to the deep link so the card resolves back to the service", () => {
    expect(meta(ndt, "property", "og:url")).toBe("https://www.nextedge-access-solutions.com/?service=ndt-inspection");
  });

  it("keeps the twitter tags in step with the og tags", () => {
    expect(meta(ndt, "name", "twitter:title")).toBe(meta(ndt, "property", "og:title"));
    expect(meta(ndt, "name", "twitter:description")).toBe(meta(ndt, "property", "og:description"));
    expect(meta(ndt, "name", "twitter:image")).toBe(meta(ndt, "property", "og:image"));
  });

  it("leaves canonical on the homepage, so services are not six duplicate pages", () => {
    expect(ndt).toContain(`<link rel="canonical" href="${DEFAULT_SEO.canonical}">`);
    expect(ndt.match(/<link rel="canonical"/g)).toHaveLength(1);
  });

  it("falls back to the site-level tags for an unknown service", () => {
    expect(meta(unknown, "property", "og:title")).toBe(esc(DEFAULT_SEO.title));
    expect(meta(unknown, "property", "og:url")).toBe(DEFAULT_SEO.canonical);
  });

  it("emits one of each tag, not a duplicate set", () => {
    for (const key of ["og:title", "og:description", "og:url", "og:image"]) {
      expect(ndt.match(new RegExp(`<meta property="${key}"`, "g")), key).toHaveLength(1);
    }
  });

  it("renders the same service body regardless of the tags", () => {
    expect(ndt).toContain('id="svc-share"');
    expect(ndt.length).toBeGreaterThan(100_000);
  });
});
