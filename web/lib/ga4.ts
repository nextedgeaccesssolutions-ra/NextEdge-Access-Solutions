/** Google Analytics 4 Data API client (read-only).
 *
 *  Authenticates as a Google service account that has "Viewer" access to the GA4
 *  property. Credentials stay on the server and are read from:
 *    GA4_PROPERTY_ID   numeric property ID, e.g. 412345678
 *    GA4_CLIENT_EMAIL  service account email
 *    GA4_PRIVATE_KEY   service account private key (PEM; "\n" escapes are accepted)
 *
 *  Free of `next/*` imports so it can be unit tested on its own.
 */
import { SignJWT, importPKCS8 } from "jose";

/** Either a service-account private key, or keyless Workload Identity Federation
 *  (Vercel OIDC token exchanged at Google STS, then service-account impersonation). */
export type Ga4Config = {
  propertyId: string;
  clientEmail: string;
  privateKey?: string;
  wifAudience?: string;
};

export function ga4Config(
  env: Record<string, string | undefined> = process.env
): Ga4Config | null {
  const propertyId = (env.GA4_PROPERTY_ID || "")
    .trim()
    .replace(/^properties\//, "");
  const clientEmail = (env.GA4_CLIENT_EMAIL || "").trim();
  const privateKey = (env.GA4_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!/^\d{5,15}$/.test(propertyId)) return null;
  if (!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(clientEmail))
    return null;
  const wifAudience = (env.GA4_WIF_AUDIENCE || "").trim();
  const hasKey = privateKey.includes("BEGIN PRIVATE KEY");
  const hasWif =
    /^\/\/iam\.googleapis\.com\/projects\/\d+\/locations\/global\/workloadIdentityPools\/[a-z0-9-]+\/providers\/[a-z0-9-]+$/.test(
      wifAudience
    );
  if (!hasKey && !hasWif) return null;
  return hasKey
    ? { propertyId, clientEmail, privateKey }
    : { propertyId, clientEmail, wifAudience };
}

let cachedToken: { key: string; token: string; expires: number } | null = null;

async function federatedToken(
  cfg: Ga4Config,
  oidcToken: string,
  fetcher: typeof fetch
): Promise<{ token: string; expires: number }> {
  const sts = await fetcher("https://sts.googleapis.com/v1/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience: cfg.wifAudience ?? "",
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      subject_token: oidcToken,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const s = (await sts.json().catch(() => ({}))) as { access_token?: string };
  if (!sts.ok || !s.access_token)
    throw new Ga4Error(
      "auth",
      "Google did not accept the Vercel identity. Check the workload identity pool and provider."
    );
  const res = await fetcher(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${encodeURIComponent(cfg.clientEmail)}:generateAccessToken`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${s.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        scope: ["https://www.googleapis.com/auth/analytics.readonly"],
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  );
  const j = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    expireTime?: string;
  };
  if (!res.ok || !j.accessToken)
    throw new Ga4Error(
      "auth",
      "Vercel may not impersonate the GA4 service account. Grant it Workload Identity User."
    );
  const exp = Date.parse(j.expireTime ?? "");
  return {
    token: j.accessToken,
    expires: Number.isFinite(exp)
      ? Math.floor(exp / 1000)
      : Math.floor(Date.now() / 1000) + 3000,
  };
}

async function accessToken(
  cfg: Ga4Config,
  fetcher: typeof fetch,
  oidcToken?: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (
    cachedToken &&
    cachedToken.key === cfg.clientEmail &&
    cachedToken.expires - 60 > now
  )
    return cachedToken.token;
  if (!cfg.privateKey) {
    if (!oidcToken)
      throw new Ga4Error(
        "auth",
        "No Vercel OIDC token available. Enable OIDC Federation in the Vercel project settings."
      );
    const t = await federatedToken(cfg, oidcToken, fetcher);
    cachedToken = { key: cfg.clientEmail, ...t };
    return t.token;
  }
  const key = await importPKCS8(cfg.privateKey, "RS256");
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/analytics.readonly",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(cfg.clientEmail)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
  const res = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  const j = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!res.ok || !j.access_token)
    throw new Ga4Error(
      "auth",
      "Google rejected the service account credentials."
    );
  cachedToken = {
    key: cfg.clientEmail,
    token: j.access_token,
    expires: now + (j.expires_in ?? 3600),
  };
  return j.access_token;
}

export class Ga4Error extends Error {
  constructor(
    public kind: "auth" | "permission" | "api",
    message: string
  ) {
    super(message);
  }
}

type Row = {
  dimensionValues?: { value?: string }[];
  metricValues?: { value?: string }[];
};
type Report = { rows?: Row[]; totals?: Row[] };

async function call(
  cfg: Ga4Config,
  token: string,
  method: "runReport" | "runRealtimeReport",
  body: unknown,
  fetcher: typeof fetch
): Promise<Report> {
  const res = await fetcher(
    `https://analyticsdata.googleapis.com/v1beta/properties/${cfg.propertyId}:${method}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );
  if (res.status === 403)
    throw new Ga4Error(
      "permission",
      "The service account has no access to this GA4 property. Add it as a Viewer in GA4 → Admin → Property access management."
    );
  if (res.status === 404)
    throw new Ga4Error("api", "GA4 property not found. Check GA4_PROPERTY_ID.");
  if (!res.ok)
    throw new Ga4Error("api", `Google Analytics returned HTTP ${res.status}.`);
  return (await res.json()) as Report;
}

const num = (v?: string) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dims = (r: Report, limit = 10) =>
  (r.rows ?? []).slice(0, limit).map(row => ({
    label: row.dimensionValues?.[0]?.value || "(not set)",
    value: num(row.metricValues?.[0]?.value),
  }));

export type Ga4Summary = {
  realtime: {
    activeUsers: number;
    pages: { label: string; value: number }[];
    countries: { label: string; value: number }[];
  };
  period: string;
  totals: {
    users: number;
    newUsers: number;
    sessions: number;
    pageviews: number;
    engagementRate: number;
    avgEngagementSec: number;
    conversions: number;
  };
  daily: { date: string; users: number; sessions: number }[];
  topPages: { label: string; value: number }[];
  sources: { label: string; value: number }[];
  countries: { label: string; value: number }[];
  devices: { label: string; value: number }[];
};

export async function ga4Summary(
  cfg: Ga4Config,
  days = 28,
  fetcher: typeof fetch = fetch,
  oidcToken?: string
): Promise<Ga4Summary> {
  const token = await accessToken(cfg, fetcher, oidcToken);
  const range = [{ startDate: `${days}daysAgo`, endDate: "today" }];
  const top = (dimension: string, metric = "sessions", limit = 10) =>
    call(
      cfg,
      token,
      "runReport",
      {
        dateRanges: range,
        dimensions: [{ name: dimension }],
        metrics: [{ name: metric }],
        orderBys: [{ metric: { metricName: metric }, desc: true }],
        limit,
      },
      fetcher
    );
  const [
    rtTotal,
    rtPages,
    rtCountries,
    totals,
    daily,
    pages,
    sources,
    countries,
    devices,
  ] = await Promise.all([
    call(
      cfg,
      token,
      "runRealtimeReport",
      { metrics: [{ name: "activeUsers" }] },
      fetcher
    ),
    call(
      cfg,
      token,
      "runRealtimeReport",
      {
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
        limit: 8,
      },
      fetcher
    ),
    call(
      cfg,
      token,
      "runRealtimeReport",
      {
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        limit: 8,
      },
      fetcher
    ),
    call(
      cfg,
      token,
      "runReport",
      {
        dateRanges: range,
        metrics: [
          "totalUsers",
          "newUsers",
          "sessions",
          "screenPageViews",
          "engagementRate",
          "userEngagementDuration",
          "keyEvents",
        ].map(name => ({ name })),
      },
      fetcher
    ),
    call(
      cfg,
      token,
      "runReport",
      {
        dateRanges: range,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "totalUsers" }, { name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
      fetcher
    ),
    top("pagePath", "screenPageViews"),
    top("sessionSourceMedium"),
    top("country", "totalUsers"),
    top("deviceCategory", "sessions", 5),
  ]);
  const t = totals.rows?.[0]?.metricValues ?? [];
  const users = num(t[0]?.value);
  return {
    realtime: {
      activeUsers: num(rtTotal.rows?.[0]?.metricValues?.[0]?.value),
      pages: dims(rtPages, 8),
      countries: dims(rtCountries, 8),
    },
    period: `Last ${days} days`,
    totals: {
      users,
      newUsers: num(t[1]?.value),
      sessions: num(t[2]?.value),
      pageviews: num(t[3]?.value),
      engagementRate: Math.round(num(t[4]?.value) * 1000) / 10,
      avgEngagementSec: users ? Math.round(num(t[5]?.value) / users) : 0,
      conversions: num(t[6]?.value),
    },
    daily: (daily.rows ?? []).map(r => {
      const d = r.dimensionValues?.[0]?.value ?? "";
      return {
        date:
          d.length === 8
            ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`
            : d,
        users: num(r.metricValues?.[0]?.value),
        sessions: num(r.metricValues?.[1]?.value),
      };
    }),
    topPages: dims(pages),
    sources: dims(sources),
    countries: dims(countries),
    devices: dims(devices, 5),
  };
}
