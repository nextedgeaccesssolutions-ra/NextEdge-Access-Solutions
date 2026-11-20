import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";

export const dynamic = "force-dynamic";

function dateInManila(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}

async function rybbitGet(host: string, siteId: string, apiKey: string, path: string, params: Record<string, string> = {}) {
  const url = new URL(`/api/sites/${encodeURIComponent(siteId)}${path}`, host);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Rybbit API returned ${response.status}`);
  return response.json();
}

export async function GET() {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);

  const host = (process.env.NEXT_PUBLIC_RYBBIT_HOST || "").trim().replace(/\/$/, "");
  const siteId = (process.env.NEXT_PUBLIC_RYBBIT_SITE_ID || "").trim();
  const apiKey = (process.env.RYBBIT_API_KEY || "").trim();

  if (!host || !siteId || !apiKey) {
    return ok({ configured: false, missing: [
      ...(!host ? ["NEXT_PUBLIC_RYBBIT_HOST"] : []),
      ...(!siteId ? ["NEXT_PUBLIC_RYBBIT_SITE_ID"] : []),
      ...(!apiKey ? ["RYBBIT_API_KEY"] : []),
    ] });
  }

  let parsedHost: URL;
  try {
    parsedHost = new URL(host);
    if (parsedHost.protocol !== "https:" && parsedHost.hostname !== "localhost") throw new Error("HTTPS required");
  } catch {
    return bad("Invalid Rybbit host configuration.", 500);
  }

  try {
    const now = new Date();
    const endDate = dateInManila(now);
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() - 6);
    const startDate = dateInManila(start);
    const range = { start_date: startDate, end_date: endDate, time_zone: "Asia/Manila" };
    const [live, overview, pages, sources] = await Promise.all([
      rybbitGet(parsedHost.origin, siteId, apiKey, "/live-user-count", { minutes: "5" }),
      rybbitGet(parsedHost.origin, siteId, apiKey, "/overview", range),
      rybbitGet(parsedHost.origin, siteId, apiKey, "/metric", { ...range, parameter: "pathname", limit: "5" }),
      rybbitGet(parsedHost.origin, siteId, apiKey, "/metric", { ...range, parameter: "referrer", limit: "5" }),
    ]);
    return ok({
      configured: true, fetchedAt: now.toISOString(),
      liveVisitors: Number(live?.count ?? 0),
      overview: overview?.data ?? {},
      topPages: Array.isArray(pages?.data?.data) ? pages.data.data.slice(0, 5) : [],
      topSources: Array.isArray(sources?.data?.data) ? sources.data.data.slice(0, 5) : [],
      period: { startDate, endDate, timeZone: "Asia/Manila" },
    });
  } catch (error) {
    console.error("[admin analytics] Rybbit request failed:", error);
    return bad("Could not load Rybbit analytics. Check the API key, site ID, host and analytics:read permission.", 502);
  }
}
