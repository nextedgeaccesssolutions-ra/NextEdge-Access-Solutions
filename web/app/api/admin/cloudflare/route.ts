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

type CloudflareGraphqlPayload = {
  data?: {
    viewer?: {
      zones?: Array<{
        zoneTag?: string;
        httpRequestsAdaptiveGroups?: CloudflareBucket[];
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

const CACHE_TTL_MS = 60_000;
let cachedResponse: { expiresAt: number; body: unknown } | null = null;

const GRAPHQL_ENDPOINT = "https://api.cloudflare.com/client/v4/graphql";
const ZONE_DISCOVERY_QUERY = `
  query NeasDiscoverZones {
    viewer {
      zones(filter: { zoneTag_gt: "00000000000000000000000000000000" }) {
        zoneTag
      }
    }
  }
`;

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

async function runGraphql(
  token: string,
  query: string,
  variables: Record<string, string> = {},
) {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  const payload = (await response.json().catch(() => null)) as CloudflareGraphqlPayload | null;
  return { response, payload };
}

function graphqlMessages(payload: CloudflareGraphqlPayload | null) {
  return payload?.errors?.map((error) => error.message).filter((message): message is string => Boolean(message)) ?? [];
}

export async function GET() {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);

  const token = (process.env.CLOUDFLARE_API_TOKEN || "")
    .trim()
    .replace(/^Bearer\s+/i, "")
    .replace(/^["']|["']$/g, "");
  const configuredZoneId = (process.env.CLOUDFLARE_ZONE_ID || "").trim();

  if (!token || !configuredZoneId) {
    return ok({
      configured: false,
      missing: [
        ...(!token ? ["CLOUDFLARE_API_TOKEN"] : []),
        ...(!configuredZoneId ? ["CLOUDFLARE_ZONE_ID"] : []),
      ],
    });
  }

  if (!/^[a-f0-9]{32}$/i.test(configuredZoneId)) {
    return bad("Invalid Cloudflare zone ID configuration.", 500);
  }

  if (cachedResponse && cachedResponse.expiresAt > Date.now()) {
    return ok(cachedResponse.body);
  }

  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);

  try {
    let zoneId = configuredZoneId;
    let result = await runGraphql(token, QUERY, {
      zoneTag: zoneId,
      start: start.toISOString(),
      end: end.toISOString(),
    });
    let messages = graphqlMessages(result.payload);

    // A Cloudflare account ID is also a 32-character hex string. If it was
    // mistakenly saved as the zone ID, discover the zones this token can read.
    // The dashboard recommends a token restricted to this one NEAS zone.
    if (messages.some((message) => /zone not found/i.test(message))) {
      const discovery = await runGraphql(token, ZONE_DISCOVERY_QUERY);
      const discoveryMessages = graphqlMessages(discovery.payload);

      if (!discovery.response.ok || discoveryMessages.length || !discovery.payload?.data) {
        console.error("[admin cloudflare] Zone discovery failed:", discovery.response.status, discoveryMessages);
        return bad(
          "Cloudflare could not resolve the website zone. Verify the token has Analytics Read access to the NEAS zone.",
          discovery.response.status === 401 || discovery.response.status === 403 ? discovery.response.status : 502,
        );
      }

      const discoveredZoneIds = [
        ...new Set(
          (discovery.payload.data.viewer?.zones ?? [])
            .map((zone) => zone.zoneTag)
            .filter((value): value is string => typeof value === "string" && /^[a-f0-9]{32}$/i.test(value)),
        ),
      ];

      if (discoveredZoneIds.length !== 1) {
        console.error("[admin cloudflare] Expected one token-scoped zone; found:", discoveredZoneIds.length);
        return bad(
          discoveredZoneIds.length === 0
            ? "No Cloudflare zones are available to this API token. Grant Analytics Read access to nextedge-access-solutions.com."
            : "This Cloudflare token can access multiple zones. Restrict it to nextedge-access-solutions.com or configure the exact Zone ID.",
          502,
        );
      }

      zoneId = discoveredZoneIds[0];
      result = await runGraphql(token, QUERY, {
        zoneTag: zoneId,
        start: start.toISOString(),
        end: end.toISOString(),
      });
      messages = graphqlMessages(result.payload);
      console.info("[admin cloudflare] Resolved zone ID from token-scoped GraphQL zone discovery.");
    }

    if (!result.response.ok || messages.length || !result.payload?.data) {
      const status = result.response.status || 502;
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

    const buckets = result.payload.data.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups ?? [];
    const totals = buckets.reduce((acc, bucket) => {
      acc.requests += Number(bucket.count ?? 0);
      acc.bytes += Number(bucket.sum?.edgeResponseBytes ?? 0);
      acc.visits += Number(bucket.sum?.visits ?? 0);
      return acc;
    }, { requests: 0, bytes: 0, visits: 0 });

    const body = {
      configured: true,
      zone: "nextedge-access-solutions.com",
      fetchedAt: end.toISOString(),
      period: { start: start.toISOString(), end: end.toISOString() },
      totals: {
        requests: totals.requests,
        bytes: totals.bytes,
        visits: totals.visits,
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
        visits: Number(bucket.sum?.visits ?? 0),
        cachedRequests: null,
        threats: null,
      })),
    };

    cachedResponse = { expiresAt: Date.now() + CACHE_TTL_MS, body };
    return ok(body);
  } catch (error) {
    console.error("[admin cloudflare] Analytics request failed:", error);
    return bad("Cloudflare analytics request failed. Check connectivity and try again.", 502);
  }
}
