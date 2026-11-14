"use client";

import { useEffect } from "react";

// Rybbit Cloud analytics. Loaded on every route only after the visitor grants
// analytics consent through the NEAS cookie preferences.
const SITE_ID = "35ba1640697f";
const SCRIPT_ID = "neas-rybbit";
const SCRIPT_SRC = `https://app.rybbit.io/api/script.js?siteId=${SITE_ID}`;
const CONSENT_KEY = "neas_cookie_consent_v1";

function analyticsAllowed(): boolean {
  try {
    const consent = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null");
    return !!consent?.analytics;
  } catch {
    return false;
  }
}

export default function AnalyticsLoader() {
  useEffect(() => {
    const inject = () => {
      if (!analyticsAllowed() || document.getElementById(SCRIPT_ID)) return;
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.defer = true;
      document.head.appendChild(script);
    };

    inject();
    window.addEventListener("neas:consent-updated", inject);
    return () => window.removeEventListener("neas:consent-updated", inject);
  }, []);

  return null;
}
