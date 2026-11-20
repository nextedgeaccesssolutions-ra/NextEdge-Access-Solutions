"use client";

import { useEffect, useState } from "react";

type Consent = { necessary: true; analytics: boolean; marketing: boolean; updatedAt: string; version: 1 };
const KEY = "neas_cookie_consent_v1";

export default function CookiePreferencesPanel() {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || "null") as Consent | null;
      if (value) { setAnalytics(value.analytics); setMarketing(value.marketing); setUpdatedAt(value.updatedAt); }
    } catch { /* Ignore invalid browser storage and use privacy-protective defaults. */ }
  }, []);

  const save = () => {
    const value: Consent = { necessary: true, analytics, marketing, updatedAt: new Date().toISOString(), version: 1 };
    localStorage.setItem(KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("neas:consent-updated", { detail: value }));
    setUpdatedAt(value.updatedAt);
    setSaved(true);
  };
  const withdraw = () => { const value: Consent = { necessary: true, analytics: false, marketing: false, updatedAt: new Date().toISOString(), version: 1 }; localStorage.setItem(KEY, JSON.stringify(value)); window.dispatchEvent(new CustomEvent("neas:consent-updated", { detail: value })); setAnalytics(false); setMarketing(false); setUpdatedAt(value.updatedAt); setSaved(true); };

  return <div className="wrap" style={{ maxWidth: 860, paddingTop: 42, paddingBottom: 30 }}>
    <div className="eyebrow">Privacy controls</div>
    <h1>Cookie Preferences</h1>
    <p className="muted">Choose which optional technologies NEAS may use on this browser. Strictly necessary technologies remain active because they support security and core website functions.</p>
    <section className="card" style={{ display: "grid", gap: 18, marginTop: 24 }}>
      <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><input type="checkbox" checked disabled /><span><b>Strictly necessary</b><br/><small>Always active — security, navigation, session and essential website functionality.</small></span></label>
      <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><input type="checkbox" checked={analytics} onChange={e => { setAnalytics(e.target.checked); setSaved(false); }} /><span><b>Analytics</b><br/><small>Website measurement and performance insights, such as Google Analytics 4, only when configured and consented to.</small></span></label>
      <label style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><input type="checkbox" checked={marketing} onChange={e => { setMarketing(e.target.checked); setSaved(false); }} /><span><b>Marketing</b><br/><small>Advertising pixels and campaign measurement, only when configured and consented to.</small></span></label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <button className="btn btn-primary" type="button" onClick={save}>Save preferences</button>
        <button className="btn btn-ghost" type="button" onClick={withdraw}>Withdraw optional consent</button>
      </div>
      {saved && <p className="ok" role="status">Your browser preferences have been updated.</p>}
      {updatedAt && <small className="muted">Last saved: {new Date(updatedAt).toLocaleString()}</small>}
      <small className="muted">Your choices are stored locally in this browser. Clearing browser storage or using another device may reset your preferences.</small>
    </section>
    <p style={{ marginTop: 20 }}><a href="/cookie-policy">Read the NEAS Cookie Policy</a> · <a href="/privacy-policy">Read the Privacy Policy</a></p>
  </div>;
}
