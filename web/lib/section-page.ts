import { renderHomepage } from "./homepage";

export type NeasSectionRoute = "hero" | "about" | "services" | "partners" | "contact";

/**
 * Serve the existing homepage at a clean section URL without duplicating its
 * content or changing its homepage canonical. The browser scrolls to the
 * requested section after the static document has loaded.
 */
export async function renderSectionPage(section: NeasSectionRoute): Promise<string> {
  const html = await renderHomepage();
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
  return html.replace("</body>", scrollScript + "\\n</body>");
}
