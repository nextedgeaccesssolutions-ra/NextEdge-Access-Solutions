"use client";

import { useCallback, useEffect, useState } from "react";

type Bucket = { hour: string; requests: number; cachedRequests: number; bytes: number; threats: number };
type Data = {
  configured: boolean;
  missing?: string[];
  fetchedAt?: string;
  period?: { start: string; end: string };
  totals?: { requests: number; cachedRequests: number; bytes: number; cachedBytes: number; threats: number; pageViews: number; cacheHitRate: number };
  series?: Bucket[];
};

function number(value: unknown) {
  return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function bytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, background: "var(--card, #fff)", minWidth: 0 }}>
    <div className="muted" style={{ fontSize: 12, fontWeight: 650 }}>{label}</div>
    <div style={{ fontSize: 27, fontWeight: 850, letterSpacing: "-.04em", marginTop: 7 }}>{value}</div>
    {note && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{note}</div>}
  </div>;
}

export default function CloudflareAnalyticsPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/cloudflare", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load Cloudflare analytics.");
      setData(result);
      setError("");
      setUpdated(new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Cloudflare analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const totals = data?.totals;

  return <section className="card" style={{ maxWidth: 1080 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h3 style={{ margin: 0 }}>Cloudflare zone analytics</h3>
        <p className="muted" style={{ margin: "5px 0 0", fontSize: 12 }}>nextedge-access-solutions.com · GraphQL Analytics API · Last 24 hours · Auto-refresh every 30 seconds</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: data?.configured ? "#16a34a" : "#b7791f", fontSize: 12, fontWeight: 750 }}>● {data?.configured ? "CONNECTED" : "SETUP REQUIRED"}</span>
        <button type="button" className="btn btn-ghost" onClick={() => { setLoading(true); void refresh(); }} disabled={loading}>↻ Refresh</button>
      </div>
    </div>

    {loading && !data && <p className="muted" style={{ marginTop: 20 }}>Connecting to Cloudflare…</p>}
    {error && <div role="alert" style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "#fff1f0", color: "#9f2d25" }}>{error}</div>}

    {data && !data.configured && <div style={{ marginTop: 18, padding: 18, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface, #f8fafc)" }}>
      <b>Connect Cloudflare read-only analytics</b>
      <p className="muted" style={{ fontSize: 13, lineHeight: 1.65 }}>Add the following server-side environment variables to the NEAS Vercel project. The token is never sent to the browser.</p>
      <ul style={{ fontSize: 13, lineHeight: 1.9, paddingLeft: 20 }}>
        <li><code>CLOUDFLARE_API_TOKEN</code> — API token with Zone → Analytics → Read, restricted to this zone</li>
        <li><code>CLOUDFLARE_ZONE_ID</code> — the zone ID for nextedge-access-solutions.com</li>
      </ul>
      {data.missing?.length ? <p style={{ color: "#a16207", fontSize: 12, fontWeight: 700 }}>Missing: {data.missing.join(", ")}</p> : null}
      <a className="btn btn-ghost" href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noopener">Create Cloudflare API token ↗</a>
    </div>}

    {data?.configured && <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 12, marginTop: 22 }}>
        <Metric label="HTTP REQUESTS" value={number(totals?.requests)} note="Last 24 hours" />
        <Metric label="PAGEVIEWS" value={number(totals?.pageViews)} note="Cloudflare edge estimate" />
        <Metric label="DATA TRANSFER" value={bytes(totals?.bytes ?? 0)} note="Response bytes" />
        <Metric label="CACHED REQUESTS" value={number(totals?.cachedRequests)} note="Served from cache" />
        <Metric label="CACHE HIT RATE" value={number(totals?.cacheHitRate) + "%"} note="Cached / total requests" />
        <Metric label="THREATS" value={number(totals?.threats)} note="Threat events reported in request aggregates" />
      </div>

      <div style={{ marginTop: 22, border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
        <h4 style={{ margin: "0 0 12px" }}>Hourly traffic · last 24 hours</h4>
        {data.series?.length ? <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead><tr>{["Hour (UTC)", "Requests", "Cached", "Data transfer", "Threats"].map((label) => <th key={label} style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{label}</th>)}</tr></thead>
            <tbody>{[...data.series].reverse().map((item) => <tr key={item.hour}>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>{item.hour ? new Date(item.hour).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{number(item.requests)}</td>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{number(item.cachedRequests)}</td>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{bytes(item.bytes)}</td>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{number(item.threats)}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="muted" style={{ fontSize: 13 }}>No hourly traffic data returned for this period.</p>}
      </div>
      <p className="muted" style={{ fontSize: 11, margin: "16px 0 0" }}>Last updated: {updated || "—"} · Reporting timezone: Asia/Manila · Data source: Cloudflare</p>
    </>}
  </section>;
}
