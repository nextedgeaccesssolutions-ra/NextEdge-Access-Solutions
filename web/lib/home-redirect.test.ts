import { describe, expect, it } from "vitest";
import { homeRedirectUrl } from "./home-redirect";

describe("homeRedirectUrl", () => {
  it("redirects the exact legacy path to the site root", () => {
    expect(homeRedirectUrl("https://example.com/home.html")?.toString())
      .toBe("https://example.com/");
  });

  it("preserves the original host and query string", () => {
    expect(homeRedirectUrl("https://www.example.com/home.html?campaign=spring&page=2")?.toString())
      .toBe("https://www.example.com/?campaign=spring&page=2");
  });

  it("does not redirect the root or unrelated paths", () => {
    expect(homeRedirectUrl("https://example.com/")).toBeNull();
    expect(homeRedirectUrl("https://example.com/about")).toBeNull();
  });

  it("does not redirect nested or similarly named paths", () => {
    expect(homeRedirectUrl("https://example.com/archive/home.html")).toBeNull();
    expect(homeRedirectUrl("https://example.com/home.html/extra")).toBeNull();
    expect(homeRedirectUrl("https://example.com/home.html-old")).toBeNull();
  });
});
