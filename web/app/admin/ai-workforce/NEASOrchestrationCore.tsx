"use client";

import { useRef } from "react";
import NEASCommandVisual from "./NEASCommandVisual";
import NEASVoiceAssistant, { type NEASVoiceAssistantHandle } from "./NEASVoiceAssistant";

export default function NEASOrchestrationCore() {
  const voiceAssistantRef = useRef<NEASVoiceAssistantHandle>(null);
  const startVoice = () => {
    // Keep the command-center visual in place while toggling voice chat.
    // The voice engine renders no popup, modal, or replacement panel.
    voiceAssistantRef.current?.toggleConversation();
  };

  return (
    <>
      <NEASCommandVisual onOpenConsole={startVoice} />
      <NEASVoiceAssistant ref={voiceAssistantRef} />
    </>
  );
}
