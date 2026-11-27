import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../site/home.html", import.meta.url), "utf8");

test("homepage hero exposes accessible carousel navigation controls", () => {
  assert.match(html, /hero-carousel-prev/);
  assert.match(html, /hero-carousel-next/);
  assert.match(html, /hero-carousel-dots/);
  assert.match(html, /aria-label="Homepage hero carousel"/);
});

test("homepage hero supports fade, five-second rotation and reduced motion", () => {
  assert.match(html, /setInterval|setTimeout/);
  assert.match(html, /5000/);
  assert.match(html, /prefers-reduced-motion/);
  assert.match(html, /hero-slide.on/);
});
