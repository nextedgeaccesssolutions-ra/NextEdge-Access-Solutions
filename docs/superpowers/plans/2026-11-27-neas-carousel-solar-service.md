# NEAS Homepage Carousel and Solar Service Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an editable homepage hero carousel and an SEO-ready, admin-editable Solar Energy & Industrial Services page.

**Architecture:** Reuse the existing Next.js static homepage renderer and settings table. Add validated settings helpers and admin components, then extend the existing service-page data, route metadata, homepage service cards and sitemap.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, static HTML/CSS/JS homepage, existing Postgres settings store, existing admin upload API.

**Spec:** `docs/superpowers/specs/2026-11-27-neas-homepage-carousel-solar-service-design.md`

## Global Constraints
- Preserve the current homepage design and all six existing hero image assets.
- Carousel rotation interval is 5 seconds; transition is a fade.
- Support no more than eight slides and require at least one enabled slide.
- Keep admin writes behind existing admin authorization.
- Do not modify production directly or merge to main.
- Solar service page canonical path is `/services/solar-energy-industrial`.
- Do not invent certifications, electrical licenses, project references or guaranteed solar EPC capability.

## Review Focus
- Invalid or unsafe image/CTA URLs: test rejection and fallback.
- All slides disabled or empty list: test rejection and built-in fallback.
- Existing saved hero image setting: ensure it remains intact and the new carousel uses its own setting.
- Reduced-motion and hidden-tab behavior: verify carousel does not force movement.
- New service slug and sitemap: verify route generation, canonical metadata and discoverability.

---

### Task 1: Carousel settings contract

**Files:**
- Create: `web/lib/hero-carousel.ts`
- Create: `web/scripts/test-hero-carousel.mjs`
- Modify: `web/package.json`

**Interfaces:**
- Produces `HeroCarouselSlide`, `DEFAULT_HERO_SLIDES`, `sanitizeHeroSlides(value)`.

- [ ] Write tests for valid defaults, maximum eight slides, safe image/CTA URLs, enabled-slide requirement and text-length limits.
- [ ] Run the test and confirm it fails because the module does not yet exist.
- [ ] Implement the typed defaults and sanitizer.
- [ ] Run the test and confirm it passes.
- [ ] Add `test:hero-carousel` script.

### Task 2: Public homepage carousel

**Files:**
- Modify: `web/lib/homepage.ts`
- Modify: `web/site/home.html`
- Create: `web/scripts/test-homepage-carousel.mjs`

**Interfaces:**
- `renderHomepage()` reads `hero_carousel`, sanitizes it, and renders enabled slides into `.hero-slides`.
- Existing image assets and original static hero remain fallback.

- [ ] Write source-contract tests for five-second rotation, controls, dot navigation, alt labels and reduced-motion handling.
- [ ] Run the test and confirm it fails before implementation.
- [ ] Render server-managed slide data safely into HTML attributes.
- [ ] Implement previous/next controls, indicators, fade, automatic rotation and pause behavior.
- [ ] Run carousel tests and homepage tests.

### Task 3: Admin carousel manager

**Files:**
- Create: `web/app/admin/HeroCarouselManager.tsx`
- Modify: `web/app/admin/page.tsx`
- Modify: `web/app/admin/AdminShell.tsx`
- Modify: `web/app/api/admin/site/route.ts`

**Interfaces:**
- Admin page reads `hero_carousel` and passes slides to `HeroCarouselManager`.
- Manager saves `{ heroCarousel: slides }` to existing `PUT /api/admin/site`.
- Images use existing `POST /api/admin/upload`.

- [ ] Write API/source-contract tests for admin authorization and slide validation.
- [ ] Implement add/edit/upload/reorder/enable/disable/delete/save controls.
- [ ] Add a dedicated Homepage Carousel section in the admin navigation.
- [ ] Verify legacy `site_photos.hero` setting is neither deleted nor overwritten.

### Task 4: Solar service content and managed overrides

**Files:**
- Modify: `web/lib/service-pages.ts`
- Create: `web/lib/managed-service-pages.ts`
- Create: `web/app/admin/SolarServiceManager.tsx`
- Modify: `web/app/admin/page.tsx`
- Modify: `web/app/admin/AdminShell.tsx`
- Modify: `web/app/api/admin/site/route.ts`
- Modify: `web/app/services/[slug]/page.tsx`

**Interfaces:**
- Add `solar-energy-industrial` to `SERVICE_PAGES`.
- `getManagedServicePage(id)` merges validated saved overrides with source-controlled defaults.
- Admin manager saves `{ solarServicePage: overrides }` to the existing admin site endpoint.

- [ ] Write tests confirming service copy, required SEO fields, FAQ structure and safe image URL.
- [ ] Add the service page defaults using capability-safe language.
- [ ] Implement settings override read/write and admin editing for headline, intro, scope, industries, FAQs, image and SEO.
- [ ] Use managed page content in public rendering and `generateMetadata`.
- [ ] Confirm Service, FAQPage and BreadcrumbList JSON-LD remain valid.

### Task 5: Homepage discovery and SEO

**Files:**
- Modify: `web/lib/services.ts`
- Modify: `web/site/home.html`
- Modify: `web/lib/sitemap-routes.test.ts`
- Create: `web/scripts/test-solar-service.mjs`
- Modify: `web/package.json`

- [ ] Add a crawlable homepage service card linking to the new page.
- [ ] Add a matching service metadata entry and maintain drift-test expectations.
- [ ] Add the slug to sitemap coverage through `SERVICE_PAGES`.
- [ ] Run service-page, sitemap, SEO schema and clean-route tests.

### Task 6: Verification and review

- [ ] Run all relevant tests in `web/package.json`.
- [ ] Run `npm run build` from `web/`.
- [ ] Inspect the Git diff and check mobile/accessibility behavior.
- [ ] Open a draft pull request; do not merge or deploy production without approval.
