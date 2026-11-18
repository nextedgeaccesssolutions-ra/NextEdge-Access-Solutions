"use client";

import { useEffect, useState } from "react";

const AGENT_ID = "agent_4401m7e4gjxfejwbvx9t4vgr8bth";

type MicState = "checking" | "unknown" | "ready" | "blocked" | "unsupported";

export default function ElevenLabsVoiceAgent() {
  const [micState, setMicState] = useState<MicState>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
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

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState("unsupported");
      setMessage("This browser does not support microphone access. Please use an up-to-date browser over HTTPS.");
    } else {
      navigator.permissions?.query({ name: "microphone" as PermissionName })
        .then((permission) => {
          if (!active) return;
          if (permission.state === "granted") setMicState("ready");
          else if (permission.state === "denied") {
            setMicState("blocked");
            setMessage("Microphone access is blocked in your browser. Allow it in the site settings, then try again.");
          } else setMicState("unknown");
          permission.onchange = () => {
            if (!active) return;
            setMicState(permission.state === "granted" ? "ready" : permission.state === "denied" ? "blocked" : "unknown");
          };
        })
        .catch(() => active && setMicState("unknown"));
    }
    return () => { active = false; };
  }, []);

  async function enableMicrophone() {
    setMessage("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicState("unsupported");
      setMessage("Microphone access is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState("ready");
      setMessage("Microphone is ready. Select “Start voice greeting” in the NEAS AI widget.");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      setMicState("blocked");
      setMessage(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Permission was denied. In Chrome, select the site icon beside the address → Site settings → Microphone → Allow, then reload this page."
          : name === "NotFoundError"
            ? "No microphone was found. Connect or enable a microphone, then try again."
            : "Microphone could not be started. Check your device and browser permissions, then try again."
      );
    }
  }

  return (
    <>
      <div id="neas-elevenlabs-widget-mount" />
      <aside
        aria-label="NEAS AI microphone access"
        style={{
          position: "fixed", left: 24, bottom: 24, zIndex: 9998,
          width: "min(330px, calc(100vw - 32px))", padding: 14,
          border: "1px solid #CA9332", borderRadius: 14,
          background: "#071D29", color: "#fff", boxShadow: "0 8px 28px rgba(0,0,0,.24)",
          fontFamily: "Inter, Arial, sans-serif"
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 14 }}>NEAS AI Sales Assistant</div>
        <div style={{ color: "#EBC07E", fontSize: 12, marginTop: 3 }}>Rope Access · Safety · Training · Equipment</div>
        <button
          type="button"
          onClick={enableMicrophone}
          style={{
            width: "100%", marginTop: 11, padding: "10px 12px", border: 0,
            borderRadius: 8, background: "#CA9332", color: "#071D29",
            fontWeight: 700, cursor: "pointer"
          }}
        >
          {micState === "ready" ? "Check microphone again" : "Enable microphone"}
        </button>
        {message && <p role="status" style={{ fontSize: 12, lineHeight: 1.5, margin: "9px 0 0", color: "#F5E7C9" }}>{message}</p>}
        {micState === "blocked" && (
          <p style={{ fontSize: 11, lineHeight: 1.45, margin: "7px 0 0", color: "#D7E2E8" }}>
            Microphone access cannot be switched on silently by a website. Your browser must approve it.
          </p>
        )}
      </aside>
    </>
  );
}
