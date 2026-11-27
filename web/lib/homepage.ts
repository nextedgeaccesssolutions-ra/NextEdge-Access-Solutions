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
    `<div class="hero-slide${index === 0 ? " on" : ""}" data-label="${esc(slide.label)}" data-title="${esc(slide.title)}" data-description="${esc(slide.description)}" data-cta-label="${esc(slide.ctaLabel)}" data-cta-url="${esc(slide.ctaUrl)}"><img class="hero-slide-image" src="${esc(slide.image)}" alt="${esc(slide.alt)}" loading="${index === 0 ? "eager" : "lazy"}" decoding="async"></div>`
  ).join("");
  html = html.replace(/<div class="hero-bg"><div class="hero-slides">[\s\S]*?<\/div><\/div><div class="hero-carousel-controls"/, `<div class="hero-bg"><div class="hero-slides">${heroMarkup}</div></div><div class="hero-carousel-controls"`);
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
  html = html.replace("</head>", head + "\n<style id=\"neas-homepage-refresh\">\n
:root{--bg:#071D29!important;--bg2:#0b2735!important;--bg3:#123646!important;--surface:#163b4c!important;--border:rgba(235,192,126,.14)!important;--border2:rgba(235,192,126,.25)!important;--fg:#f3f7f8!important;--fg2:#c1d0d6!important;--fg3:#91a7b1!important;--accent:#CA9332!important;--accent2:#EBC07E!important}
body{background:#071D29;color:#f3f7f8}
.topbar{background:#CA9332;color:#071D29;font-weight:800;letter-spacing:.035em}
.site-header{background:rgba(7,29,41,.94)!important;border-bottom:1px solid rgba(235,192,126,.18)!important}
.nav-logo-text span{color:#EBC07E}
.nav-links a{color:#d2dfe3}
.nav-links a:hover,.nav-links a:focus-visible{color:#EBC07E;background:rgba(235,192,126,.09)}
.nav-cta,.mm-cta{background:#CA9332!important;color:#071D29!important;font-weight:800}
.hero{min-height:min(900px,100svh);min-height:max(720px,92svh);padding-top:64px}
.hero-bg{filter:brightness(.78) saturate(.9)}
.hero-bg::after{background:linear-gradient(90deg,rgba(7,29,41,.92) 0%,rgba(7,29,41,.68) 52%,rgba(7,29,41,.18) 100%),linear-gradient(0deg,rgba(7,29,41,.86),transparent 58%)!important}
.hero-content{max-width:760px!important;padding:clamp(26px,4vw,48px)!important;margin-block:32px;background:linear-gradient(135deg,rgba(7,29,41,.88),rgba(7,29,41,.68))!important;border:1px solid rgba(235,192,126,.28)!important;border-radius:18px!important;box-shadow:0 28px 80px rgba(0,0,0,.3),inset 0 1px rgba(255,255,255,.08)!important;-webkit-backdrop-filter:blur(14px) saturate(1.1)!important;backdrop-filter:blur(14px) saturate(1.1)!important}
.hero-content::before{display:none}
.hero-eyebrow,.section-eyebrow{color:#EBC07E!important}
.hero-title{color:#fff!important;font-size:clamp(38px,5.4vw,68px);line-height:1.04;letter-spacing:-.035em}
.hero-title em{color:#EBC07E!important}
.hero-sub{color:#d5e0e4!important;font-size:clamp(15px,1.6vw,18px);max-width:620px}
.btn-primary,.form-submit,.modal-quote{background:#CA9332!important;color:#071D29!important;font-weight:800}
.btn-primary:hover,.form-submit:hover,.modal-quote:hover{background:#EBC07E!important}
.hero .btn-outline{background:rgba(255,255,255,.06)!important;color:#fff!important;border:1px solid rgba(255,255,255,.35)!important}
.hero .btn-whatsapp{background:#123f43;color:#e6fff7;border:1px solid rgba(120,220,190,.42)}
.hero .btn-whatsapp:hover{background:#18534f}
.hero-stats-inner{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));overflow:hidden;border:1px solid rgba(235,192,126,.2);border-radius:14px 14px 0 0}
.hero-stat{background:rgba(7,29,41,.88)!important;border-top:1px solid rgba(235,192,126,.22)!important;border-right:1px solid rgba(235,192,126,.13)!important}
.stat-num{color:#EBC07E!important}
.stat-lbl{color:#c5d4d9!important}
.ticker-wrap{background:#0b2735;border-color:rgba(235,192,126,.13)}
.ticker-item{color:#c8d6db}
.ticker-item::before{color:#CA9332}
section{scroll-margin-top:84px}
.section-title{color:#f7fafb}
.section-lead{color:#bdcdd3}
.about,.team,.gallery{background:#0b2735}
.services,.partners,.contact{background:#071D29}
.about-photo{border:1px solid rgba(235,192,126,.22);box-shadow:0 24px 64px rgba(0,0,0,.24)}
.value-icon{background:rgba(202,147,50,.12);border-color:rgba(202,147,50,.28)}
.value-text p,.value-text strong{color:#d9e3e7}
.service-card,.partner-card,.team-card{background:#0b2735;border-color:rgba(235,192,126,.16)}
.service-card:hover,.partner-card:hover{border-color:rgba(235,192,126,.55);box-shadow:0 18px 48px rgba(0,0,0,.24)}
.service-tag,.service-more,.partner-abbr{color:#EBC07E}
.service-title,.partner-name,.team-name{color:#f7fafb}
.service-desc,.partner-type,.team-role{color:#b9cbd2}
.delivery-process{padding:clamp(64px,8vw,92px) 0;background:linear-gradient(135deg,#102f40,#071D29);border-top:1px solid rgba(235,192,126,.12);border-bottom:1px solid rgba(235,192,126,.12)}
.delivery-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:36px}
.delivery-card{padding:26px;border:1px solid rgba(235,192,126,.2);border-radius:14px;background:rgba(255,255,255,.035)}
.delivery-card>span{display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:9px;background:rgba(202,147,50,.15);color:#EBC07E;font-weight:900;font-size:12px}
.delivery-card h3{margin:18px 0 9px;color:#fff;font-size:19px}
.delivery-card p{color:#bfd0d7;font-size:14px;line-height:1.75}
.delivery-cta{display:flex;justify-content:space-between;align-items:center;gap:22px;margin-top:26px;padding:22px 24px;border:1px solid rgba(235,192,126,.22);border-radius:12px;background:rgba(7,29,41,.65)}
.delivery-cta strong{display:block;color:#fff;font-size:16px}
.delivery-cta p{margin-top:4px;color:#bfd0d7;font-size:13px}
.clients-preview{background:#0b2735!important}
.clients-preview a{border-color:rgba(235,192,126,.2)!important}
.contact-form,.contact-form form{min-width:0}
.form-field input,.form-field textarea,.form-field select{background:#0b2735;border-color:rgba(235,192,126,.2);color:#f3f7f8}
.form-field input:focus,.form-field textarea:focus,.form-field select:focus{border-color:#EBC07E;box-shadow:0 0 0 3px rgba(235,192,126,.12)}
.contact-val a{color:#EBC07E}
.site-footer{background:#061923;border-top:1px solid rgba(235,192,126,.18)}
.footer-col ul li a:hover{color:#EBC07E}
.footer-emergency{background:rgba(202,147,50,.08);border-color:rgba(202,147,50,.25)}
.footer-emergency p{color:#EBC07E}
.hero-carousel-controls>button{background:rgba(7,29,41,.88);border-color:rgba(235,192,126,.6)}
.hero-carousel-dots button[aria-current=true]{background:#EBC07E}
.nav-toggle span{background:#EBC07E}
a:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid #EBC07E;outline-offset:3px}
@media(max-width:760px){.hero{min-height:820px;min-height:92svh;padding-bottom:150px}.hero-content{margin-top:46px;padding:26px 22px!important}.hero-stats{bottom:0}.hero-stats-inner{grid-template-columns:repeat(2,minmax(0,1fr));border-radius:12px 12px 0 0}.hero-stat{padding:14px 10px}.stat-num{font-size:23px}.stat-lbl{font-size:9px}.hero-carousel-controls{bottom:170px;right:14px}.delivery-grid{grid-template-columns:1fr}.delivery-cta{align-items:flex-start;flex-direction:column}.delivery-cta .btn{width:100%;justify-content:center}.nav-cta{display:none}}
@media(max-width:600px){.hero{min-height:850px;min-height:100svh}.hero-content{margin-block:24px}.hero-title{font-size:clamp(36px,10vw,48px)}.hero-actions{gap:9px}.hero-actions .btn{width:100%;justify-content:center}.hero-carousel-controls{bottom:170px}.about-grid{gap:30px}.services-grid{gap:14px}.service-body{padding:19px}.partners-grid{gap:10px}.partner-card{padding:15px 10px}.contact-grid{gap:32px}.footer-bottom{gap:12px;align-items:flex-start;flex-direction:column}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.ticker-track{animation:none}.reveal{opacity:1;transform:none;transition:none}.service-card,.partner-card,.gallery-item img{transition:none}}
\n</style>\n</head>");
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
  // The homepage already contains its canonical client preview in home.html.
  // Do not inject a second copy; keep the managed client records as the single source.
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
