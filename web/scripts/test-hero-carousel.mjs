import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_HERO_SLIDES, sanitizeHeroSlides } from "../lib/hero-carousel.ts";

test("provides the six existing NEAS hero image slides as defaults", () => {
  assert.equal(DEFAULT_HERO_SLIDES.length, 6);
  assert.ok(DEFAULT_HERO_SLIDES.every((slide) => slide.enabled && slide.image.startsWith("/img/")));
});

test("accepts a valid managed slide and trims editable text", () => {
  const [slide] = sanitizeHeroSlides([{
    id: "solar",
    label: " Solar Energy ",
    title: " Solar project support ",
    description: " Renewable field services ",
    image: "/api/img/abc12345",
    alt: "Solar farm technicians",
    ctaLabel: "Get a quote",
    ctaUrl: "/contact",
    enabled: true,
  }]);
  assert.equal(slide.label, "Solar Energy");
  assert.equal(slide.ctaUrl, "/contact");
});

test("rejects unsafe URLs and configurations with no enabled slides", () => {
  assert.equal(sanitizeHeroSlides([{ ...DEFAULT_HERO_SLIDES[0], image: "javascript:alert(1)" }]), null);
  assert.equal(sanitizeHeroSlides([{ ...DEFAULT_HERO_SLIDES[0], enabled: false }]), null);
});

test("limits carousel to eight slides and field lengths", () => {
  const many = Array.from({ length: 9 }, (_, i) => ({ ...DEFAULT_HERO_SLIDES[0], id: String(i) }));
  assert.equal(sanitizeHeroSlides(many), null);
  const [slide] = sanitizeHeroSlides([{ ...DEFAULT_HERO_SLIDES[0], title: "x".repeat(300) }]);
  assert.ok(slide.title.length <= 120);
});
