import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// reset.ts reaches for the database and bcrypt at import time; neither matters here.
vi.mock("./db", () => ({ sql: { begin: vi.fn() } }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn() } }));

import { publicOrigin } from "./origin";
import { redirectUri } from "./oauth";
import { originOf } from "./reset";

const req = (url = "https://www.nextedge-access-solutions.com/api/auth/oauth/google", headers: Record<string, string> = {}) =>
  new Request(url, { headers });

const saved = { site: process.env.SITE_URL, app: process.env.APP_URL };

beforeEach(() => {
  delete process.env.SITE_URL;
  delete process.env.APP_URL;
});
afterEach(() => {
  if (saved.site === undefined) delete process.env.SITE_URL;
  else process.env.SITE_URL = saved.site;
  if (saved.app === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = saved.app;
});

describe("publicOrigin", () => {
  it("prefers SITE_URL over APP_URL", () => {
    process.env.SITE_URL = "https://www.nextedge-access-solutions.com";
    process.env.APP_URL = "https://stale.example.com";
    expect(publicOrigin(req())).toBe("https://www.nextedge-access-solutions.com");
  });

  it("still honours APP_URL alone, so an existing deployment keeps working", () => {
    process.env.APP_URL = "https://www.nextedge-access-solutions.com";
    expect(publicOrigin(req())).toBe("https://www.nextedge-access-solutions.com");
  });

  it("drops a trailing slash and any path", () => {
    process.env.SITE_URL = "https://www.nextedge-access-solutions.com/store/";
    expect(publicOrigin(req())).toBe("https://www.nextedge-access-solutions.com");
  });

  it("ignores a value that is not an absolute URL", () => {
    process.env.SITE_URL = "www.nextedge-access-solutions.com";
    expect(publicOrigin(req("https://real-host.example.com/x"))).toBe("https://real-host.example.com");
  });

  it("rejects plain http for a public host but allows it for localhost", () => {
    process.env.SITE_URL = "http://www.nextedge-access-solutions.com";
    expect(publicOrigin(req("https://real-host.example.com/x"))).toBe("https://real-host.example.com");
    process.env.SITE_URL = "http://localhost:3000";
    expect(publicOrigin(req())).toBe("http://localhost:3000");
  });

  it("falls back to the forwarded host, not the internal one", () => {
    const r = req("https://internal.vercel.internal/api/auth/oauth/google", {
      "x-forwarded-host": "www.nextedge-access-solutions.com",
      "x-forwarded-proto": "https",
    });
    expect(publicOrigin(r)).toBe("https://www.nextedge-access-solutions.com");
  });

  it("takes only the first value when a proxy chain appends to the headers", () => {
    const r = req("https://internal.example.com/x", {
      "x-forwarded-host": "www.nextedge-access-solutions.com, inner.example.com",
      "x-forwarded-proto": "https,http",
    });
    expect(publicOrigin(r)).toBe("https://www.nextedge-access-solutions.com");
  });

  it("assumes https for a forwarded public host with no proto header", () => {
    const r = req("https://internal.example.com/x", { "x-forwarded-host": "www.nextedge-access-solutions.com" });
    expect(publicOrigin(r)).toBe("https://www.nextedge-access-solutions.com");
  });
});

describe("both OAuth flows resolve the same origin", () => {
  // The bug this guards: login read APP_URL and the social connectors read
  // SITE_URL, so with only one set the two redirect_uri values disagreed and
  // Google rejected whichever origin was not registered.
  it("agree when only SITE_URL is set", () => {
    process.env.SITE_URL = "https://www.nextedge-access-solutions.com";
    const r = req();
    expect(originOf(r)).toBe(publicOrigin(r));
    expect(redirectUri(r, "google")).toBe("https://www.nextedge-access-solutions.com/api/auth/oauth/google/callback");
  });

  it("agree when only APP_URL is set", () => {
    process.env.APP_URL = "https://www.nextedge-access-solutions.com";
    const r = req();
    expect(originOf(r)).toBe(publicOrigin(r));
    expect(redirectUri(r, "google")).toBe("https://www.nextedge-access-solutions.com/api/auth/oauth/google/callback");
  });

  it("agree when neither is set and the origin comes from the request", () => {
    const r = req("https://internal.example.com/x", { "x-forwarded-host": "www.nextedge-access-solutions.com" });
    expect(originOf(r)).toBe(publicOrigin(r));
    expect(redirectUri(r, "google")).toBe("https://www.nextedge-access-solutions.com/api/auth/oauth/google/callback");
  });
});
