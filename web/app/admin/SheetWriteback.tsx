"use client";
import { useState } from "react";

type Status = {
  lastSync: string; lastResult: string; lastError: string;
  connectionStatus: "connected" | "error" | "not-configured";
};

export default function SheetWriteback({ initial }: { initial: Status }) {
  const [status, setStatus] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sync() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/sheet-writeback", { method: "POST" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Google Sheets export failed.");
      setMessage(data.result || "Website catalog exported.");
      setStatus({ ...status, connectionStatus: "connected", lastSync: new Date().toISOString(), lastResult: data.result || "Website catalog exported.", lastError: "" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unexpected export error.";
      setMessage("⚠ " + detail);
      setStatus({ ...status, connectionStatus: "error", lastError: detail });
    } finally { setBusy(false); }
  }

  return <section className="card" style={{ maxWidth: 900, margin: "16px 20px 28px", padding: 18 }}>
    <div className="eyebrow">Website → Google Sheets</div>
    <h2 style={{ margin: "4px 0 8px" }}>NEAS Website Catalog export</h2>
    <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
      Sends the live website catalog to the separate <b>NEAS Website Catalog</b> tab. The supplier worksheet is not modified. Products are matched by SKU, with Product ID as the fallback; inactive items are retained and marked inactive.
    </p>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "12px 0" }}>
      <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 20, background: status.connectionStatus === "connected" ? "#16834a" : status.connectionStatus === "error" ? "#c0392b" : "#9a9a9a" }} />
      <strong style={{ fontSize: 13 }}>{status.connectionStatus === "connected" ? "Last export successful" : status.connectionStatus === "error" ? "Export needs attention" : "Awaiting Apps Script setup"}</strong>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={sync}>{busy ? "Exporting…" : "Sync website catalog now"}</button>
    </div>
    {message && <p className={message.startsWith("⚠") ? "err" : "ok"} role="status">{message}</p>}
    {status.lastSync && <p className="muted" style={{ fontSize: 12 }}>Last export: {new Date(status.lastSync).toLocaleString("en-PH")} — {status.lastResult}</p>}
    {status.lastError && <p className="err" style={{ fontSize: 12 }}>Last error: {status.lastError}</p>}
    <p className="muted" style={{ fontSize: 12 }}>Automatic export runs with the existing daily production cron after the supplier-sheet import, once server environment variables are configured.</p>
  </section>;
}
