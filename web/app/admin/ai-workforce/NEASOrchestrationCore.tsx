"use client";

import { useRef, useState } from "react";
import NEASCommandVisual from "./NEASCommandVisual";
import NEASVoiceAssistant, { type NEASVoiceAssistantHandle, type NEASVoiceStatus } from "./NEASVoiceAssistant";

export default function NEASOrchestrationCore() {
  const voiceAssistantRef = useRef<NEASVoiceAssistantHandle>(null);
  const [voiceStatus, setVoiceStatus] = useState<NEASVoiceStatus>("idle");
  const [voiceError, setVoiceError] = useState("");
  const [latestReply, setLatestReply] = useState("");
  const updateVoiceStatus = (status: NEASVoiceStatus, detail?: string) => {
    setVoiceStatus(status);
    setVoiceError(status === "error" ? (detail || "Voice service needs attention. Check microphone permission and AI provider configuration.") : "");
  };
  const startVoice = () => {
    setVoiceAssistantReply("");
    voiceAssistantRef.current?.toggleConversation();
  };
  const setVoiceAssistantReply = (value: string) => setLatestReply(value);

  return (
    <>
      <NEASCommandVisual onOpenConsole={startVoice} voiceStatus={voiceStatus} voiceError={voiceError} />
      {latestReply && (
        <section aria-live="polite" style={{ margin: "0 0 18px", padding: "16px 18px", border: "1px solid #8a6a32", borderRadius: 14, background: "#111923", color: "#f3ead8" }}>
          <div style={{ color: "#d7ad5f", fontSize: 10, letterSpacing: ".16em", marginBottom: 7 }}>NEAS AI · CEO RESPONSE</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{latestReply}</p>
        </section>
      )}
      <NEASVoiceAssistant ref={voiceAssistantRef} onStatusChange={updateVoiceStatus} onTranscript={setVoiceAssistantReply} />
    </>
  );
}
