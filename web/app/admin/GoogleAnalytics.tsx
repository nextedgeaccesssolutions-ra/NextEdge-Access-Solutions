"use client";
import { useCallback, useEffect, useState } from "react";

type Item = { label: string; value: number };
type Data = {
  connected: boolean;
  period: string;
  checkedAt: string;
  realtime: { activeUsers: number; pages: Item[]; countries: Item[] };
  totals: {
    users: number;
    newUsers: number;
    sessions: number;
    pageviews: number;
    engagementRate: number;
    avgEngagementSec: number;
    conversions: number;
  };
  daily: { date: string; users: number; sessions: number }[];
  topPages: Item[];
  sources: Item[];
  countries: Item[];
  devices: Item[];
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-PH", { maximumFractionDigits: 1 }).format(n);
const dur = (s: number) =>
  s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;

function TrendChart({ daily }: { daily: Data["daily"] }) {
  if (daily.length < 2)
    return (
      <p className="muted" style={{ margin: 0 }}>
        Not enough data yet.
      </p>
    );
  const W = 640,
    H = 160,
    P = 24;
  const max = Math.max(1, ...daily.map(d => d.sessions));
  const x = (i: number) => P + (i * (W - 2 * P)) / (daily.length - 1);
  const y = (v: number) => H - P - (v / max) * (H - 2 * P);
  const line = (k: "users" | "sessions") =>
    daily
      .map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`)
      .join(" ");
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto" }}
        role="img"
        aria-label="Daily sessions and users"
      >
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} stroke="#e5e7eb" />
        <path
          d={line("sessions")}
          fill="none"
          stroke="#f97316"
          strokeWidth={2.5}
        />
        <path d={line("users")} fill="none" stroke="#1e3a8a" strokeWidth={2} />
        <text x={P} y={H - 6} fontSize={11} fill="#6b7280">
          {daily[0].date}
        </text>
        <text x={W - P} y={H - 6} fontSize={11} fill="#6b7280" textAnchor="end">
          {daily[daily.length - 1].date}
        </text>
        <text x={P} y={14} fontSize={11} fill="#6b7280">
          max {fmt(max)}
        </text>
      </svg>
      <div style={{ display: "flex", gap: 16, fontSize: 13 }} className="muted">
        <span>
          <b style={{ color: "#f97316" }}>━</b> Sessions
        </span>
        <span>
          <b style={{ color: "#1e3a8a" }}>━</b> Users
        </span>
      </div>
    </div>
  );
}

function List({
  title,
  items,
  unit,
}: {
  title: string;
  items: Item[];
  unit: string;
}) {
  const max = Math.max(1, ...items.map(i => i.value));
  return (
    <div className="card">
      <b>{title}</b>
      {items.length === 0 ? (
        <p className="muted" style={{ marginBottom: 0 }}>
          No data yet.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0" }}>
          {items.map(i => (
            <li key={i.label} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={i.label}
                >
                  {i.label}
                </span>
                <b>{fmt(i.value)}</b>
              </div>
              <div
                style={{ height: 4, background: "#f3f4f6", borderRadius: 2 }}
                aria-hidden
              >
                <div
                  style={{
                    height: 4,
                    width: `${(i.value / max) * 100}%`,
                    background: "#f97316",
                    borderRadius: 2,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>
        {unit}
      </p>
    </div>
  );
}

export default function GoogleAnalytics() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [days, setDays] = useState(28);

  const load = useCallback(async (d: number) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/ga4?days=${d}`, { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Unable to load Google Analytics.");
      setData(j as Data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(days);
    }, 60_000);
    return () => clearInterval(id);
  }, [days, load]);

  const t = data?.totals;
  return (
    <div className="wrap" style={{ padding: "0 20px 24px", maxWidth: 1100 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <b>Google Analytics 4</b>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Live visitors refresh every minute ·{" "}
              {data?.period ?? `Last ${days} days`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[7, 28, 90].map(d => (
              <button
                key={d}
                type="button"
                className={"btn " + (days === d ? "btn-primary" : "btn-ghost")}
                onClick={() => setDays(d)}
                disabled={busy}
              >
                {d} days
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => load(days)}
              disabled={busy}
            >
              {busy ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
        {error && (
          <p role="alert" style={{ color: "#b91c1c", marginBottom: 0 }}>
            {error}
          </p>
        )}
        {data && (
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>
            Connected · Updated{" "}
            {new Date(data.checkedAt).toLocaleTimeString("en-PH")}
          </p>
        )}
      </div>

      {data && t && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div className="card">
              <div className="muted" style={{ fontSize: 13 }}>
                <span style={{ color: "#16a34a" }}>●</span> Active users right
                now
              </div>
              <div style={{ fontSize: 44, fontWeight: 800, marginTop: 4 }}>
                {fmt(data.realtime.activeUsers)}
              </div>
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                Last 30 minutes
              </p>
            </div>
            <List
              title="Live: pages being viewed"
              items={data.realtime.pages}
              unit="Active users"
            />
            <List
              title="Live: visitor countries"
              items={data.realtime.countries}
              unit="Active users"
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 12,
              marginBottom: 12,
            }}
          >
            {(
              [
                ["Users", fmt(t.users)],
                ["New users", fmt(t.newUsers)],
                ["Sessions", fmt(t.sessions)],
                ["Page views", fmt(t.pageviews)],
                ["Engagement rate", `${fmt(t.engagementRate)}%`],
                ["Avg. engagement / user", dur(t.avgEngagementSec)],
                ["Key events", fmt(t.conversions)],
              ] as const
            ).map(([label, value]) => (
              <div className="card" key={label}>
                <div className="muted" style={{ fontSize: 13 }}>
                  {label}
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <b>Daily trend</b>
            <div style={{ marginTop: 8 }}>
              <TrendChart daily={data.daily} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 12,
            }}
          >
            <List title="Top pages" items={data.topPages} unit="Page views" />
            <List
              title="Traffic sources"
              items={data.sources}
              unit="Sessions (source / medium)"
            />
            <List title="Countries" items={data.countries} unit="Users" />
            <List title="Devices" items={data.devices} unit="Sessions" />
          </div>
        </>
      )}

      {!data && !error && (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>
            Loading Google Analytics…
          </p>
        </div>
      )}
    </div>
  );
}
