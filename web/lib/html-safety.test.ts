import { describe, expect, it } from "vitest";
import { addAccessibleLabelsToSideSocialAnchors, appendAfterSideSocialAnchor, replaceSideSocialAnchor, safeHttpsUrl, safeImageUrl } from "./html-safety";

describe("safeHttpsUrl", () => {
  it("accepts HTTPS URLs and normalizes them", () => {
    expect(safeHttpsUrl(" https://example.com/path ")).toBe("https://example.com/path");
  });

  it("rejects executable, insecure, and credential-bearing URLs", () => {
    expect(safeHttpsUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpsUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpsUrl("http://example.com")).toBeNull();
    expect(safeHttpsUrl("https://user:pass@example.com")).toBeNull();
    expect(safeHttpsUrl("https://example.com\njavascript:alert(1)")).toBeNull();
  });
});

describe("safeImageUrl", () => {
  it("allows same-origin paths and HTTPS images", () => {
    expect(safeImageUrl("/img/logo.png")).toBe("/img/logo.png");
    expect(safeImageUrl("https://cdn.example.com/logo.png")).toBe("https://cdn.example.com/logo.png");
  });

  it("rejects protocol-relative and executable URLs", () => {
    expect(safeImageUrl("//evil.example/logo.png", "")).toBe("");
    expect(safeImageUrl("javascript:alert(1)", "/img/fallback.png")).toBe("/img/fallback.png");
    expect(safeImageUrl("data:image/svg+xml,<svg onload=alert(1)>", "")).toBe("");
  });
});

describe("replaceSideSocialAnchor", () => {
  const html =
    '<a class="side-social" href="#" target="_blank" title="Facebook">f</a>' +
    '<a class="side-social" href="#" target="_blank" title="LinkedIn">in</a>';

  it("updates only the matching anchor and escapes its attribute value", () => {
    const result = replaceSideSocialAnchor(html, "Facebook", "https://example.com/?a=1&b=2");
    expect(result).toContain('href="https://example.com/?a=1&amp;b=2"');
    expect(result).toContain('title="LinkedIn"');
    expect(result).toContain('href="#" target="_blank" title="LinkedIn"');
  });

  it("removes anchors for blank or unsafe URLs", () => {
    expect(replaceSideSocialAnchor(html, "Facebook", "")).not.toContain('title="Facebook"');
    expect(replaceSideSocialAnchor(html, "Facebook", "javascript:alert(1)")).not.toContain('title="Facebook"');
  });

  it("scans long repeated markup without regular-expression backtracking", () => {
    const repeated = Array.from({ length: 3000 }, (_, index) =>
      `<a class="side-social" href="#" title="Other${index}">x</a>`,
    ).join("");
    expect(replaceSideSocialAnchor(repeated, "Facebook", "https://example.com")).toBe(repeated);
  });
});

describe("appendAfterSideSocialAnchor", () => {
  it("inserts additional links immediately after the requested social anchor", () => {
    const html =
      '<a class="side-social" href="#" title="Facebook">f</a>' +
      '<a class="side-social" href="#" title="TikTok">t</a>' +
      '<a class="side-social" href="#" title="LinkedIn">in</a>';
    const extra = '<a class="side-social" href="https://example.com" title="X">𝕏</a>';
    expect(appendAfterSideSocialAnchor(html, "TikTok", extra)).toBe(
      '<a class="side-social" href="#" title="Facebook">f</a>' +
      '<a class="side-social" href="#" title="TikTok">t</a>' +
      extra +
      '<a class="side-social" href="#" title="LinkedIn">in</a>',
    );
  });

  it("leaves markup unchanged when the target anchor is missing", () => {
    const html = '<a class="side-social" href="#" title="Facebook">f</a>';
    expect(appendAfterSideSocialAnchor(html, "TikTok", "<span>extra</span>")).toBe(html);
  });
});

describe("addAccessibleLabelsToSideSocialAnchors", () => {
  it("adds an escaped accessible name and visually hidden label from each title", () => {
    const html = '<a class="side-social" href="#" title="Facebook">f</a>';
    const result = addAccessibleLabelsToSideSocialAnchors(html);
    expect(result).toContain('title="Facebook" aria-label="Facebook"');
    expect(result).toContain(">Facebook</span>");
  });

  it("preserves existing aria-label values and unrelated anchors", () => {
    const html =
      '<a class="side-social" href="#" title="Facebook" aria-label="NEAS Facebook">f</a>' +
      '<a class="ordinary-link" href="/about">About</a>';
    expect(addAccessibleLabelsToSideSocialAnchors(html)).toBe(html);
  });

  it("handles long repeated social markup with a deterministic scan", () => {
    const repeated = Array.from({ length: 3000 }, (_, index) =>
      '<a class="side-social" href="#" title="Social' + index + '">x</a>',
    ).join("");
    const result = addAccessibleLabelsToSideSocialAnchors(repeated);
    expect(result).toContain('aria-label="Social2999"');
    expect(appendAfterSideSocialAnchor(repeated, "TikTok", "<span>extra</span>")).toBe(repeated);
  });
});
