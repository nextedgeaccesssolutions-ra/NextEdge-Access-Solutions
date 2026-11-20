"use client";

import { useCallback, useRef, useState } from "react";
import NEASCommandVisual from "./NEASCommandVisual";
import NEASVoiceAssistant, { type NEASVoiceAssistantHandle } from "./NEASVoiceAssistant";

export default function NEASOrchestrationCore() {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const voiceAssistantRef = useRef<NEASVoiceAssistantHandle>(null);
  const openConsole = useCallback(() => {
    // Start recognition in the actual tap event so browser user-activation
    // requirements are respected; then reveal the voice console.
    voiceAssistantRef.current?.startListening();
    setConsoleOpen(true);
  }, []);
  const closeConsole = useCallback(() => setConsoleOpen(false), []);

  return (
    <>
      <NEASCommandVisual onOpenConsole={openConsole} />
      <NEASVoiceAssistant ref={voiceAssistantRef} open={consoleOpen} onClose={closeConsole} />
    </>
  );
}
