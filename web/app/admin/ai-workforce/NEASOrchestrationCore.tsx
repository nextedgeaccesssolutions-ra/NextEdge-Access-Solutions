"use client";

import NEASCommandVisual from "./NEASCommandVisual";

/**
 * The executive command-center visual remains available on the admin page.
 * The legacy modal voice console is intentionally not mounted; this prevents
 * the removed SELECT YOUR AI AGENT / LIVE SESSION overlay from reappearing.
 */
export default function NEASOrchestrationCore() {
  return <NEASCommandVisual onOpenConsole={() => undefined} />;
}
