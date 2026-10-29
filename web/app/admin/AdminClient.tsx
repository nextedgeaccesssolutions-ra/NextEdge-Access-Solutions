"use client";
import { useState } from "react";

type Prod = { id: string; category: string; code: string; name: string; dealer_price: number; price_override: number | null; active: boolean; price: number };
type Order = { id: number; reference: string; status: string; total: number; created_at: string; email: string; customer: string; delivery: string; notes: string; items: { name: string; code: string; quantity: number; unit_price: number }[] };
type Cust = { id: number; name: string; email: string; phone: string; created_at: string; orders: number };
const peso = (n: number) => "₱" + Math.round(n).toLocaleString("en-PH");
const STATUSES = [["awaiting_payment", "Awaiting payment"], ["paid", "Paid"], ["processing", "Processing"], ["shipped", "Shipped"], ["completed", "Completed"], ["cancelled", "Cancelled"]];
const sell = (d: number, o: number | null, m: number) => (o != null ? o : Math.ceil((d * (1 + m / 100)) / 5) * 5);

async function api(url: string, method: string, body: unknown) {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Save failed");
}

export default function AdminClient(props: { markup: number; products: Prod[]; orders: Order[]; customers: Cust[] }) {
  const [tab, setTab] = useState<"orders" | "products" | "customers">("orders");
  const [markup, setMarkup] = useState(props.markup);
  const [products, setProducts] = useState(props.products);
  const [orders, setOrders] = useState(props.orders);
  const [msg, setMsg] = useState(""); const [q, setQ] = useState("");
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };
  const pending = orders.filter((o) => o.status === "awaiting_payment").length;

  async function saveMarkup() { try { await api("/api/admin/settings", "PUT", { markupPercent: markup }); flash("Markup saved ✓"); } catch (e) { flash((e as Error).message); } }
  async function savePrice(p: Prod, raw: string) {
    const v = raw.trim() === "" ? null : Number(raw.replace(/[₱,\s]/g, ""));
    if (v !== null && !Number.isFinite(v)) return flash("Not a number");
    try { await api(`/api/admin/products/${p.id}`, "PATCH", { priceOverride: v }); setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, price_override: v } : x))); flash("Price saved ✓"); } catch (e) { flash((e as Error).message); }
  }
  async function toggle(p: Prod) { try { await api(`/api/admin/products/${p.id}`, "PATCH", { active: !p.active }); setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x))); } catch (e) { flash((e as Error).message); } }
  async function setStatus(o: Order, status: string) { try { await api(`/api/admin/orders/${o.id}`, "PATCH", { status }); setOrders((os) => os.map((x) => (x.id === o.id ? { ...x, status } : x))); flash(`${o.reference} → ${status.replace("_", " ")}`); } catch (e) { flash((e as Error).message); } }

  return <div className="wrap" style={{ padding: "34px 20px" }}>
    <div className="eyebrow">Admin control panel</div><h1>NEAS Store Admin</h1>
    <div style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
      {([["orders", `Orders (${pending} awaiting payment)`], ["products", "Products & prices"], ["customers", `Customers (${props.customers.length})`]] as const).map(([k, l]) => <button key={k} type="button" className={"btn " + (tab === k ? "btn-primary" : "btn-ghost")} onClick={() => setTab(k)}>{l}</button>)}
      {msg && <span className="ok" role="status" style={{ alignSelf: "center" }}>{msg}</span>}
    </div>

    {tab === "orders" && <div className="card" style={{ overflowX: "auto" }}>
      {!orders.length ? <p className="muted">No orders yet.</p> : <table className="t"><thead><tr><th>Reference</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>
        {orders.map((o) => <tr key={o.id}><td><b>{o.reference}</b></td><td>{new Date(o.created_at).toLocaleString("en-PH")}</td>
          <td style={{ fontSize: 13 }}><b>{o.customer}</b><br />{o.email}<br /><span className="muted">{o.delivery}</span>{o.notes && <><br /><i>{o.notes}</i></>}</td>
          <td style={{ fontSize: 13 }}>{o.items.map((i, k) => <div key={k}>{i.quantity} × {i.name} @ {peso(i.unit_price)}</div>)}</td>
          <td><b>{peso(o.total)}</b></td>
          <td><select className="input" value={o.status} onChange={(e) => setStatus(o, e.target.value)} aria-label={"Status of " + o.reference}>{STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td></tr>)}
      </tbody></table>}
    </div>}

    {tab === "products" && <div className="card" style={{ overflowX: "auto" }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 14, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: 12 }}>
        <b>Markup on dealer price</b>
        <input className="input" type="number" min={0} max={500} value={markup} onChange={(e) => setMarkup(Number(e.target.value))} style={{ width: 90 }} aria-label="Markup percent" /> %
        <button type="button" className="btn btn-primary" onClick={saveMarkup}>Save markup</button>
        <span className="muted" style={{ fontSize: 13 }}>Applies to every item without its own price. Prices round up to the nearest ₱5.</span>
      </div>
      <input className="input" placeholder="Filter products…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
      <table className="t"><thead><tr><th>Item</th><th>Dealer</th><th>Selling price</th><th>Own price (override)</th><th>Shown</th></tr></thead><tbody>
        {products.filter((p) => !q || (p.name + p.code + p.category).toLowerCase().includes(q.toLowerCase())).map((p) => <tr key={p.id} style={{ opacity: p.active ? 1 : 0.5 }}>
          <td><b>{p.name}</b><br /><span className="muted" style={{ fontSize: 12 }}>{p.category}{p.code && " · " + p.code}</span></td>
          <td>{peso(p.dealer_price)}</td>
          <td><b>{peso(sell(p.dealer_price, p.price_override, markup))}</b>{p.price_override != null && <span className="badge" style={{ marginLeft: 6 }}>custom</span>}</td>
          <td><input className="input" style={{ width: 120 }} placeholder="auto" defaultValue={p.price_override ?? ""} onBlur={(e) => { const v = e.target.value; if (v !== String(p.price_override ?? "")) savePrice(p, v); }} aria-label={"Own price for " + p.name} /></td>
          <td><input type="checkbox" checked={p.active} onChange={() => toggle(p)} aria-label={"Show " + p.name + " in store"} /></td></tr>)}
      </tbody></table>
    </div>}

    {tab === "customers" && <div className="card" style={{ overflowX: "auto" }}>
      {!props.customers.length ? <p className="muted">No customer accounts yet.</p> : <table className="t"><thead><tr><th>Name</th><th>Email</th><th>Mobile</th><th>Joined</th><th>Orders</th></tr></thead><tbody>
        {props.customers.map((c) => <tr key={c.id}><td>{c.name}</td><td>{c.email}</td><td>{c.phone}</td><td>{new Date(c.created_at).toLocaleDateString("en-PH")}</td><td>{c.orders}</td></tr>)}
      </tbody></table>}
    </div>}
  </div>;
}
