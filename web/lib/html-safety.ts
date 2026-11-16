const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtmlAttribute(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => HTML_ESCAPES[character]!);
}

/** Accept only absolute HTTPS destinations; reject script, data, blob and insecure schemes. */
export function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || /[\u0000-\u001f\u007f]/.test(candidate)) return null;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" || !parsed.hostname || parsed.username || parsed.password) return null;
    return parsed.href;
  } catch {
    return null;
  }
}

/** Allow same-origin absolute paths or HTTPS images only. */
export function safeImageUrl(value: unknown, fallback = "/img/logo.png"): string {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (!candidate) return fallback;
  if (candidate.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\")) return candidate;
  return safeHttpsUrl(candidate) ?? fallback;
}

/**
 * Updates or removes one known social anchor without a regular expression.
 * The linear string scan avoids backtracking on long or malformed homepage HTML.
 */
export function replaceSideSocialAnchor(html: string, title: string, url: unknown): string {
  const safeUrl = safeHttpsUrl(url);
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.indexOf('<a class="side-social"', cursor);
    if (start < 0) return html;

    const openEnd = html.indexOf(">", start);
    if (openEnd < 0) return html;

    const closeEnd = html.indexOf("</a>", openEnd + 1);
    if (closeEnd < 0) return html;

    const openTag = html.slice(start, openEnd + 1);
    if (openTag.includes(`title="${title}"`)) {
      if (!safeUrl) return html.slice(0, start) + html.slice(closeEnd + 4);

      const hrefMarker = 'href="';
      const hrefStart = openTag.indexOf(hrefMarker);
      if (hrefStart < 0) return html;

      const valueStart = hrefStart + hrefMarker.length;
      const valueEnd = openTag.indexOf('"', valueStart);
      if (valueEnd < 0) return html;

      const updatedOpenTag =
        openTag.slice(0, valueStart) +
        escapeHtmlAttribute(safeUrl) +
        openTag.slice(valueEnd);

      return html.slice(0, start) + updatedOpenTag + html.slice(openEnd + 1);
    }

    cursor = closeEnd + 4;
  }

  return html;
}

/** Insert markup after one known social anchor using a linear string scan. */
export function appendAfterSideSocialAnchor(html: string, title: string, addition: string): string {
  if (!addition) return html;
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.indexOf('<a class="side-social"', cursor);
    if (start < 0) return html;

    const openEnd = html.indexOf(">", start);
    if (openEnd < 0) return html;

    const closeEnd = html.indexOf("</a>", openEnd + 1);
    if (closeEnd < 0) return html;

    const openTag = html.slice(start, openEnd + 1);
    if (openTag.includes('title="' + title + '"')) {
      const end = closeEnd + 4;
      return html.slice(0, end) + addition + html.slice(end);
    }

    cursor = closeEnd + 4;
  }

  return html;
}

/** Add accessible names to known social anchors without regex backtracking. */
export function addAccessibleLabelsToSideSocialAnchors(html: string): string {
  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < html.length) {
    const start = html.indexOf('<a class="side-social"', cursor);
    if (start < 0) break;

    const openEnd = html.indexOf(">", start);
    if (openEnd < 0) break;

    const closeEnd = html.indexOf("</a>", openEnd + 1);
    if (closeEnd < 0) break;

    const openTag = html.slice(start, openEnd + 1);
    const titleStart = openTag.indexOf('title="');
    const titleEnd = titleStart < 0 ? -1 : openTag.indexOf('"', titleStart + 7);

    if (titleStart < 0 || titleEnd < 0 || openTag.includes("aria-label=")) {
      chunks.push(html.slice(cursor, closeEnd + 4));
      cursor = closeEnd + 4;
      continue;
    }

    const label = openTag.slice(titleStart + 7, titleEnd);
    if (!label) {
      chunks.push(html.slice(cursor, closeEnd + 4));
      cursor = closeEnd + 4;
      continue;
    }

    const namedOpen = openTag.slice(0, -1) + ' aria-label="' + escapeHtmlAttribute(label) + '">';
    const hiddenLabel =
      '<span style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">' +
      escapeHtmlAttribute(label) +
      "</span>";

    chunks.push(
      html.slice(cursor, start),
      namedOpen,
      html.slice(openEnd + 1, closeEnd),
      hiddenLabel,
      html.slice(closeEnd, closeEnd + 4),
    );
    cursor = closeEnd + 4;
  }

  chunks.push(html.slice(cursor));
  return chunks.join("");
}
