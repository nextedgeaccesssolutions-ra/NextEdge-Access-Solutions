"use client";

import { useCallback, useState } from "react";
import NEASCommandVisual from "./NEASCommandVisual";
import NEASVoiceAssistant from "./NEASVoiceAssistant";

export default function NEASOrchestrationCore() {
  const [consoleOpen, setConsoleOpen] = useState(false);
  const openConsole = useCallback(() => setConsoleOpen(true), []);
  const closeConsole = useCallback(() => setConsoleOpen(false), []);

  return (
    <>
      <NEASCommandVisual onOpenConsole={openConsole} />
      <NEASVoiceAssistant open={consoleOpen} onClose={closeConsole} />
    </>
  );
}
