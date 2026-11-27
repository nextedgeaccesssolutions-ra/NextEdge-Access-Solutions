import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../site/home.html", import.meta.url), "utf8");
const start = html.indexOf("var s=[].slice.call(document.querySelectorAll('.hero-slide'))");
const end = html.indexOf("</script>", start);
const slideshow = start >= 0 && end > start ? html.slice(start, end) : "";

test("hero slideshow keeps the restored static fallback for reduced-motion visitors", () => {
  assert.ok(start >= 0, "homepage hero slideshow script should exist");
  const guard = slideshow.indexOf("window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches");
  const firstTimer = slideshow.indexOf("setTimeout(next,5000)");
  assert.ok(guard >= 0, "slideshow should check the reduced-motion preference");
  assert.ok(firstTimer > guard, "reduced-motion guard must run before any slideshow timer");
  const fallback = slideshow.slice(guard, firstTimer);
  assert.match(fallback, /lab\.textContent='High-Rise Facades';/);
  assert.match(fallback, /return;/);
});

test("normal-motion visitors retain the six-slide sequence and existing timing", () => {
  assert.equal((html.match(/class="hero-slide"/g) || []).length, 6);
  assert.match(slideshow, /setTimeout\(next,5000\)/);
  assert.match(slideshow, /setTimeout\(next,6000\)/);
});
