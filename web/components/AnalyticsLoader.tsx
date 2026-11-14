"use client";

import { useEffect } from "react";

// Self-hosted Rybbit analytics (see the Rybbit deploy runbook).
// Renders nothing and loads nothing until BOTH are true:
//   1. NEXT_PUBLIC_RYBBIT_HOST and NEXT_PUBLIC_RYBBIT_SITE_ID are set at build time
//   2. the visitor's saved cookie choice has analytics consent
const HOST = process.env.NEXT_PUBLIC_RYBBIT_HOST;
const SITE_ID = process.env.NEXT_PUBLIC_RYBBIT_SITE_ID;
const CONSENT_KEY = "neas_cookie_consent_v1";
const SCRIPT_ID = "neas-rybbit";
// Rybbit's own opt-out flags, read once when its script loads.
const OPTOUT_KEY = "disable-rybbit";

declare global {
  interface Window { __RYBBIT_OPTOUT__?: boolean }
}

function analyticsAllowed(): boolean {
  try {
    const c = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
    return !!c?.analytics;
  } catch {
    return false;
  }
}

export default function AnalyticsLoader() {
  useEffect(() => {
    if (!HOST || !SITE_ID) return;
    const inject = () => {
      if (document.getElementById(SCRIPT_ID)) return;
      // Clear any earlier opt-out first: Rybbit reads these flags once, as it loads.
      try { localStorage.removeItem(OPTOUT_KEY); } catch { /* storage unavailable */ }
      window.__RYBBIT_OPTOUT__ = false;
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.defer = true;
      // siteId stays in the URL: script optimizers drop data-* attributes but keep the URL.
      s.src = `${HOST.replace(/\/$/, "")}/api/script.js?siteId=${encodeURIComponent(SITE_ID)}`;
      document.body.appendChild(s);
    };
    const stop = () => {
      // Withdrawal has to stop a tracker that is already running. Rybbit checks its
      // opt-out flags only when the script loads, so on a page that is already
      // tracking they do nothing until the next load - hence the reload, and only
      // when the script really was injected in this page view.
      try { localStorage.setItem(OPTOUT_KEY, "true"); } catch { /* storage unavailable */ }
      window.__RYBBIT_OPTOUT__ = true;
      const existing = document.getElementById(SCRIPT_ID);
      if (!existing) return;
      existing.remove();
      location.reload();
    };
    const sync = () => (analyticsAllowed() ? inject() : stop());
    sync();
    window.addEventListener("neas:consent-updated", sync);
    return () => window.removeEventListener("neas:consent-updated", sync);
  }, []);
  return null;
}
