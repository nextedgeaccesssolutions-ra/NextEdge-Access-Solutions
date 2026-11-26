import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { ga4Config, ga4Summary, searchConsoleSummary, Ga4Error } from "./ga4";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const env = {
  GA4_PROPERTY_ID: "412345678",
  GA4_CLIENT_EMAIL: "neas-ga@neas-site.iam.gserviceaccount.com",
  GA4_PRIVATE_KEY: pem.replace(/\n/g, "\\n"),
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
const row = (dims: string[], mets: (string | number)[]) => ({
  dimensionValues: dims.map(value => ({ value })),
  metricValues: mets.map(v => ({ value: String(v) })),
});

describe("ga4Config", () => {
  it("accepts escaped private keys and a properties/ prefix", () => {
    const cfg = ga4Config({ ...env, GA4_PROPERTY_ID: "properties/412345678" });
    expect(cfg?.propertyId).toBe("412345678");
    expect(cfg?.privateKey).toContain("\n");
  });
  it("rejects missing or malformed settings", () => {
    expect(ga4Config({})).toBeNull();
    expect(ga4Config({ ...env, GA4_PROPERTY_ID: "G-ABC1234" })).toBeNull();
    expect(
      ga4Config({ ...env, GA4_CLIENT_EMAIL: "someone@gmail.com" })
    ).toBeNull();
  });
});

describe("Search Console diagnostics", () => {
  it("identifies when the Search Console API is disabled", async () => {
    const cfg = ga4Config({
      ...env,
      GA4_CLIENT_EMAIL: "gsc-diagnostics@neas-site.iam.gserviceaccount.com",
    })!;
    const fetcher = (async (url: string) => {
      if (new URL(url).host === "oauth2.googleapis.com")
        return json({ access_token: "gsc-token", expires_in: 3600 });
      return json(
        {
          error: {
            code: 403,
            status: "PERMISSION_DENIED",
            message: "Google Search Console API has not been used in project.",
            errors: [{ reason: "accessNotConfigured" }],
          },
        },
        403
      );
    }) as typeof fetch;
    await expect(
      searchConsoleSummary(
        cfg,
        "https://www.nextedge-access-solutions.com/",
        28,
        fetcher
      )
    ).rejects.toThrow(
      /accessNotConfigured.*Enable the Google Search Console API/i
    );
  });
});

describe("ga4Summary", () => {
  it("maps realtime and report rows into the dashboard shape", async () => {
    const cfg = ga4Config(env)!;
    const fetcher = (async (url: string, init?: RequestInit) => {
      if (new URL(url).host === "oauth2.googleapis.com")
        return json({ access_token: "tok", expires_in: 3600 });
      const body = JSON.parse(String(init?.body));
      if (url.endsWith(":runRealtimeReport")) {
        const dim = body.dimensions?.[0]?.name;
        if (!dim) return json({ rows: [row([], [3])] });
        return json({
          rows: [row([dim === "country" ? "Philippines" : "/"], [3])],
        });
      }
      const dim = body.dimensions?.[0]?.name;
      if (!dim)
        return json({ rows: [row([], [100, 60, 150, 400, 0.553, 12000, 5])] });
      if (dim === "date")
        return json({
          rows: [row(["20261124"], [10, 12]), row(["20261125"], [8, 9])],
        });
      return json({ rows: [row([`${dim}-a`], [50])] });
    }) as typeof fetch;
    const s = await ga4Summary(cfg, 28, fetcher);
    expect(s.realtime.activeUsers).toBe(3);
    expect(s.realtime.countries[0]).toEqual({ label: "Philippines", value: 3 });
    expect(s.comparison).toEqual({ users: 100, sessions: 60, pageviews: 150 });
    expect(s.totals).toMatchObject({
      users: 100,
      sessions: 150,
      pageviews: 400,
      engagementRate: 55.3,
      avgEngagementSec: 120,
      conversions: 5,
    });
    expect(s.daily[0]).toEqual({ date: "2026-11-24", users: 10, sessions: 12 });
    expect(s.topPages[0].label).toBe("pagePath-a");
  });

  it("explains a missing property permission", async () => {
    const cfg = ga4Config({
      ...env,
      GA4_CLIENT_EMAIL: "other@neas-site.iam.gserviceaccount.com",
    })!;
    const fetcher = (async (url: string) =>
      new URL(url).host === "oauth2.googleapis.com"
        ? json({ access_token: "tok" })
        : json({}, 403)) as typeof fetch;
    await expect(ga4Summary(cfg, 28, fetcher)).rejects.toBeInstanceOf(Ga4Error);
  });

  it("uses keyless workload identity federation when no private key is set", async () => {
    const aud =
      "//iam.googleapis.com/projects/123456789/locations/global/workloadIdentityPools/vercel/providers/vercel";
    const cfg = ga4Config({
      GA4_PROPERTY_ID: "412345678",
      GA4_CLIENT_EMAIL: "wif@neas-site.iam.gserviceaccount.com",
      GA4_WIF_AUDIENCE: aud,
    })!;
    expect(cfg.wifAudience).toBe(aud);
    const seen: string[] = [];
    const fetcher = (async (url: string, init?: RequestInit) => {
      const host = new URL(url).host;
      seen.push(host);
      if (host === "sts.googleapis.com") {
        const b = new URLSearchParams(String(init?.body));
        expect(b.get("subject_token")).toBe("vercel-oidc");
        expect(b.get("audience")).toBe(aud);
        return json({ access_token: "federated" });
      }
      if (host === "iamcredentials.googleapis.com")
        return json({
          accessToken: "sa-token",
          expireTime: new Date(Date.now() + 3600e3).toISOString(),
        });
      expect((init?.headers as Record<string, string>).authorization).toBe(
        "Bearer sa-token"
      );
      return json({ rows: [] });
    }) as typeof fetch;
    const s = await ga4Summary(cfg, 7, fetcher, "vercel-oidc");
    expect(s.period).toBe("Last 7 days");
    expect(seen.slice(0, 2)).toEqual([
      "sts.googleapis.com",
      "iamcredentials.googleapis.com",
    ]);
  });
});
