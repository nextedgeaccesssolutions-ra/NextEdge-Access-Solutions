import { renderHomepage } from "./homepage";

export type NeasSectionRoute = "hero" | "about" | "services" | "partners" | "contact";

const PAGE_META: Record<NeasSectionRoute, { title: string; description: string }> = {
  hero: {
    title: "Home | NextEdge Access Solutions (NEAS)",
    description: "NextEdge Access Solutions provides professional rope access, renewable energy, offshore, onshore, industrial and height-safety solutions."
  },
  about: {
    title: "About NEAS | NextEdge Access Solutions",
    description: "Learn about NextEdge Access Solutions, our experience, safety-led approach and industrial access capabilities across the Philippines and Asia."
  },
  services: {
    title: "Rope Access & Industrial Services | NEAS",
    description: "Explore NEAS rope access, wind turbine, met mast, telecom, industrial maintenance, inspection, training and height-safety services."
  },
  partners: {
    title: "Partners | NextEdge Access Solutions",
    description: "Meet the technology, equipment, training and industry partners supporting NextEdge Access Solutions."
  },
  contact: {
    title: "Contact NEAS | Request a Project Quotation",
    description: "Contact NextEdge Access Solutions for rope access, renewable energy, offshore, industrial maintenance, training and equipment enquiries."
  }
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function replaceMeta(html: string, expression: RegExp, value: string): string {
  return html.replace(expression, (tag) => tag.replace(/content="[^"]*"/, `content="${escapeHtml(value)}"`));
}

/**
 * Serve the existing homepage at a clean section URL without duplicating its
 * source content or changing its homepage canonical. The browser scrolls to
 * the requested section after the static document has loaded.
 */
export async function renderSectionPage(section: NeasSectionRoute): Promise<string> {
  let html = await renderHomepage();
  const meta = PAGE_META[section];
  const titleStart = html.indexOf("<title>");
  const titleEnd = html.indexOf("</title>", titleStart);
  if (titleStart >= 0 && titleEnd >= 0) html = html.slice(0, titleStart) + `<title>${escapeHtml(meta.title)}</title>` + html.slice(titleEnd + "</title>".length);
  html = replaceMeta(html, /<meta name="description" content="[^"]*">/i, meta.description);
  html = replaceMeta(html, /<meta property="og:title" content="[^"]*">/i, meta.title);
  html = replaceMeta(html, /<meta property="og:description" content="[^"]*">/i, meta.description);
  html = replaceMeta(html, /<meta name="twitter:title" content="[^"]*">/i, meta.title);
  html = replaceMeta(html, /<meta name="twitter:description" content="[^"]*">/i, meta.description);

  const scrollScript = `<script id="neas-section-route-scroll">
    (function () {
      var sectionId = ${JSON.stringify(section)};
      function scrollToSection() {
        var target = document.getElementById(sectionId);
        if (!target) return;
        var header = document.querySelector(".site-header");
        var offset = header ? header.getBoundingClientRect().height + 12 : 76;
        window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset), behavior: "auto" });
      }
      if (document.readyState === "complete") {
        requestAnimationFrame(function () { requestAnimationFrame(scrollToSection); });
      } else {
        window.addEventListener("load", function () {
          requestAnimationFrame(function () { requestAnimationFrame(scrollToSection); });
        }, { once: true });
      }
    })();
  </script>`;
  return html.replace("</body>", scrollScript + String.fromCharCode(10) + "</body>");
}
