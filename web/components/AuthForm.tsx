"use client";
import { useState } from "react";

export default function AuthForm({ portal, next }: { portal: "customer" | "admin"; next: string }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setErr(""); setBusy(true);
    const f = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, portal }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setErr(data.error || "Something went wrong. Please try again."); return; }
    location.href = data.role === "admin" && portal === "admin" ? "/admin" : next;
  }
  return (
    <div className="card" style={{ maxWidth: 440, margin: "0 auto" }}>
      {portal === "customer" && <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["login", "signup"] as const).map((m) => <button key={m} type="button" onClick={() => { setMode(m); setErr(""); }} className={"btn " + (mode === m ? "btn-primary" : "btn-ghost")} style={{ flex: 1 }}>{m === "login" ? "Log in" : "Create account"}</button>)}
      </div>}
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        {mode === "signup" && <>
          <label className="field">Full name / Company<input name="name" required maxLength={160} autoComplete="name" /></label>
          <label className="field">Mobile number<input name="phone" maxLength={40} autoComplete="tel" /></label>
        </>}
        <label className="field">Email<input name="email" type="email" required autoComplete="email" /></label>
        <label className="field">Password<input name="password" type="password" required minLength={mode === "signup" ? 8 : 1} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
        {mode === "signup" && <span className="muted" style={{ fontSize: 12 }}>At least 8 characters.</span>}
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? (portal === "admin" ? "Log in to Admin" : "Log in") : "Create account"}</button>
      </form>
    </div>
  );
}
