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
  const configuredZoneId = (process.env.CLOUDFLARE_ZONE_ID || "").trim();
  const zoneName = (process.env.CLOUDFLARE_ZONE_NAME || "nextedge-access-solutions.com").trim();

  if (!token) {
    return ok({ configured: false, missing: ["CLOUDFLARE_API_TOKEN"] });
  }

  if (cachedResponse && cachedResponse.expiresAt > Date.now()) {
    return ok(cachedResponse.body);
  }

  // Prefer resolving the zone by its DNS name. This prevents an account ID or
  // stale zone ID from silently breaking analytics after an environment change.
  let zoneId = /^[a-f0-9]{32}$/i.test(configuredZoneId) ? configuredZoneId : "";
  try {
    const zonesResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(zoneName)}&status=active`,
      {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(8_000),
      },
    );
    const zonesPayload = await zonesResponse.json().catch(() => null) as {
      success?: boolean;
      result?: Array<{ id?: string; name?: string }>;
    } | null;
    const matchingZone = zonesPayload?.result?.find((zone) => zone.name?.toLowerCase() === zoneName.toLowerCase());
    if (zonesResponse.ok && zonesPayload?.success && matchingZone?.id && /^[a-f0-9]{32}$/i.test(matchingZone.id)) {
      zoneId = matchingZone.id;
    }
  } catch (error) {
    console.warn("[admin cloudflare] Zone-name lookup unavailable; using configured zone ID:", error);
  }

  if (!zoneId) {
    return bad(
      "Could not resolve the Cloudflare zone. Grant this API token Zone:Read and Analytics:Read for nextedge-access-solutions.com, or configure a valid CLOUDFLARE_ZONE_ID.",
      503,
    );
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
          : messages.some((message) => /zone not found/i.test(message || ""))
            ? "Cloudflare could not find this zone. Verify the domain is in this Cloudflare account and grant the token Zone:Read plus Analytics:Read, or set the correct CLOUDFLARE_ZONE_ID."
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
