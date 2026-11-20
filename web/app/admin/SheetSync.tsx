"use client";
import { useState } from "react";

type Cfg = {
  url: string;
  priceSource: "markup" | "sheet";
  hideMissing: boolean;
  lastSync: string;
  lastResult: string;
  lastAttempt?: string;
  lastError?: string;
  connectionStatus?: "connected" | "error" | "not-tested";
  autoSync?: boolean;
  lastAuto?: string;
};
type Row = { code: string; name: string; category: string; dealer: number; sell: number | null };
const peso = (n: number | null) => (n == null ? "—" : "₱" + Math.round(n).toLocaleString("en-PH"));

export default function SheetSync({ initial }: { initial: Cfg }) {
  const [cfg, setCfg] = useState(initial);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ rows: Row[]; total: number } | null>(null);
  const [previewHash, setPreviewHash] = useState("");
  const [csv, setCsv] = useState("");

  function invalidatePreview() {
    setPreview(null);
    setPreviewHash("");
  }

  async function call(action: string) {
    setBusy(true);
    setMsg("");
    try {
      const response = await fetch("/api/admin/sheet-sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          url: cfg.url,
          priceSource: cfg.priceSource,
          hideMissing: cfg.hideMissing,
          autoSync: cfg.autoSync !== false,
          csv: csv || undefined,
          sourceHash: action === "sync" ? previewHash : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 409) invalidatePreview();
        setMsg("⚠ " + (data.error || "Google Sheets request failed. Try again."));
        return;
      }
      if (action === "preview") {
        setPreview({ rows: data.preview, total: data.total });
        setPreviewHash(data.sourceHash);
        setCfg((current) => ({ ...current, connectionStatus: "connected", lastError: "" }));
        setMsg("Connected. Found " + data.total + " products. Review the preview before updating the store.");
      } else if (action === "save") {
        setMsg("Settings saved.");
      } else {
        setCfg(data.cfg);
        invalidatePreview();
        setCsv("");
        setMsg("Store updated — " + data.cfg.lastResult + ".");
        window.location.reload();
      }
    } catch {
      setMsg("⚠ Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="wrap" style={{ padding: "0 20px 30px" }}>
    <div className="eyebrow" style={{ marginTop: 10 }}>Product catalog</div>
    <h2 style={{ margin: "4px 0 12px" }}>Google Sheet price updater</h2>
    <div className="card" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 20, background: cfg.connectionStatus === "connected" ? "#16834a" : cfg.connectionStatus === "error" ? "#c0392b" : "#9a9a9a" }} />
        <strong style={{ fontSize: 13 }}>{cfg.connectionStatus === "connected" ? "Connection verified" : cfg.connectionStatus === "error" ? "Connection needs attention" : "Not tested yet"}</strong>
      </div>
      <label className="field">Google Sheet link (select the supplier worksheet tab containing item code, description and dealer price)
        <input className="input" type="url" value={cfg.url} onChange={(e) => { setCfg({ ...cfg, url: e.target.value }); invalidatePreview(); }} placeholder="https://docs.google.com/spreadsheets/d/…/edit?gid=…" />
        <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>Google Sheets → Share → General access → Anyone with the link · Viewer. The worksheet tab ID (gid) is read from your link.</span>
      </label>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", margin: "12px 0", fontSize: 14 }}>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="radio" checked={cfg.priceSource === "markup"} onChange={() => { setCfg({ ...cfg, priceSource: "markup" }); invalidatePreview(); }} /> Store price = Dealer price + markup</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="radio" checked={cfg.priceSource === "sheet"} onChange={() => { setCfg({ ...cfg, priceSource: "sheet" }); invalidatePreview(); }} /> Store price = sheet's Selling Price (VAT)</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={cfg.hideMissing} onChange={(e) => { setCfg({ ...cfg, hideMissing: e.target.checked }); invalidatePreview(); }} /> Hide store items no longer in the sheet</label>
        <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={cfg.autoSync !== false} onChange={(e) => setCfg({ ...cfg, autoSync: e.target.checked })} /> Update automatically every day{cfg.lastAuto ? <span className="muted"> · last auto {new Date(cfg.lastAuto).toLocaleString("en-PH")}</span> : null}</label>
      </div>
      <details style={{ marginBottom: 12 }}>
        <summary className="muted" style={{ cursor: "pointer", fontSize: 13 }}>Can't share the sheet publicly? Paste a CSV export instead</summary>
        <p className="muted" style={{ fontSize: 12 }}>Google Sheets → File → Download → Comma-separated values (.csv). Open the CSV, copy its contents and paste below.</p>
        <textarea className="input" rows={4} style={{ width: "100%" }} value={csv} onChange={(e) => { setCsv(e.target.value); invalidatePreview(); }} placeholder="Paste the selected worksheet CSV here…" />
      </details>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => call("preview")}>{busy ? "Working…" : "1 · Test connection & preview"}</button>
        <button type="button" className="btn btn-primary" disabled={busy || !preview || !previewHash} onClick={() => call("sync")}>2 · Update store</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => call("save")}>Save settings</button>
      </div>
      {msg && <p className={msg.startsWith("⚠") ? "err" : "ok"} role="status" style={{ marginTop: 10 }}>{msg}</p>}
      {cfg.lastSync && <p className="muted" style={{ fontSize: 12 }}>Last successful sync: {new Date(cfg.lastSync).toLocaleString("en-PH")} — {cfg.lastResult}</p>}
      {cfg.lastAttempt && <p className="muted" style={{ fontSize: 12 }}>Last connection attempt: {new Date(cfg.lastAttempt).toLocaleString("en-PH")}</p>}
      {cfg.lastError && <p className="err" role="status" style={{ fontSize: 12 }}>Last error: {cfg.lastError}</p>}
      {preview && <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table className="t"><thead><tr><th>Code</th><th>Item</th><th>Category</th><th>Dealer</th><th>Sheet sell (VAT)</th></tr></thead>
          <tbody>{preview.rows.map((row, i) => <tr key={row.code || row.name + i}><td>{row.code || "—"}</td><td>{row.name}</td><td>{row.category}</td><td>{peso(row.dealer)}</td><td>{peso(row.sell)}</td></tr>)}
            <tr><td colSpan={5} className="muted">Showing first {preview.rows.length} of {preview.total} products</td></tr>
          </tbody>
        </table>
      </div>}
    </div>
  </div>;
}
