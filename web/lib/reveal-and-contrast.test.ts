import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");
// Prettier reflows CSS and HTML (line breaks, spaces, leading zeros), so these
// checks strip whitespace and look only at the property that matters.
const squash = (s: string) => s.replace(/\s+/g, "");
/** The declarations of the first rule for `selector` in squashed CSS. */
const rule = (css: string, selector: string) => {
  const at = css.indexOf(`${selector}{`);
  return at < 0 ? "" : css.slice(at, css.indexOf("}", at) + 1);
};

describe("scroll reveal never hides tall content", () => {
  // A ratio threshold such as 0.12 can never be reached by an element taller than
  // about eight screens, so the privacy policy stayed at opacity 0 for good.
  it("ScrollReveal reveals as soon as any part is on screen", () => {
    const src = squash(read("components/ScrollReveal.tsx"));
    expect(src).toMatch(/threshold:0[,}]/);
    expect(src).not.toMatch(/threshold:0?\.\d/);
    expect(src).toContain("prefers-reduced-motion");
  });

  it("the homepage reveal uses the same rule", () => {
    const html = squash(read("site/home.html"));
    expect(html).toContain("{threshold:0,rootMargin:'0px0px-40px0px'}");
    expect(html).not.toMatch(/threshold:0?\.\d/);
  });
});

describe("text contrast on orange", () => {
  const css = squash(read("app/globals.css"));

  it("defines the readable orange shades", () => {
    expect(css).toContain("--on-accent:#1c1917");
    expect(css).toContain("--accent-ink:#c2410c");
  });

  it("buttons put dark text on the orange fill, not white", () => {
    for (const sel of [".btn-primary", ".nav.cta", ".nav-mobile.cta"]) {
      const r = rule(css, sel);
      expect(r, sel).toContain("background:var(--accent)");
      expect(r, sel).toContain("color:var(--on-accent)");
    }
  });

  it("orange text on light backgrounds uses the deeper shade", () => {
    expect(rule(css, ".eyebrow")).toContain("color:var(--accent-ink)");
  });

  it("the homepage keeps its contrast overrides and a visible client title", () => {
    const html = squash(read("site/home.html"));
    const at = html.indexOf('<styleid="a11y-contrast">');
    expect(at).toBeGreaterThan(-1);
    const block = html.slice(at);
    expect(block).toContain(
      "#neas-client-showcase-title{color:#fff!important}"
    );
    expect(block).toContain(".stat-num{color:var(--accent-ink)}");
    // The overrides must come after every other style rule to take effect.
    expect(html.lastIndexOf("<style")).toBe(at);
  });

  it("service cards are not buttons wrapping a link", () => {
    const html = read("site/home.html");
    expect(html).not.toMatch(/class="service-card[^"]*"[^>]*role="button"/);
  });
});
