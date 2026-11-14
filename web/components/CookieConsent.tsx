"use client";

import { useEffect, useState } from "react";

const KEY = "neas_cookie_consent_v1";
type Choice = { necessary: true; analytics: boolean; marketing: boolean; updatedAt: string; version: 1 };

function read(): Choice | null {
  try { return JSON.parse(localStorage.getItem(KEY) || "null") as Choice | null; } catch { return null; }
}
function store(analytics: boolean, marketing: boolean) {
  const value: Choice = { necessary: true, analytics, marketing, updatedAt: new Date().toISOString(), version: 1 };
  localStorage.setItem(KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("neas:consent-updated", { detail: value }));
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  useEffect(() => {
    const saved = read();
    setAnalytics(!!saved?.analytics);
    setMarketing(!!saved?.marketing);
    setShow(!saved);
    const open = () => { const choice = read(); setAnalytics(!!choice?.analytics); setMarketing(!!choice?.marketing); setCustom(true); setShow(true); };
    window.addEventListener("neas:open-cookie-preferences", open);
    return () => window.removeEventListener("neas:open-cookie-preferences", open);
  }, []);
  if (!show) return null;
  const reject = () => { store(false, false); setShow(false); };
  const accept = () => { store(true, true); setShow(false); };
  const save = () => { store(analytics, marketing); setShow(false); };
  return <div className="neas-cookie-layer" role="region" aria-label="Cookie preferences">
    <section className="neas-cookie-card" aria-labelledby="neas-cookie-title">
      <div className="neas-cookie-copy"><p className="neas-cookie-eyebrow">YOUR PRIVACY MATTERS</p><h2 id="neas-cookie-title">Your cookie choices</h2>
        <p>NEAS uses necessary technologies to operate this website. With your permission, we may also use analytics and marketing technologies. You can change your choices at any time.</p>
        <p className="neas-cookie-links"><a href="/cookie-policy">Cookie Policy</a><span>·</span><a href="/privacy-policy">Privacy Policy</a></p>
      </div>
      {custom && <div className="neas-cookie-options">
        <label><input type="checkbox" checked disabled/><span><b>Strictly necessary</b><small>Security, sessions and core website functions. Always active.</small></span></label>
        <label><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)}/><span><b>Analytics</b><small>Website measurement and performance insights.</small></span></label>
        <label><input type="checkbox" checked={marketing} onChange={e=>setMarketing(e.target.checked)}/><span><b>Marketing</b><small>Advertising and campaign measurement technologies.</small></span></label>
      </div>}
      <div className="neas-cookie-actions">{custom ? <><button className="neas-cookie-btn primary" onClick={save}>Save preferences</button><button className="neas-cookie-btn" onClick={reject}>Reject optional</button></> : <><button className="neas-cookie-btn primary" onClick={accept}>Accept all</button><button className="neas-cookie-btn" onClick={reject}>Reject optional</button><button className="neas-cookie-btn" onClick={()=>setCustom(true)}>Customize</button></>}</div>
    </section>
  </div>;
}
