import type { ServicePage } from "./service-pages";

const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";

function safeImage(value: unknown): string {
  const image = clean(value, 500);
  if (/^\/(?:img\/[A-Za-z0-9_./-]+|api\/img\/[A-Za-z0-9_-]{1,40})$/.test(image)) return image;
  try {
    const url = new URL(image);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
  } catch { return ""; }
}

function cleanList(value: unknown, maxItems: number, maxText: number): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > maxItems) return null;
  const items = value.map(item => clean(item, maxText)).filter(Boolean);
  return items.length === value.length ? items : null;
}

export function sanitizeSolarServicePage(value: unknown): Partial<ServicePage> | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const title = clean(item.title, 100);
  const h1 = clean(item.h1, 120);
  const metaDescription = clean(item.metaDescription, 170);
  const eyebrow = clean(item.eyebrow, 100);
  const intro = clean(item.intro, 900);
  const image = safeImage(item.image);
  const scope = cleanList(item.scope, 15, 180);
  const industries = cleanList(item.industries, 12, 140);
  const experience = cleanList(item.experience, 8, 240);
  if (!title || !h1 || !metaDescription || !eyebrow || !intro || !image || !scope || !industries || !experience) return null;
  if (!Array.isArray(item.faqs) || item.faqs.length < 1 || item.faqs.length > 10) return null;
  const faqs = item.faqs.map(raw => {
    const faq = (raw ?? {}) as Record<string, unknown>;
    return { q: clean(faq.q, 180), a: clean(faq.a, 900) };
  });
  if (faqs.some(faq => !faq.q || !faq.a)) return null;
  return { title, h1, metaDescription, eyebrow, intro, image, scope, industries, experience, faqs, enquiryLabel: "Solar Energy & Industrial Services" };
}
