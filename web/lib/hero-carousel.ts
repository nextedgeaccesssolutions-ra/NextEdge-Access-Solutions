export type HeroCarouselSlide = {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  ctaLabel: string;
  ctaUrl: string;
  enabled: boolean;
};

export const DEFAULT_HERO_SLIDES: HeroCarouselSlide[] = [
  { id: "wind-turbines", label: "Wind Energy", title: "Height is not a limit. It is our expertise.", description: "NextEdge Access Solutions delivers safe, efficient access and specialist field support for industrial, commercial and renewable energy projects.", image: "/img/hero-wind.webp", alt: "Wind turbines supported by specialist rope access services", ctaLabel: "Our Services", ctaUrl: "/services", enabled: true },
  { id: "offshore-oil-rigs", label: "Offshore & Onshore", title: "Specialist access for demanding environments.", description: "Rope access, inspection and maintenance support for offshore, onshore and industrial assets.", image: "/img/hero-oilrig.webp", alt: "Offshore industrial platform", ctaLabel: "Request a Quote", ctaUrl: "/contact", enabled: true },
  { id: "telecom-towers", label: "Telecom Infrastructure", title: "Reliable teams. Hard-to-reach solutions.", description: "Tower access, installation and maintenance support for telecom and infrastructure projects.", image: "/img/hero-telecom.webp", alt: "Telecommunications tower infrastructure", ctaLabel: "Explore Services", ctaUrl: "/services", enabled: true },
  { id: "met-mast-towers", label: "Wind Measurement", title: "Supporting renewable energy development.", description: "Met mast, Lidar and specialist work-at-height support for wind measurement projects.", image: "/img/hero-metmast.webp", alt: "Meteorological mast used for wind measurement", ctaLabel: "Renewable Services", ctaUrl: "/services/renewable-energy", enabled: true },
  { id: "bridges", label: "Structural Access", title: "Access expertise for critical infrastructure.", description: "Inspection, maintenance and protective coating support for complex structures.", image: "/img/hero-bridge.webp", alt: "Bridge structure requiring specialist inspection access", ctaLabel: "Discuss a Project", ctaUrl: "/contact", enabled: true },
  { id: "power-plants", label: "Power & Industrial", title: "Keeping industrial assets accessible.", description: "Industrial inspection, maintenance and rope access support for power and process facilities.", image: "/img/hero-power.webp", alt: "Industrial power generation facility", ctaLabel: "Get a Quotation", ctaUrl: "/contact", enabled: true },
];

const text = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

function safeImage(value: unknown): string {
  const url = text(value, 500);
  if (/^\/(?:img\/[A-Za-z0-9_./-]+|api\/img\/[A-Za-z0-9_-]{1,40})$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.toString() : "";
  } catch { return ""; }
}

function safeDestination(value: unknown): string {
  const url = text(value, 500);
  if (/^\/(?!\/)[A-Za-z0-9_/?#=&.%+-]*$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.toString() : "";
  } catch { return ""; }
}

export function sanitizeHeroSlides(value: unknown): HeroCarouselSlide[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) return null;
  const slides: HeroCarouselSlide[] = [];
  const ids = new Set<string>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") return null;
    const item = raw as Record<string, unknown>;
    const id = text(item.id, 40).replace(/[^A-Za-z0-9_-]/g, "");
    const label = text(item.label, 60);
    const title = text(item.title, 120);
    const description = text(item.description, 260);
    const image = safeImage(item.image);
    const alt = text(item.alt, 180);
    const ctaLabel = text(item.ctaLabel, 40);
    const ctaUrl = safeDestination(item.ctaUrl);
    if (!id || ids.has(id) || !label || !title || !description || !image || !alt || !ctaLabel || !ctaUrl || typeof item.enabled !== "boolean") return null;
    ids.add(id);
    slides.push({ id, label, title, description, image, alt, ctaLabel, ctaUrl, enabled: item.enabled });
  }
  return slides.some(slide => slide.enabled) ? slides : null;
}

/**
 * Preserve the existing Website Photos > Homepage hero image when migrating
 * from the legacy single-image setting. An explicitly saved carousel always
 * takes precedence; invalid legacy URLs fall back to the built-in NEAS slides.
 */
export function getHeroSlides(value: unknown, legacyHeroImage?: unknown): HeroCarouselSlide[] {
  const saved = sanitizeHeroSlides(value);
  if (saved) return saved;
  if (typeof legacyHeroImage === "string" && legacyHeroImage.trim()) {
    const migrated = sanitizeHeroSlides([
      { ...DEFAULT_HERO_SLIDES[0], image: legacyHeroImage },
      ...DEFAULT_HERO_SLIDES.slice(1),
    ]);
    if (migrated) return migrated;
  }
  return DEFAULT_HERO_SLIDES;
}
