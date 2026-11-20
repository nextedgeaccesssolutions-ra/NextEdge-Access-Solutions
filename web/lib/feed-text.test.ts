import { describe, expect, it } from "vitest";
import { stripFeedMarkup } from "./feed-text";

describe("stripFeedMarkup", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripFeedMarkup("<p>Wind <strong>energy</strong></p>  news")).toBe("Wind energy news");
  });

  it("keeps encoded angle brackets as text", () => {
    const payload = "&lt;script&gt;alert(1)&lt;/script&gt;";
    expect(stripFeedMarkup(payload)).toBe(payload);
  });

  it("extracts CDATA without decoding entities", () => {
    expect(stripFeedMarkup("<![CDATA[Wind &amp; solar]]>")).toBe("Wind &amp; solar");
  });
});