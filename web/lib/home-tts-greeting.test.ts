import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const homepage = readFileSync(new URL("../site/home.html", import.meta.url), "utf8");

function greetingScript() {
  const start = homepage.indexOf("var _elAudio=null,_elPlaying=false,_elGreetingPending=true");
  const end = homepage.indexOf("if(spk){spk.style.display='block'", start);
  if (start < 0 || end < 0) throw new Error("Homepage greeting script was not found");
  return homepage.slice(start, end);
}

describe("homepage ElevenLabs welcome greeting retries", () => {
  it("allows only one interaction retry after a failed request and blocks duplicate in-flight calls", async () => {
    let requests = 0;
    const listeners = new Map<string, (event?: unknown) => void>();
    const context = {
      MSGS: [{ content: "Welcome to NEAS." }],
      spk: { style: {} },
      document: {
        addEventListener: (name: string, handler: (event?: unknown) => void) => listeners.set(name, handler),
        removeEventListener: (name: string, handler: (event?: unknown) => void) => {
          if (listeners.get(name) === handler) listeners.delete(name);
        },
      },
      fetch: () => {
        requests += 1;
        return Promise.reject(new Error("quota_exceeded"));
      },
    };

    runInNewContext(greetingScript(), context);
    const firstInteraction = listeners.get("pointerdown");
    firstInteraction?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requests).toBe(1);

    listeners.get("pointerdown")?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requests).toBe(2);
    expect(listeners.size).toBe(0);

    firstInteraction?.();
    listeners.get("keydown")?.();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(requests).toBe(2);
  });
});
