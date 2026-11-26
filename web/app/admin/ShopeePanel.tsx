"use client";
import { useEffect, useState } from "react";

type Status = {
  configured: boolean; connected: boolean; shopId: number; shopName: string; connectedAt: string;
  lastSync: string; lastResult: string; lastError: string;
};
type Row = {
  itemId: number; sku: string; shopeeName: string; shopeePrice: number | null; stock: number | null;
  storeName: string; storePrice: number | null; action: "update" | "same" | "variants" | "unmatched";
};
const peso = (n: number | null) => (n == null ? "—" : "₱" + Math.round(n).toLocaleString("en-PH"));
const RETURN_MSG: Record<string, string> = {
  connected: "Shopee shop connected.",
  missing_keys: "⚠ Shopee keys are not set yet (SHOPEE_PARTNER_ID / SHOPEE_PARTNER_KEY).",
  denied: "⚠ Shopee authorization was cancelled.",
  state: "⚠ The Shopee sign-in link expired. Click Connect again.",
  failed: "⚠ Shopee rejected the connection. Check the partner keys and try again.",
};
const LABEL: Record<Row["action"], string> = { update: "Price differs", same: "In sync", variants: "Has variations (edit in Shopee)", unmatched: "No store product with this SKU" };

export default function ShopeePanel() {
  const [s, setS] = useState<Status | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [notOnShopee, setNotOnShopee] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const r = new URLSearchParams(location.search).get("shopee");
    if (r && RETURN_MSG[r]) setMsg(RETURN_MSG[r]);
    fetch("/api/admin/shopee").then(r => r.json()).then(setS).catch(() => setMsg("⚠ Could not load Shopee status."));
  }, []);

  async function act(action: "preview" | "push" | "disconnect") {
    if (action === "disconnect" && !confirm("Disconnect the Shopee shop from this website?")) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/shopee", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Request failed");
      setS(d);
      if (action === "preview") { setRows(d.rows); setNotOnShopee(d.notOnShopee); setMsg(`Loaded ${d.rows.length} Shopee listings.`); }
      if (action === "push") { setMsg(`${d.updated} Shopee price(s) updated.${d.failed?.length ? ` ⚠ ${d.failed.length} failed.` : ""}`); setRows(null); }
      if (action === "disconnect") { setRows(null); setMsg("Shopee disconnected."); }
    } catch (e) { setMsg("⚠ " + (e instanceof Error ? e.message : "Error")); }
    finally { setBusy(false); }
  }

  const toUpdate = rows?.filter(r => r.action === "update").length ?? 0;
  return <div className="wrap" style={{ padding: "0 20px 30px" }}>
    <div className="eyebrow" style={{ marginTop: 10 }}>Marketplace</div>
    <h2 style={{ marginTop: 4 }}>Shopee shop</h2>
    <div className="card" style={{ maxWidth: 980 }}>
      {!s ? <p className="muted">Loading…</p> : !s.configured ? <>
        <p><b>Step 1 — Shopee Open Platform keys are not set.</b></p>
        <ol className="muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
          <li>Sign in at <a href="https://open.shopee.com" target="_blank" rel="noopener noreferrer">open.shopee.com</a> with your Shopee seller account and create an app (type: Seller In-house System).</li>
          <li>Set its redirect URL domain to <code>www.nextedge-access-solutions.com</code>.</li>
          <li>In Vercel → Project → Settings → Environment Variables add <code>SHOPEE_PARTNER_ID</code> and <code>SHOPEE_PARTNER_KEY</code> (Production), then redeploy.</li>
        </ol>
      </> : !s.connected ? <>
        <p>Keys are set. Connect your Shopee shop — you will sign in to Shopee Seller Centre and approve access.</p>
        <a className="btn btn-primary" href="/api/admin/shopee/connect">Connect Shopee shop</a>
      </> : <>
        <p><b>Connected:</b> {s.shopName || "Shopee shop"} (ID {s.shopId}) · since {new Date(s.connectedAt).toLocaleDateString("en-PH")}</p>
        <p className="muted" style={{ fontSize: 13 }}>Listings are matched to store products when the Shopee <b>SKU</b> equals the store <b>product code</b>. Pushing copies the website selling price to Shopee.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act("preview")}>{busy ? "Working…" : "1 · Load Shopee listings"}</button>
          <button type="button" className="btn btn-primary" disabled={busy || !toUpdate} onClick={() => act("push")}>2 · Push {toUpdate || ""} website price{toUpdate === 1 ? "" : "s"} to Shopee</button>
          <a className="btn btn-ghost" href="https://seller.shopee.ph" target="_blank" rel="noopener noreferrer">Open Seller Centre</a>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => act("disconnect")}>Disconnect</button>
        </div>
        {s.lastSync && <p className="muted" style={{ fontSize: 12 }}>Last push: {new Date(s.lastSync).toLocaleString("en-PH")} — {s.lastResult}</p>}
        {s.lastError && <p className="err" style={{ fontSize: 12 }}>Last error: {s.lastError}</p>}
      </>}
      {msg && <p className={msg.startsWith("⚠") ? "err" : "ok"} role="status" style={{ marginTop: 10 }}>{msg}</p>}
    </div>
    {rows && <div className="card" style={{ maxWidth: 980, marginTop: 16, overflowX: "auto" }}>
      <p className="muted" style={{ fontSize: 13 }}>{rows.length} Shopee listings · {toUpdate} with a different price · {notOnShopee} active store products not listed on Shopee.</p>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead><tr style={{ textAlign: "left" }}><th>SKU</th><th>Shopee listing</th><th>Stock</th><th>Shopee price</th><th>Website price</th><th>Status</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.itemId} style={{ borderTop: "1px solid var(--line, #e5e7eb)" }}>
          <td>{r.sku || "—"}</td><td>{r.shopeeName}</td><td>{r.stock ?? "—"}</td><td>{peso(r.shopeePrice)}</td><td>{peso(r.storePrice)}</td>
          <td style={{ fontWeight: r.action === "update" ? 700 : 400 }}>{LABEL[r.action]}</td>
        </tr>)}</tbody>
      </table>
    </div>}
  </div>;
}
