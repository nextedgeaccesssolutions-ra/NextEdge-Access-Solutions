"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Bucket = { hour: string; requests: number; cachedRequests: number | null; bytes: number; threats: number | null };
type Data = {
  configured: boolean;
  missing?: string[];
  fetchedAt?: string;
  period?: { start: string; end: string };
  totals?: { requests: number; cachedRequests: number | null; bytes: number; cachedBytes: number | null; threats: number | null; pageViews: number; cacheHitRate: number | null };
  series?: Bucket[];
};

function number(value: unknown) {
  return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function metric(value: number | null | undefined) {
  return value == null ? "Not available" : number(value);
}

function bytes(value: number | null | undefined) {
  if (value == null) return "Not available";
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

function formatHour(value: string) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", hour12: true });
}

function TrafficCharts({ series }: { series: Bucket[] }) {
  const rows = useMemo(() => [...series].filter((item) => item.hour && Number.isFinite(item.requests)).sort((a, b) => Date.parse(a.hour) - Date.parse(b.hour)), [series]);
  const maxRequests = Math.max(1, ...rows.map((item) => item.requests));
  const maxBytes = Math.max(1, ...rows.map((item) => item.bytes));
  const width = 760;
  const height = 230;
  const left = 48;
  const right = 12;
  const top = 16;
  const bottom = 34;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const points = rows.map((item, index) => ({
    x: left + (rows.length <= 1 ? plotWidth / 2 : (index / (rows.length - 1)) * plotWidth),
    y: top + plotHeight - (item.requests / maxRequests) * plotHeight,
    item,
  }));
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = points.length ? `${left},${top + plotHeight} ${line} ${points[points.length - 1].x},${top + plotHeight}` : "";
  const tickIndexes = rows.length > 1 ? [0, Math.floor((rows.length - 1) / 3), Math.floor(2 * (rows.length - 1) / 3), rows.length - 1] : [0];

  if (!rows.length) return <div className="muted" style={{ padding: 24, textAlign: "center" }}>No hourly data available to chart for this period.</div>;

  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,360px),1fr))", gap: 14, marginTop: 18 }}>
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <div><b style={{ fontSize: 14 }}>Traffic trend</b><div className="muted" style={{ fontSize: 11 }}>Requests per hour · Asia/Manila labels</div></div>
        <b style={{ color: "#b7791f", fontSize: 13 }}>{number(rows.reduce((sum, item) => sum + item.requests, 0))} total</b>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Line chart showing hourly HTTP requests over the last 24 hours" style={{ width: "100%", height: "auto", display: "block" }}>
        {[0, 1, 2, 3].map((tick) => {
          const y = top + (plotHeight / 3) * tick;
          const value = Math.round(maxRequests * (1 - tick / 3));
          return <g key={tick}>
            <line x1={left} y1={y} x2={width - right} y2={y} stroke="#e2e8f0" strokeDasharray="4 5" />
            <text x={left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">{number(value)}</text>
          </g>;
        })}
        <polygon points={area} fill="#CA9332" opacity=".16" />
        <polyline points={line} fill="none" stroke="#B7791F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point) => <circle key={point.item.hour} cx={point.x} cy={point.y} r="3.5" fill="#B7791F" stroke="#fff" strokeWidth="1.5"><title>{formatHour(point.item.hour)} · {number(point.item.requests)} requests</title></circle>)}
        {tickIndexes.map((index) => <text key={index} x={points[index]?.x ?? left} y={height - 9} textAnchor={index === 0 ? "start" : index === tickIndexes[tickIndexes.length - 1] ? "end" : "middle"} fontSize="10" fill="#64748b">{formatHour(rows[index]?.hour ?? "")}</text>)}
      </svg>
    </div>
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 14, minWidth: 0 }}>
      <div style={{ marginBottom: 8 }}><b style={{ fontSize: 14 }}>Bandwidth by hour</b><div className="muted" style={{ fontSize: 11 }}>Cloudflare response bytes</div></div>
      <div style={{ height: 194, display: "flex", alignItems: "stretch", gap: 4, padding: "10px 2px 24px", borderBottom: "1px solid var(--line)" }}>
        {rows.map((item) => <div key={item.hour} title={`${formatHour(item.hour)} · ${bytes(item.bytes)}`} style={{ flex: 1, minWidth: 2, height: "100%", display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", minHeight: item.bytes > 0 ? 2 : 0, height: `${(item.bytes / maxBytes) * 100}%`, background: "linear-gradient(180deg,#CA9332,#8b641f)", borderRadius: "4px 4px 0 0" }} />
        </div>)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, fontSize: 10, color: "#64748b" }}>
        <span>{formatHour(rows[0].hour)}</span><span>{formatHour(rows[Math.floor((rows.length - 1) / 2)].hour)}</span><span>{formatHour(rows[rows.length - 1].hour)}</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 12 }}><span className="muted">Peak hour: </span><b>{bytes(maxBytes)}</b></div>
    </div>
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
        <Metric label="CACHED REQUESTS" value={metric(totals?.cachedRequests)} note="Not provided by the current traffic query" />
        <Metric label="CACHE HIT RATE" value={totals?.cacheHitRate == null ? "Not available" : number(totals.cacheHitRate) + "%"} note="Requires a separate cache-status query" />
        <Metric label="THREATS" value={metric(totals?.threats)} note="Requires a separate firewall-events query" />
      </div>

      <TrafficCharts series={data.series ?? []} />

      <div style={{ marginTop: 18, border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
        <h4 style={{ margin: "0 0 12px" }}>Hourly traffic detail</h4>
        {data.series?.length ? <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
            <thead><tr>{["Hour (Manila)", "Requests", "Cached", "Data transfer", "Threats"].map((label) => <th key={label} style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{label}</th>)}</tr></thead>
            <tbody>{[...(data.series ?? [])].sort((a, b) => Date.parse(b.hour) - Date.parse(a.hour)).map((item) => <tr key={item.hour}>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>{item.hour ? new Date(item.hour).toLocaleString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{number(item.requests)}</td>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{metric(item.cachedRequests)}</td>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{bytes(item.bytes)}</td>
              <td style={{ padding: "9px 8px", borderBottom: "1px solid var(--line)" }}>{metric(item.threats)}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="muted" style={{ fontSize: 13 }}>No hourly traffic data returned for this period.</p>}
      </div>
      <p className="muted" style={{ fontSize: 11, margin: "16px 0 0" }}>Last updated: {updated || "—"} · Reporting timezone: Asia/Manila · Data source: Cloudflare</p>
    </>}
  </section>;
}
