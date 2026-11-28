import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SERVICE_META, getServiceMeta } from "./services";
import { SERVICE_PAGES } from "./service-pages";

const html = readFileSync(
  fileURLToPath(new URL("../site/home.html", import.meta.url)),
  "utf8"
);

/** Pulls the inline `const SERVICES={...}` object out of the static homepage. */
function parseInlineServices(): Record<
  string,
  { title: string; desc: string }
> {
  const start = html.indexOf("const SERVICES={");
  expect(
    start,
    "inline SERVICES object not found in home.html"
  ).toBeGreaterThan(-1);
  const block = html.slice(start, html.indexOf("\n};", start));
  const out: Record<string, { title: string; desc: string }> = {};
  for (const m of block.matchAll(
    /'([a-z-]+)':\{tag:'[^']*',title:'([^']*)',desc:'([^']*)'/g
  )) {
    out[m[1]] = { title: m[2], desc: m[3] };
  }
  return out;
}

/** Pulls each service card's id and background image out of the markup. */
function parseCardImages(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of html.matchAll(
    /openModal\('([a-z-]+)'\)[\s\S]{0,400}?background-image:url\('([^']+)'\)/g
  )) {
    out[m[1]] ??= m[2];
  }
  return out;
}

describe("service metadata stays in step with the static homepage", () => {
  const inline = parseInlineServices();
  const images = parseCardImages();

  it("parses the homepage it is checking against", () => {
    expect(Object.keys(inline).length).toBeGreaterThan(0);
    expect(Object.keys(images).length).toBeGreaterThan(0);
  });

  it("covers exactly the services the homepage defines", () => {
    expect(Object.keys(SERVICE_META).sort()).toEqual(
      Object.keys(inline).sort()
    );
  });

  it("has a card image for every service", () => {
    expect(Object.keys(images).sort()).toEqual(
      Object.keys(SERVICE_META).sort()
    );
  });

  it("includes a crawlable solar-energy service card and matching modal copy", () => {
    const solar = SERVICE_META["solar-energy-industrial"];
    expect(solar).toBeDefined();
    expect(images["solar-energy-industrial"]).toBe(solar.image);
    expect(inline["solar-energy-industrial"]).toEqual({
      title: solar.title,
      desc: solar.desc,
    });
  });

  for (const [id, meta] of Object.entries(SERVICE_META)) {
    it(`matches the homepage copy for ${id}`, () => {
      expect(
        inline[id],
        `${id} is missing from the inline SERVICES object`
      ).toBeDefined();
      expect(meta.title).toBe(inline[id].title);
      expect(meta.desc).toBe(inline[id].desc);
      // Same photo; the homepage may serve a WebP copy while share previews keep the JPEG.
      const base = (u: string) => u.replace(/\.(jpe?g|png|webp)$/i, "");
      expect(base(meta.image)).toBe(base(images[id]));
    });
  }
});

describe("getServiceMeta", () => {
  it("resolves a known service", () => {
    expect(getServiceMeta("ndt-inspection")?.title).toBe(
      "NDT & Industrial Inspection"
    );
  });

  it("returns null for unknown, empty and missing values", () => {
    expect(getServiceMeta("not-a-service")).toBeNull();
    expect(getServiceMeta("")).toBeNull();
    expect(getServiceMeta(null)).toBeNull();
    expect(getServiceMeta(undefined)).toBeNull();
  });

  it("does not resolve inherited Object properties", () => {
    expect(getServiceMeta("constructor")).toBeNull();
    expect(getServiceMeta("toString")).toBeNull();
    expect(getServiceMeta("__proto__")).toBeNull();
  });
});

describe("service landing page image metadata", () => {
  it("provides a usable image for every standalone service page", () => {
    for (const page of SERVICE_PAGES) {
      expect(page.image, `${page.id} must define its own page image`).toBeTruthy();
    }
  });
});
