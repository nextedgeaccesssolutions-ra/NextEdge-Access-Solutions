"use client";
import { useState } from "react";

export default function ResetForm({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [role, setRole] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setErr("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const p = String(f.get("password"));
    const p2 = String(f.get("password2"));
    if (p !== p2) {
      setErr("The two passwords don't match.");
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password: p }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(typeof data.error === "string"
          ? data.error
          : "We could not reset your password. Please try again.");
        return;
      }
      setRole(typeof data.role === "string" ? data.role : "customer");
    } catch {
      setErr("Unable to reach the password reset service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (role) return <div className="card"><h3 style={{ marginTop: 0 }}>Password changed ✓</h3><p>You can now log in with your new password.</p><a className="btn btn-primary" href={role === "admin" ? "/admin/login" : "/login"}>Log in</a></div>;

  return <form className="card" onSubmit={submit} style={{ display: "grid", gap: 12 }}>
    <label className="field">New password<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
    <label className="field">Repeat new password<input name="password2" type="password" required minLength={8} autoComplete="new-password" /></label>
    <span className="muted" style={{ fontSize: 12 }}>At least 8 characters.</span>
    {err && <span className="err" role="alert" aria-live="polite">{err} {err.includes("Request") && <a href="/forgot-password">Request a new link</a>}</span>}
    <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
  </form>;
}
