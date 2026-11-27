import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../site/home.html", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../lib/homepage.ts", import.meta.url), "utf8");

test("homepage renderer replaces the entire existing slide wrapper, not just its first child", () => {
  const slides = '<div class="hero-slide">one</div><div class="hero-slide">two</div>';
  const rendered = html.replace(
    /<div class="hero-bg"><div class="hero-slides">[\s\S]*?<\/div><\/div><div class="hero-carousel-controls"/,
    '<div class="hero-bg"><div class="hero-slides">' + slides + '</div></div><div class="hero-carousel-controls"'
  );
  const wrapper = rendered.match(/<div class="hero-slides">([\s\S]*?)<\/div><\/div><div class="hero-carousel-controls"/);
  assert.ok(wrapper, "hero slides wrapper should remain immediately before controls");
  assert.equal((wrapper[1].match(/class="hero-slide"/g) || []).length, 2);
  assert.ok(!wrapper[1].includes("Wind Turbines"), "stale static slides must not remain");
});

test("managed hero images use real alt text and defer non-first slide loading", () => {
  assert.match(renderer, /<img class="hero-slide-image"/);
  assert.match(renderer, /alt="\$\{esc\(slide\.alt\)\}"/);
  assert.match(renderer, /loading="\$\{index === 0 \? "eager" : "lazy"\}"/);
});
