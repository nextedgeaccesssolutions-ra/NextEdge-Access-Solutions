"use client";

import { useRef } from "react";
import NEASCommandVisual from "./NEASCommandVisual";
import NEASVoiceAssistant, { type NEASVoiceAssistantHandle } from "./NEASVoiceAssistant";

export default function NEASOrchestrationCore() {
  const voiceAssistantRef = useRef<NEASVoiceAssistantHandle>(null);
  const startVoice = () => {
    // Start speech recognition directly from the user's tap.
    // The voice engine is headless; no popup or modal is rendered.
    voiceAssistantRef.current?.startListening();
  };

  return (
    <>
      <NEASCommandVisual onOpenConsole={startVoice} />
      <NEASVoiceAssistant ref={voiceAssistantRef} />
    </>
  );
}
