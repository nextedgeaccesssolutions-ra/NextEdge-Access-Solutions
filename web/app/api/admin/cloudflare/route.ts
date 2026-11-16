import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type CloudflareBucket = {
  dimensions?: { datetimeHour?: string };
  sum?: {
    requests?: number;
    cachedRequests?: number;
    bytes?: number;
    cachedBytes?: number;
    threats?: number;
    pageViews?: number;
  };
};

const CACHE_TTL_MS = 60_000;
let cachedResponse: { expiresAt: number; body: unknown } | null = null;

const QUERY = `
  query NeasZoneTraffic($zoneTag: String!, $start: Time!, $end: Time!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequests1hGroups(
          limit: 48
          orderBy: [datetimeHour_ASC]
          filter: {
            datetime_geq: $start
            datetime_lt: $end
            requestSource: "eyeball"
          }
        ) {
          dimensions { datetimeHour }
          sum {
            requests
            cachedRequests
            bytes
            cachedBytes
            threats
            pageViews
          }
        }
      }
    }
  }
`;

export async function GET() {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);

  const token = (process.env.CLOUDFLARE_API_TOKEN || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "");
  const zoneId = (process.env.CLOUDFLARE_ZONE_ID || "").trim();

  if (!token || !zoneId) {
    return ok({
      configured: false,
      missing: [
        ...(!token ? ["CLOUDFLARE_API_TOKEN"] : []),
        ...(!zoneId ? ["CLOUDFLARE_ZONE_ID"] : []),
      ],
    });
  }

  if (!/^[a-f0-9]{32}$/i.test(zoneId)) {
    return bad("Invalid Cloudflare zone ID configuration.", 500);
  }

  if (cachedResponse && cachedResponse.expiresAt > Date.now()) {
    return ok(cachedResponse.body);
  }

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: QUERY,
        variables: {
          zoneTag: zoneId,
          start: start.toISOString(),
          end: end.toISOString(),
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });

    const payload = await response.json().catch(() => null) as {
      data?: { viewer?: { zones?: Array<{ httpRequests1hGroups?: CloudflareBucket[] }> } };
      errors?: Array<{ message?: string }>;
      success?: boolean;
    } | null;

    if (!response.ok || payload?.errors?.length || !payload?.data) {
      const status = response.status || 502;
      const messages = payload?.errors?.map((e) => e.message).filter(Boolean) ?? [];
      console.error("[admin cloudflare] Analytics API failed:", status, messages);
      return bad(
        status === 401 || status === 403
          ? "Cloudflare rejected the API token. Verify Analytics Read permission and zone access."
          : messages.length
            ? `Cloudflare GraphQL error: ${messages.slice(0, 2).join("; ").slice(0, 240)}`
            : "Could not load Cloudflare analytics. Verify the token, zone ID and analytics API access.",
        status === 401 || status === 403 ? status : 502,
      );
    }

    const buckets = payload.data.viewer?.zones?.[0]?.httpRequests1hGroups ?? [];
    const totals = buckets.reduce((acc, bucket) => {
      const sum = bucket.sum ?? {};
      acc.requests += Number(sum.requests ?? 0);
      acc.cachedRequests += Number(sum.cachedRequests ?? 0);
      acc.bytes += Number(sum.bytes ?? 0);
      acc.cachedBytes += Number(sum.cachedBytes ?? 0);
      acc.threats += Number(sum.threats ?? 0);
      acc.pageViews += Number(sum.pageViews ?? 0);
      return acc;
    }, { requests: 0, cachedRequests: 0, bytes: 0, cachedBytes: 0, threats: 0, pageViews: 0 });

    const result = {
      configured: true,
      zone: "nextedge-access-solutions.com",
      fetchedAt: end.toISOString(),
      period: { start: start.toISOString(), end: end.toISOString() },
      totals: {
        ...totals,
        cacheHitRate: totals.requests > 0 ? Number(((totals.cachedRequests / totals.requests) * 100).toFixed(1)) : 0,
      },
      series: buckets.map((bucket) => ({
        hour: bucket.dimensions?.datetimeHour ?? "",
        requests: Number(bucket.sum?.requests ?? 0),
        cachedRequests: Number(bucket.sum?.cachedRequests ?? 0),
        bytes: Number(bucket.sum?.bytes ?? 0),
        threats: Number(bucket.sum?.threats ?? 0),
      })),
    };

    cachedResponse = { expiresAt: Date.now() + CACHE_TTL_MS, body: result };
    return ok(result);
  } catch (error) {
    console.error("[admin cloudflare] Analytics request failed:", error);
    return bad("Cloudflare analytics request failed. Check connectivity and try again.", 502);
  }
}
