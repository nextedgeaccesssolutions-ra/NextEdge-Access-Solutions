import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

type CloudflareBucket = {
  count?: number;
  dimensions?: { datetimeHour?: string };
  sum?: {
    edgeResponseBytes?: number;
    visits?: number;
  };
};

const CACHE_TTL_MS = 60_000;
let cachedResponse: { expiresAt: number; body: unknown } | null = null;

const QUERY = `
  query NeasZoneTraffic($zoneTag: String!, $start: Time!, $end: Time!) {
    viewer {
      zones(filter: { zoneTag: $zoneTag }) {
        httpRequestsAdaptiveGroups(
          limit: 48
          filter: {
            datetime_geq: $start
            datetime_lt: $end
            requestSource: "eyeball"
          }
        ) {
          count
          dimensions { datetimeHour }
          sum {
            edgeResponseBytes
            visits
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
    .replace(/^[\"']|[\"']$/g, "");
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
      data?: { viewer?: { zones?: Array<{ httpRequestsAdaptiveGroups?: CloudflareBucket[] }> } };
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

    const buckets = payload.data.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
    const totals = buckets.reduce((acc, bucket) => {
      acc.requests += Number(bucket.count ?? 0);
      acc.bytes += Number(bucket.sum?.edgeResponseBytes ?? 0);
      acc.visits += Number(bucket.sum?.visits ?? 0);
      return acc;
    }, { requests: 0, bytes: 0, visits: 0 });

    const result = {
      configured: true,
      zone: "nextedge-access-solutions.com",
      fetchedAt: end.toISOString(),
      period: { start: start.toISOString(), end: end.toISOString() },
      totals: {
        requests: totals.requests,
        bytes: totals.bytes,
        pageViews: totals.visits,
        // These metrics are not provided by this Cloudflare dataset.
        cachedRequests: null,
        cachedBytes: null,
        threats: null,
        cacheHitRate: null,
      },
      series: buckets.map((bucket) => ({
        hour: bucket.dimensions?.datetimeHour ?? "",
        requests: Number(bucket.count ?? 0),
        bytes: Number(bucket.sum?.edgeResponseBytes ?? 0),
        pageViews: Number(bucket.sum?.visits ?? 0),
        cachedRequests: null,
        threats: null,
      })),
    };

    cachedResponse = { expiresAt: Date.now() + CACHE_TTL_MS, body: result };
    return ok(result);
  } catch (error) {
    console.error("[admin cloudflare] Analytics request failed:", error);
    return bad("Cloudflare analytics request failed. Check connectivity and try again.", 502);
  }
}
