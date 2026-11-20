import { requireAdmin } from "@/lib/admin";
import { bad, ok } from "@/lib/http";
export const dynamic = "force-dynamic";

function getConfig() {
  const rawBase = (process.env.RYBBIT_BASE_URL || "").trim().replace(/\/+$/, "");
  const site = (process.env.RYBBIT_SITE_ID || "").trim();
  const key = (process.env.RYBBIT_API_KEY || "").trim();
  if (!rawBase || !site || !key) return null;
  let parsed: URL;
  try { parsed = new URL(rawBase); } catch { return null; }
  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname))) return null;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(site)) return null;
  return { base: parsed.origin, site, key };
}

export async function GET() {
  if (!(await requireAdmin())) return bad("Admin access required.", 403);
  const cfg = getConfig();
  if (!cfg) return bad("Rybbit is not configured. Set RYBBIT_BASE_URL, RYBBIT_SITE_ID and RYBBIT_API_KEY in the server environment.", 503);
  const query = new URLSearchParams({ past_minutes_start: "43200", past_minutes_end: "0", time_zone: "Asia/Manila" });
  try {
    const response = await fetch(`${cfg.base}/api/sites/${encodeURIComponent(cfg.site)}/overview?${query}`, {
      headers: { Authorization: `Bearer ${cfg.key}`, Accept: "application/json" },
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if ([401, 403].includes(response.status)) return bad("Rybbit rejected the API key or analytics:read permission. Verify the key and site access.", 502);
      if (response.status === 404) return bad("Rybbit site not found. Verify RYBBIT_SITE_ID.", 502);
      return bad(`Rybbit API returned HTTP ${response.status}.`, 502);
    }
    const payload = await response.json() as { data?: Record<string, unknown> };
    if (!payload?.data || typeof payload.data !== "object") return bad("Rybbit returned an unexpected response.", 502);
    const d = payload.data;
    const n = (v: unknown) => typeof v === "number" && Number.isFinite(v) ? v : 0;
    return ok({ connected: true, period: "Last 30 days", sessions: n(d.sessions), pageviews: n(d.pageviews), users: n(d.users), pagesPerSession: n(d.pages_per_session), bounceRate: n(d.bounce_rate), sessionDuration: n(d.session_duration), checkedAt: new Date().toISOString() });
  } catch {
    return bad("Could not reach Rybbit. Verify its public HTTPS address and network access.", 502);
  }
}
