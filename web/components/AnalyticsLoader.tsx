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
      if (!analyticsAllowed() || document.getElementById(SCRIPT_ID)) return;
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.defer = true;
      // siteId stays in the URL: script optimizers drop data-* attributes but keep the URL.
      s.src = `${HOST.replace(/\/$/, "")}/api/script.js?siteId=${encodeURIComponent(SITE_ID)}`;
      document.body.appendChild(s);
    };
    inject();
    window.addEventListener("neas:consent-updated", inject);
    return () => window.removeEventListener("neas:consent-updated", inject);
  }, []);
  return null;
}
