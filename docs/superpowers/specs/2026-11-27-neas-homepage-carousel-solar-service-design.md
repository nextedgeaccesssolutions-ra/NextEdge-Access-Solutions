# NEAS Homepage Carousel and Solar Service Page — Design

## Intent
Add an administrator-managed homepage hero carousel and a new SEO-ready Solar Energy & Industrial Services landing page while preserving the existing NEAS homepage, visual identity, contact flow, existing hero images, service routes, and production settings.

## Goals
- Support up to eight enabled hero slides with image, alt text, eyebrow label, headline, description, CTA label and destination.
- Rotate automatically every five seconds with a fade, manual previous/next controls, keyboard-accessible controls, and slide indicators.
- Allow administrators to add, edit, upload/replace, reorder, enable/disable, delete, save and publish slides.
- Preserve the existing six hero image assets and the current static hero as the fallback if no saved carousel configuration exists.
- Add a Solar Energy & Industrial Services page at /services/solar-energy-industrial with quotation CTA, service scope, industries, FAQs, metadata, canonical URL, Open Graph, Twitter and Service/FAQ/Breadcrumb structured data.
- Provide admin editing for the new service page's copy, image, FAQs and SEO fields.
- Add the service to homepage navigation/cards and the generated sitemap.

## Non-goals
- No production deployment or direct merge to main.
- No changes to existing contact form behavior, existing service page content, store checkout, or global SEO settings.
- No claims of electrical licensing, EPC capability, project delivery statistics, or solar engineering approvals unless separately verified.

## Constraints
- Keep the existing Next.js App Router, static HTML homepage renderer, database settings store, upload endpoint, and admin authentication.
- Use the current NEAS navy/gold palette and existing hero image assets as initial defaults.
- All admin writes must remain behind requireAdmin().
- External image and CTA URLs must be validated; local /api/img and /img assets remain supported.
- Keep the carousel usable with reduced-motion preferences and pause automatic movement when the page is hidden or the user interacts.

## Approaches
1. Replace the homepage with a React carousel: rejected because the homepage is deliberately served from static HTML and it would broaden the migration.
2. Keep the existing fixed slideshow and add only arrows: rejected because content would remain hard-coded and not administrator-managed.
3. Extend the current renderer and settings store: selected because it preserves existing delivery and makes content editable without introducing a new CMS or dependency.

## Design decisions
- Store carousel configuration in the existing settings table under hero_carousel.
- Store Solar service-page overrides in settings under service_page_solar_energy_industrial, with source-controlled defaults retained as fallback.
- Render slide content server-side into the existing hero markup; use a small inline script for transitions and controls.
- Upload images through the existing authenticated /api/admin/upload endpoint.
- Keep the public service route statically enumerated by generateStaticParams and dynamically load its managed content for rendering and metadata.
- Admin UI uses simple move-up/move-down controls for reliable ordering on desktop and mobile.

## Risks and mitigations
- Invalid saved settings could break homepage rendering: sanitize inputs and fall back to built-in slides.
- Empty carousel could leave the hero blank: require at least one enabled slide.
- External image links may be unavailable: retain existing local images as defaults and provide an image fallback.
- Service copy may imply unverified capabilities: use careful project-support wording and qualify electrical work by required credentials and approvals.
