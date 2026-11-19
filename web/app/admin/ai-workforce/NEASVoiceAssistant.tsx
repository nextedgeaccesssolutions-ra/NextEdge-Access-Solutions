"use client";

import { useEffect, useRef, useState } from "react";

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => RecognitionInstance;
  webkitSpeechRecognition?: new () => RecognitionInstance;
};

export default function NEASVoiceAssistant() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("Good day. I’m NEAS AI. Ask me about sales, projects, rope access, renewables, operations or your AI workforce.");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const recognition = useRef<RecognitionInstance | null>(null);

  useEffect(() => () => {
    recognition.current?.stop();
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 3500));
    utterance.lang = "en-PH";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    setError("");
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice input is not supported in this browser. Type your message instead; spoken replies are still available.");
      return;
    }
    try {
      const instance = new Recognition();
      instance.lang = "en-PH";
      instance.interimResults = false;
      instance.maxAlternatives = 1;
      instance.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript) setMessage(transcript);
      };
      instance.onerror = (event) => setError(event.error === "not-allowed" ? "Microphone permission is blocked. Allow microphone access for this website in your browser settings." : "Voice recognition stopped: " + event.error);
      instance.onend = () => setListening(false);
      recognition.current = instance;
      setListening(true);
      instance.start();
    } catch {
      setListening(false);
      setError("Could not start the microphone. Check browser permission and try again.");
    }
  };

  const send = async () => {
    const prompt = message.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/ai-workforce", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "voiceChat", message: prompt }),
        signal: AbortSignal.timeout(55_000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "NEAS AI could not answer this request.");
      const answer = String(data.reply || "").trim();
      if (!answer) throw new Error("The AI provider returned an empty response.");
      setReply(answer);
      setMessage("");
      speak(answer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The voice assistant request failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="NEAS talking AI assistant" style={{ margin: "18px 0", padding: 20, border: "1px solid #ca933255", borderRadius: 16, background: "linear-gradient(135deg,#0b1c2b,#101b25 65%,#211b11)", color: "#e7edf4" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#ebc07e", fontSize: 10, letterSpacing: ".18em", fontWeight: 700 }}>NEAS AI · VOICE CONSOLE</div>
          <h2 style={{ fontSize: 20, margin: "4px 0" }}>Talk to your AI workforce</h2>
          <p style={{ color: "#9aabba", fontSize: 12, margin: 0 }}>Speak or type. NEAS AI responds with spoken audio using your browser’s built-in voice.</p>
        </div>
        <span style={{ border: "1px solid #4b967455", color: "#9ce0ba", borderRadius: 99, padding: "5px 10px", fontSize: 10 }}>● Admin session protected</span>
      </div>
      <div aria-live="polite" style={{ marginTop: 16, padding: 15, borderRadius: 12, background: "#07111c", border: "1px solid #263c4d", minHeight: 88, whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: 13 }}>{reply}</div>
      <textarea aria-label="Message to NEAS AI" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Ask NEAS AI anything about your business or operations…" rows={2} style={{ display: "block", width: "100%", marginTop: 12, resize: "vertical", borderRadius: 10, border: "1px solid #385166", background: "#07111c", color: "#f1f5f9", padding: 12, outlineColor: "#ca9332" }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={listening ? () => recognition.current?.stop() : startListening} disabled={busy} style={{ border: "1px solid #ca933288", background: listening ? "#6d2b2b" : "#ca933222", color: "#f2d6a2", borderRadius: 9, padding: "9px 13px", cursor: "pointer" }}>{listening ? "■ Stop listening" : "🎙 Start microphone"}</button>
        <button type="button" onClick={() => void send()} disabled={busy || !message.trim()} style={{ border: "1px solid #ca9332", background: "#ca9332", color: "#07111b", borderRadius: 9, padding: "9px 16px", fontWeight: 700, cursor: "pointer", opacity: busy || !message.trim() ? .55 : 1 }}>{busy ? "Thinking…" : "Send & speak"}</button>
        <button type="button" onClick={() => speak(reply)} disabled={busy || !reply} style={{ border: "1px solid #385166", background: "#ffffff08", color: "#d5e0e9", borderRadius: 9, padding: "9px 13px", cursor: "pointer" }}>▶ Replay voice</button>
      </div>
      {error ? <p role="alert" style={{ color: "#ffb3a9", fontSize: 12, margin: "10px 0 0" }}>{error}</p> : null}
      <p style={{ color: "#71869a", fontSize: 10, margin: "12px 0 0" }}>Microphone access starts only after you press the button. Voice recognition depends on browser support and may be processed by your browser provider. API credentials remain server-side.</p>
    </section>
  );
}
