import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (rel: string) =>
  readFileSync(new URL(`../${rel}`, import.meta.url), "utf8");

describe("scroll reveal never hides tall content", () => {
  // A ratio threshold such as 0.12 can never be reached by an element taller than
  // about eight screens, so the privacy policy stayed at opacity 0 for good.
  it("ScrollReveal reveals as soon as any part is on screen", () => {
    const src = read("components/ScrollReveal.tsx");
    expect(src).toMatch(/threshold:\s*0\b/);
    expect(src).not.toMatch(/threshold:\s*0?\.\d/);
    expect(src).toContain("prefers-reduced-motion");
  });

  it("the homepage reveal uses the same rule", () => {
    const html = read("site/home.html");
    expect(html).toContain("{threshold:0,rootMargin:'0px 0px -40px 0px'}");
    expect(html).not.toMatch(/threshold:0?\.\d/);
  });
});

describe("text contrast on orange", () => {
  it("shared buttons put dark text on the orange fill, not white", () => {
    const css = read("app/globals.css");
    expect(css).toContain("--on-accent:#1c1917");
    expect(css).toContain(
      ".btn-primary{background:var(--accent);color:var(--on-accent)}"
    );
    expect(css).toContain(
      ".eyebrow{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-ink)}"
    );
  });

  it("the homepage keeps its contrast overrides and a visible client title", () => {
    const html = read("site/home.html");
    const block = html.slice(html.indexOf('<style id="a11y-contrast">'));
    expect(block).toContain(
      "#neas-client-showcase-title{color:#fff!important}"
    );
    expect(block).toContain(".stat-num{color:var(--accent-ink)}");
    // The overrides must come after every other style rule to take effect.
    expect(html.lastIndexOf("<style")).toBe(
      html.indexOf('<style id="a11y-contrast">')
    );
  });

  it("service cards are not buttons wrapping a link", () => {
    const html = read("site/home.html");
    expect(html).not.toMatch(/class="service-card[^"]*"[^>]*role="button"/);
  });
});
