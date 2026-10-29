"use client";

import { useState } from "react";

export default function OrderActions({ id, status }: { id: number; status: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (status !== "awaiting_payment" && status !== "cancelled") return null;
  async function run(method: "PATCH" | "DELETE") {
    const message = method === "PATCH" ? "Cancel this order?" : "Delete this cancelled order from your history?";
    if (!confirm(message)) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/orders/${id}`, { method, headers: method === "PATCH" ? { "content-type": "application/json" } : undefined, body: method === "PATCH" ? JSON.stringify({ status: "cancelled" }) : undefined });
    if (!res.ok) { const data = await res.json().catch(() => ({})); setError(data.error || "Could not update this order."); setBusy(false); return; }
    location.reload();
  }
  return <div style={{ display: "grid", gap: 5, minWidth: 90 }}>
    {status === "awaiting_payment" && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run("PATCH")}>Cancel</button>}
    {status === "cancelled" && <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run("DELETE")}>Delete</button>}
    {error && <small className="err">{error}</small>}
  </div>;
}
