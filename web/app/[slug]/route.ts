import { renderHomepage } from "@/lib/homepage";

const publicPages = {
  home: {
    section: "hero",
    title: "NextEdge Access Solutions | Rope Access Philippines",
    description: "NextEdge Access Solutions provides rope access, work-at-height, inspection, maintenance, training, and PPE solutions across the Philippines.",
    canonicalPath: "/",
  },
  about: {
    section: "about",
    title: "About NEAS | NextEdge Access Solutions",
    description: "Learn about NextEdge Access Solutions and our approach to safe, reliable rope access and industrial services.",
    canonicalPath: "/about",
  },
  services: {
    section: "services",
    title: "Rope Access & Industrial Services | NEAS",
    description: "Explore NEAS rope access, renewable energy, wind turbine, offshore, onshore, telecom, and industrial service capabilities.",
    canonicalPath: "/services",
  },
  partners: {
    section: "partners",
    title: "NEAS Partners | NextEdge Access Solutions",
    description: "Learn about the partner network and industry collaborations supporting NextEdge Access Solutions.",
    canonicalPath: "/partners",
  },
  contact: {
    section: "contact",
    title: "Contact NEAS | NextEdge Access Solutions",
    description: "Contact NEAS to discuss rope access, wind turbine, renewable energy, industrial maintenance, training, and project enquiries.",
    canonicalPath: "/contact",
  },
} as const;

export const dynamic = "force-dynamic";

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const page = publicPages[slug as keyof typeof publicPages];

  if (!page) return new Response("Not Found", { status: 404 });

  let html = await renderHomepage();
  const currentCanonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1];
  let origin = "https://www.nextedge-access-solutions.com";
  try {
    if (currentCanonical) origin = new URL(currentCanonical).origin;
  } catch {
    // Keep the verified NEAS website origin if a stored canonical URL is invalid.
  }

  const canonical = `${origin}${page.canonicalPath}`;
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const canonicalTag = `<link rel="canonical" href="${canonical}">`;
  const alternateTag = `<link rel="alternate" hreflang="en-PH" href="${canonical}">`;

  html = html
    .replace(/<title>[\\s\\S]*?<\\/title>/i, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/i, `<meta name="description" content="${description}">`)
    .replace(/<link rel="canonical" href="[^"]*">/i, canonicalTag)
    .replace(/<link rel="alternate" hreflang="en-PH" href="[^"]*">/i, alternateTag)
    .replace(/<meta property="og:title" content="[^"]*">/i, `<meta property="og:title" content="${title}">`)
    .replace(/<meta property="og:description" content="[^"]*">/i, `<meta property="og:description" content="${description}">`)
    .replace(/<meta property="og:url" content="[^"]*">/i, `<meta property="og:url" content="${canonical}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/i, `<meta name="twitter:title" content="${title}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/i, `<meta name="twitter:description" content="${description}">`);

  const section = JSON.stringify(page.section);
  const scrollScript = `<script>(function(){var id=${section};function scrollToSection(){var el=document.getElementById(id);if(!el)return;var top=el.getBoundingClientRect().top+window.scrollY-76;window.scrollTo({top:Math.max(0,top),behavior:"auto"});}if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",scrollToSection,{once:true});}else{requestAnimationFrame(scrollToSection);}})();</script>`;
  html = html.replace("</body>", `${scrollScript}</body>`);

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
