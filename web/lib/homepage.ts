import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSetting, getSettingList, DEFAULT_SEO, DEFAULT_SOCIAL, DEFAULT_BUSINESS, type Seo, type Social, type Business } from "./settings";
import { DEFAULT_HERO_SLIDES, sanitizeHeroSlides, type HeroCarouselSlide } from "./hero-carousel";
import { getServiceMeta } from "./services";
import { addAccessibleLabelsToSideSocialAnchors, appendAfterSideSocialAnchor, replaceSideSocialAnchor, safeHttpsUrl, safeImageUrl } from "./html-safety";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
let cached: string | null = null;

/**
 * Renders the static homepage with SEO tags injected.
 *
 * `serviceId` comes from the `?service=` deep link the service modal's share
 * button produces. Social crawlers do not run JavaScript, so when it names a
 * known service the Open Graph and Twitter tags are overridden to describe
 * that service instead of the site as a whole. The canonical link is left
 * pointing at the homepage: these are the same page, not six new ones.
 */
export async function renderHomepage(serviceId?: string | null): Promise<string> {
  cached ??= await readFile(path.join(process.cwd(), "site", "home.html"), "utf8");
  let html = cached;
  // The static homepage is served through a route handler; declare Philippine English explicitly.
  html = html.replace(/<html(?:\s[^>]*)?>/i, '<html lang="en-PH">');
  const [seo, social, biz, sitePhotos, savedHeroSlides] = await Promise.all([
    getSetting<Seo>("seo", DEFAULT_SEO), getSetting<Social>("social", DEFAULT_SOCIAL), getSetting<Business>("business", DEFAULT_BUSINESS), getSetting<Record<string, string>>("site_photos", {}), getSettingList<HeroCarouselSlide>("hero_carousel"),
  ]);
  const heroSlides = (sanitizeHeroSlides(savedHeroSlides) ?? DEFAULT_HERO_SLIDES).filter(slide => slide.enabled);
  const canonical = safeHttpsUrl(seo.canonical) ?? DEFAULT_SEO.canonical;
  const origin = new URL(canonical).origin;
  // Render the admin-managed hero carousel, retaining the original hero as the fallback.
  const heroMarkup = heroSlides.map((slide, index) =>
    `<div class="hero-slide${index === 0 ? " on" : ""}" data-label="${esc(slide.label)}" data-title="${esc(slide.title)}" data-description="${esc(slide.description)}" data-cta-label="${esc(slide.ctaLabel)}" data-cta-url="${esc(slide.ctaUrl)}" aria-label="${esc(slide.alt)}" role="img" style="background-image:url(&quot;${esc(slide.image)}&quot;)"></div>`
  ).join("");
  html = html.replace(/<div class="hero-slides">[\\s\\S]*?<\\/div>/, `<div class="hero-slides">${heroMarkup}</div>`);
  // Keep the legacy hero image setting available for existing website-photo workflows.
  // Apply administrator-managed homepage photos while preserving the built-in defaults.
  const photoSources: Record<string, string> = {
    "/img/hero-city.jpg": safeImageUrl(sitePhotos.hero, "/img/hero-city.jpg"),
    "/img/ce6c22d9bace.jpg": safeImageUrl(sitePhotos.ropeAccess, "/img/ce6c22d9bace.jpg"),
    "/img/877206fcf5ba.jpg": safeImageUrl(sitePhotos.inspection, "/img/877206fcf5ba.jpg"),
    "/img/6447ca2a761e.jpg": safeImageUrl(sitePhotos.coatings, "/img/6447ca2a761e.jpg"),
    "/img/0cc8f91dab71.jpg": safeImageUrl(sitePhotos.metMast, "/img/0cc8f91dab71.jpg"),
    "/img/390f5ed3244c.jpg": safeImageUrl(sitePhotos.training, "/img/390f5ed3244c.jpg"),
    "/img/0ce37cb33507.jpg": safeImageUrl(sitePhotos.windEnergy, "/img/0ce37cb33507.jpg"),
  };
  for (const [original, replacement] of Object.entries(photoSources)) {
    if (replacement !== original) html = html.split(original).join(esc(replacement));
  }
  // Normalize the legacy public contact record to the verified NEAS business details.
  if (!biz.street?.trim()) biz.street = "B 15 Lot 6, Marilao Grand Villas, Barangay Loma de Gato";
  if (!biz.city?.trim()) biz.city = "Marilao";
  if (!biz.region?.trim()) biz.region = "Bulacan";
  if (!biz.postal?.trim()) biz.postal = "3019";
  const ogSrc = safeImageUrl(seo.ogImage || biz.logo || "/img/logo.png");
  const ogImage = ogSrc.startsWith("/") ? origin + ogSrc : ogSrc;
  const logoSrc = safeImageUrl(biz.logo || "/img/logo.png");
  const googleMapsUrl = safeHttpsUrl(social.googleMaps);
  const sameAs = [social.facebook, social.instagram, social.linkedin, social.youtube, social.tiktok, social.x, social.googleBusiness]
    .map(safeHttpsUrl).filter((value): value is string => value !== null);
  const ld = {
    "@context": "https://schema.org", "@type": "LocalBusiness", name: biz.name, url: canonical, image: ogImage,
    logo: logoSrc.startsWith("/") ? origin + logoSrc : logoSrc, telephone: biz.phone, email: biz.email, description: seo.description,
    areaServed: { "@type": "Country", name: "Philippines" },
    ...(biz.street || biz.city ? { address: { "@type": "PostalAddress", streetAddress: biz.street, addressLocality: biz.city, addressRegion: biz.region, postalCode: biz.postal, addressCountry: biz.country } } : {}),
    ...(biz.hours ? { openingHours: biz.hours } : {}),
    ...(googleMapsUrl ? { hasMap: googleMapsUrl } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
  const service = getServiceMeta(serviceId);
  const pageTitle = service ? `${service.title} | ${biz.name}` : seo.title;
  const pageDesc = service ? service.desc : seo.description;
  const pageImage = service ? origin + service.image : ogImage;
  const pageUrl = service ? `${canonical.replace(/\/$/, "")}/?service=${encodeURIComponent(serviceId as string)}` : canonical;
  const head = [
    `<title>${esc(pageTitle)}</title>`,
    `<meta name="description" content="${esc(pageDesc)}">`,
    seo.keywords && `<meta name="keywords" content="${esc(seo.keywords)}">`,
    `<link rel="canonical" href="${esc(canonical)}">`,
    `<link rel="alternate" hreflang="en-PH" href="${esc(canonical)}">`,
    `<meta name="robots" content="${seo.robotsIndex ? "index,follow" : "noindex,nofollow"}">`,
    `<meta property="og:type" content="website"><meta property="og:site_name" content="${esc(biz.name)}">`,
    `<meta property="og:title" content="${esc(pageTitle)}"><meta property="og:description" content="${esc(pageDesc)}">`,
    `<meta property="og:url" content="${esc(pageUrl)}"><meta property="og:image" content="${esc(pageImage)}">`,
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(pageTitle)}"><meta name="twitter:description" content="${esc(pageDesc)}"><meta name="twitter:image" content="${esc(pageImage)}">`,
    seo.googleVerification && `<meta name="google-site-verification" content="${esc(seo.googleVerification)}">`,
    seo.bingVerification && `<meta name="msvalidate.01" content="${esc(seo.bingVerification)}">`,
    ...String(seo.extraMeta ?? "").split("\n").filter((l) => l.includes("=")).map((l) => { const i = l.indexOf("="); return `<meta name="${esc(l.slice(0, i).trim())}" content="${esc(l.slice(i + 1).trim())}">`; }),
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].filter(Boolean).join("\n");
  html = html.replace(/<title>[\s\S]*?<\/title>\s*/, "").replace(/<meta name="description"[^>]*>\s*/, "");
  html = html.replace("</head>", head + "\n</head>");
  // The static homepage bypasses the React layout, so inject its consent interface here.
  const cookieConsent = await readFile(path.join(process.cwd(), "site", "cookie-consent.html"), "utf8");
  // The placeholders are always substituted, including with "" - left in place they would
  // read as a truthy host and produce a request to a literal __NEAS_RYBBIT_HOST__.
  html = html.replace("</body>", cookieConsent
    .replace("__NEAS_GA_ID__", esc(seo.gaMeasurementId || ""))
    .replace("__NEAS_RYBBIT_HOST__", esc(process.env.NEXT_PUBLIC_RYBBIT_HOST || ""))
    .replace("__NEAS_RYBBIT_SITE_ID__", esc(process.env.NEXT_PUBLIC_RYBBIT_SITE_ID || "")) + "\n</body>");
  // Normalize legacy section fragments to dedicated, crawlable public routes.
  // Fragments are client-only and never reach the server, so this compatibility
  // redirect must run in the browser. Keep query parameters and replace history.
  const legacyRedirect = `<script>(function(){var routes={hero:"/home",about:"/about",services:"/services",store:"/store",partners:"/partners",contact:"/contact"};function normalize(){var key=window.location.hash.slice(1).toLowerCase();var target=routes[key];if(!target)return;if(window.location.pathname!==target){window.location.replace(target+window.location.search);return;}window.history.replaceState(null,"",target+window.location.search);}window.addEventListener("hashchange",normalize);normalize();})();</script>`;
  html = html.replace("</body>", legacyRedirect + "</body>");
  // Public client showcase: render on the homepage for all visitors, with no account requirement.
  const clientShowcase = `
    <section id="neas-client-showcase" aria-labelledby="neas-client-showcase-title" style="padding:76px 20px;background:#0b1722;color:#eef4f8;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)">
      <div style="max-width:1120px;margin:0 auto">
        <div style="color:#d5ad69;text-transform:uppercase;letter-spacing:.16em;font-size:12px;font-weight:800">Partnerships · Performance · Trust</div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-top:12px">
          <div><h2 id="neas-client-showcase-title" style="font-size:clamp(28px,4vw,42px);line-height:1.15;color:#fff;margin:0 0 12px">Our Clients</h2><p style="max-width:680px;color:#b9c7d0;line-height:1.7;margin:0">We value the organizations and industry partners who place their trust in NEAS for specialist access and technical services.</p></div>
          <a href="/our-clients" style="display:inline-flex;align-items:center;padding:12px 18px;border-radius:8px;background:#c49a5a;color:#10202b;text-decoration:none;font-weight:800">View Our Clients ↗</a>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:30px">
          <a href="/our-clients" style="display:block;padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#122633;color:#fff;text-decoration:none"><span style="display:block;color:#d5ad69;font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase">Wind Energy</span><strong style="display:block;font-size:20px;margin-top:10px">Triconti ECC</strong></a>
          <a href="/our-clients" style="display:block;padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#122633;color:#fff;text-decoration:none"><span style="display:block;color:#d5ad69;font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase">Wind Energy</span><strong style="display:block;font-size:20px;margin-top:10px">Atimonan Windkraft</strong></a>
          <a href="/our-clients" style="display:block;padding:24px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#122633;color:#fff;text-decoration:none"><span style="display:block;color:#d5ad69;font-size:11px;font-weight:800;letter-spacing:.13em;text-transform:uppercase">Geodetic Surveying &amp; Engineering</span><strong style="display:block;font-size:20px;margin-top:10px">Philsurv Geodetic Engineer</strong></a>
        </div>
      </div>
    </section>
  `;
  if (!html.includes('id="neas-client-showcase"')) {
    const contactSection = html.indexOf('<section class="contact"');
    if (contactSection >= 0) html = html.slice(0, contactSection) + clientShowcase + html.slice(contactSection);
    else html = html.replace('<footer class="site-footer">', clientShowcase + '<footer class="site-footer">');
  }
  // social links in the side panel
  const map: [string, string][] = [["Facebook", social.facebook], ["LinkedIn", social.linkedin], ["YouTube", social.youtube], ["Instagram", social.instagram], ["TikTok", social.tiktok]];
  for (const [title, url] of map) html = replaceSideSocialAnchor(html, title, url);
  const googleBusinessUrl = safeHttpsUrl(social.googleBusiness);
  const xUrl = safeHttpsUrl(social.x);
  const extra = [
    googleBusinessUrl && `<a class="side-social" href="${esc(googleBusinessUrl)}" target="_blank" rel="noopener" title="Google Business"><b style="font:700 15px/1 Arial">G</b></a>`,
    xUrl && `<a class="side-social" href="${esc(xUrl)}" target="_blank" rel="noopener" title="X"><b style="font:700 15px/1 Arial">𝕏</b></a>`,
  ].filter(Boolean).join("");
  if (extra) html = appendAfterSideSocialAnchor(html, "TikTok", extra);
  // Give icon-only social links a crawlable text label and an accessible name.
  html = addAccessibleLabelsToSideSocialAnchors(html);
  const googleReviewUrl = safeHttpsUrl(social.googleReview);
  if (googleReviewUrl) html = html.replace('<div class="footer-bottom">', `<div style="text-align:center;margin:0 0 14px"><a href="${esc(googleReviewUrl)}" target="_blank" rel="noopener" style="display:inline-block;background:#fff;color:#0f172a;border:1px solid #e2e8f0;border-radius:999px;padding:8px 16px;font-weight:700;font-size:13px;text-decoration:none">⭐ Review us on Google</a></div><div class="footer-bottom">`);
  return html;
}
