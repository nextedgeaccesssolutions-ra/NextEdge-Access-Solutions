"use client";
import { useState } from "react";
type Metrics = { connected: boolean; period: string; sessions: number; pageviews: number; users: number; pagesPerSession: number; bounceRate: number; sessionDuration: number; checkedAt: string };
const fmt = (n: number) => new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(n);
export default function RybbitAnalytics() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true); setError("");
    try {
      const r = await fetch("/api/admin/rybbit", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Unable to load Rybbit analytics.");
      setData(j as Metrics);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection failed."); setData(null); }
    finally { setBusy(false); }
  }
  return <div className="wrap" style={{ padding: "0 20px 40px", maxWidth: 1100 }}>
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div><b>NEAS Website Analytics</b><p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>Powered by self-hosted Rybbit · Last 30 days</p></div>
        <button type="button" className="btn btn-primary" onClick={load} disabled={busy}>{busy ? "Connecting…" : data ? "Refresh analytics" : "Connect to Rybbit"}</button>
      </div>
      {error && <p role="alert" style={{ color: "#b91c1c", marginBottom: 0 }}>{error}</p>}
      {data && <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Connected · Checked {new Date(data.checkedAt).toLocaleString("en-PH")}</p>}
    </div>
    {data && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
      {([["Sessions", fmt(data.sessions)], ["Pageviews", fmt(data.pageviews)], ["Unique visitors", fmt(data.users)], ["Pages / session", fmt(data.pagesPerSession)], ["Bounce rate", fmt(data.bounceRate) + "%"], ["Avg. session duration", fmt(data.sessionDuration) + " sec"]] as const).map(([label, value]) => <div className="card" key={label}><div className="muted" style={{ fontSize: 13 }}>{label}</div><div style={{ fontSize: 27, fontWeight: 700, marginTop: 8 }}>{value}</div></div>)}
    </div>}
    {!data && !error && <div className="card"><p className="muted" style={{ margin: 0 }}>Connect to Rybbit to view sessions, pageviews, visitors, bounce rate and session duration. Credentials remain server-side and are never sent to the browser.</p></div>}
  </div>;
}
