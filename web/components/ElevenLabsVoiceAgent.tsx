"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const AGENT_ID = "agent_4401m7e4gjxfejwbvx9t4vgr8bth";

export default function ElevenLabsVoiceAgent() {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    if (isAdminRoute) return;

    const mount = document.getElementById("neas-elevenlabs-widget-mount");
    if (mount && !mount.querySelector("elevenlabs-convai")) {
      const widget = document.createElement("elevenlabs-convai");
      widget.setAttribute("agent-id", AGENT_ID);
      mount.appendChild(widget);
    }

    if (!document.querySelector('script[data-neas-elevenlabs-widget="true"]')) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@elevenlabs/convai-widget-embed";
      script.async = true;
      script.type = "text/javascript";
      script.dataset.neasElevenlabsWidget = "true";
      document.body.appendChild(script);
    }
  }, [isAdminRoute]);

  if (isAdminRoute) return null;

  // The voice assistant remains available on public pages. Microphone permission
  // is requested by the browser when a visitor starts a voice conversation;
  // no persistent microphone-permission panel is displayed.
  return <div id="neas-elevenlabs-widget-mount" />;
}
