"use client";

import { useCallback, useEffect, useState } from "react";

type AnalyticsData = {
  configured: boolean;
  missing?: string[];
  fetchedAt?: string;
  liveVisitors?: number;
  overview?: Record<string, number>;
  topPages?: Array<{ value?: string; count?: number }>;
  topSources?: Array<{ value?: string; count?: number }>;
  period?: { startDate: string; endDate: string; timeZone: string };
};

function number(value: unknown) {
  return Number(value ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1 });
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16, background: "var(--card, #fff)", minWidth: 0 }}>
    <div className="muted" style={{ fontSize: 12, fontWeight: 650 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 850, letterSpacing: "-.04em", marginTop: 7 }}>{value}</div>
    {note && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{note}</div>}
  </div>;
}

export default function AnalyticsPanel() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/analytics", { cache: "no-store" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to load analytics.");
      setData(result);
      setError("");
      setUpdated(new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const overview = data?.overview ?? {};
  const metric = (key: string) => number(overview[key] ?? 0);

  return <section className="card" style={{ maxWidth: 1080 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div>
        <h3 style={{ margin: 0 }}>Live website analytics</h3>
        <p className="muted" style={{ margin: "5px 0 0", fontSize: 12 }}>Rybbit · Auto-refresh every 30 seconds · Reporting timezone: Asia/Manila</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ color: data?.configured ? "#16a34a" : "#b7791f", fontSize: 12, fontWeight: 750 }}>● {data?.configured ? "CONNECTED" : "SETUP REQUIRED"}</span>
        <button type="button" className="btn btn-ghost" onClick={() => { setLoading(true); void refresh(); }} disabled={loading}>↻ Refresh</button>
      </div>
    </div>

    {loading && !data && <p className="muted" style={{ marginTop: 20 }}>Connecting to analytics…</p>}
    {error && <div role="alert" style={{ marginTop: 16, padding: 14, borderRadius: 10, background: "#fff1f0", color: "#9f2d25" }}>{error}</div>}

    {data && !data.configured && <div style={{ marginTop: 18, padding: 18, borderRadius: 12, border: "1px solid var(--line)", background: "var(--surface, #f8fafc)" }}>
      <b>Connect Rybbit to display live metrics</b>
      <p className="muted" style={{ fontSize: 13, lineHeight: 1.65 }}>Add these environment variables to the NEAS Vercel project. Keep the API key server-side; do not use a NEXT_PUBLIC_ prefix for it.</p>
      <ul style={{ fontSize: 13, lineHeight: 1.9, paddingLeft: 20 }}>
        <li><code>NEXT_PUBLIC_RYBBIT_HOST</code> — your Rybbit instance URL</li>
        <li><code>NEXT_PUBLIC_RYBBIT_SITE_ID</code> — NEAS website site ID</li>
        <li><code>RYBBIT_API_KEY</code> — server-side API key with <code>analytics:read</code> and <code>events:read</code> scopes</li>
      </ul>
      {data.missing?.length ? <p style={{ color: "#a16207", fontSize: 12, fontWeight: 700 }}>Missing: {data.missing.join(", ")}</p> : null}
      <a className="btn btn-ghost" href="https://rybbit.com/docs/api/getting-started" target="_blank" rel="noopener">Rybbit API setup guide ↗</a>
    </div>}

    {data?.configured && <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "22px 0 12px" }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: "#16a34a", boxShadow: "0 0 0 4px #16a34a22" }} />
        <b style={{ fontSize: 13 }}>Live visitors</b>
        <span className="muted" style={{ fontSize: 12 }}>active in the last 5 minutes</span>
      </div>
      <div style={{ fontSize: 42, lineHeight: 1, fontWeight: 900, letterSpacing: "-.05em", marginBottom: 22 }}>{number(data.liveVisitors)}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <Metric label="UNIQUE VISITORS" value={metric("users")} note="Last 7 days" />
        <Metric label="SESSIONS" value={metric("sessions")} note="Last 7 days" />
        <Metric label="PAGEVIEWS" value={metric("pageviews")} note="Last 7 days" />
        <Metric label="BOUNCE RATE" value={overview.bounce_rate == null ? "—" : number(overview.bounce_rate) + "%"} note="Last 7 days" />
        <Metric label="PAGES / SESSION" value={overview.pages_per_session == null ? "—" : number(overview.pages_per_session)} note="Last 7 days" />
        <Metric label="AVG. SESSION" value={overview.session_duration == null ? "—" : number(Number(overview.session_duration) / 60) + " min"} note="Last 7 days" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16, marginTop: 22 }}>
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
          <h4 style={{ margin: "0 0 12px" }}>Top pages · 7 days</h4>
          {data.topPages?.length ? data.topPages.map((item, i) => <div key={item.value || i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}><span style={{ overflowWrap: "anywhere" }}>{item.value || "(unknown)"}</span><b>{number(item.count)}</b></div>) : <p className="muted" style={{ fontSize: 13 }}>No page data yet.</p>}
        </div>
        <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
          <h4 style={{ margin: "0 0 12px" }}>Top traffic sources · 7 days</h4>
          {data.topSources?.length ? data.topSources.map((item, i) => <div key={item.value || i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}><span style={{ overflowWrap: "anywhere" }}>{item.value || "Direct"}</span><b>{number(item.count)}</b></div>) : <p className="muted" style={{ fontSize: 13 }}>No traffic source data yet.</p>}
        </div>
      </div>
      <p className="muted" style={{ fontSize: 11, margin: "16px 0 0" }}>Last updated: {updated || "—"} · {data.period?.startDate} to {data.period?.endDate}</p>
    </>}
  </section>;
}
