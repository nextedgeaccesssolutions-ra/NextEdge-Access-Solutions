"use client";

import { useRef, useState } from "react";
import NEASCommandVisual from "./NEASCommandVisual";
import NEASVoiceAssistant, { type NEASVoiceAssistantHandle, type NEASVoiceStatus } from "./NEASVoiceAssistant";

export default function NEASOrchestrationCore() {
  const voiceAssistantRef = useRef<NEASVoiceAssistantHandle>(null);
  const [voiceStatus, setVoiceStatus] = useState<NEASVoiceStatus>("idle");
  const [voiceError, setVoiceError] = useState("");
  const updateVoiceStatus = (status: NEASVoiceStatus, detail?: string) => {
    setVoiceStatus(status);
    setVoiceError(status === "error" ? (detail || "Voice service needs attention. Check microphone permission and AI provider configuration.") : "");
  };
  const startVoice = () => {
    // Keep the command-center visual in place while toggling voice chat.
    // The voice engine renders no popup, modal, or replacement panel.
    voiceAssistantRef.current?.toggleConversation();
  };

  return (
    <>
      <NEASCommandVisual onOpenConsole={startVoice} voiceStatus={voiceStatus} voiceError={voiceError} />
      <NEASVoiceAssistant ref={voiceAssistantRef} onStatusChange={updateVoiceStatus} />
    </>
  );
}
