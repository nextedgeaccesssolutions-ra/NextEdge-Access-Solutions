import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { ga4Config, ga4Summary, Ga4Error } from "./ga4";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const env = { GA4_PROPERTY_ID: "412345678", GA4_CLIENT_EMAIL: "neas-ga@neas-site.iam.gserviceaccount.com", GA4_PRIVATE_KEY: pem.replace(/\n/g, "\\n") };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const row = (dims: string[], mets: (string | number)[]) => ({ dimensionValues: dims.map((value) => ({ value })), metricValues: mets.map((v) => ({ value: String(v) })) });

describe("ga4Config", () => {
  it("accepts escaped private keys and a properties/ prefix", () => {
    const cfg = ga4Config({ ...env, GA4_PROPERTY_ID: "properties/412345678" });
    expect(cfg?.propertyId).toBe("412345678");
    expect(cfg?.privateKey).toContain("\n");
  });
  it("rejects missing or malformed settings", () => {
    expect(ga4Config({})).toBeNull();
    expect(ga4Config({ ...env, GA4_PROPERTY_ID: "G-ABC1234" })).toBeNull();
    expect(ga4Config({ ...env, GA4_CLIENT_EMAIL: "someone@gmail.com" })).toBeNull();
  });
});

describe("ga4Summary", () => {
  it("maps realtime and report rows into the dashboard shape", async () => {
    const cfg = ga4Config(env)!;
    const fetcher = (async (url: string, init?: RequestInit) => {
      if (url.includes("oauth2.googleapis.com")) return json({ access_token: "tok", expires_in: 3600 });
      const body = JSON.parse(String(init?.body));
      if (url.endsWith(":runRealtimeReport")) {
        const dim = body.dimensions?.[0]?.name;
        if (!dim) return json({ rows: [row([], [3])] });
        return json({ rows: [row([dim === "country" ? "Philippines" : "/"], [3])] });
      }
      const dim = body.dimensions?.[0]?.name;
      if (!dim) return json({ rows: [row([], [100, 60, 150, 400, 0.553, 12000, 5])] });
      if (dim === "date") return json({ rows: [row(["20261124"], [10, 12]), row(["20261125"], [8, 9])] });
      return json({ rows: [row([`${dim}-a`], [50])] });
    }) as typeof fetch;
    const s = await ga4Summary(cfg, 28, fetcher);
    expect(s.realtime.activeUsers).toBe(3);
    expect(s.realtime.countries[0]).toEqual({ label: "Philippines", value: 3 });
    expect(s.totals).toMatchObject({ users: 100, sessions: 150, pageviews: 400, engagementRate: 55.3, avgEngagementSec: 120, conversions: 5 });
    expect(s.daily[0]).toEqual({ date: "2026-11-24", users: 10, sessions: 12 });
    expect(s.topPages[0].label).toBe("pagePath-a");
  });

  it("explains a missing property permission", async () => {
    const cfg = ga4Config({ ...env, GA4_CLIENT_EMAIL: "other@neas-site.iam.gserviceaccount.com" })!;
    const fetcher = (async (url: string) => url.includes("oauth2") ? json({ access_token: "tok" }) : json({}, 403)) as typeof fetch;
    await expect(ga4Summary(cfg, 28, fetcher)).rejects.toBeInstanceOf(Ga4Error);
  });
});
