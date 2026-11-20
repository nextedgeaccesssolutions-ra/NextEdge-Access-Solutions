"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

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
type Turn = { role: "user" | "assistant"; content: string };

const personas = [
  { id: "ceo", name: "CEO", title: "Chief Executive Officer", focus: "Lead as the NEAS chief executive. Prioritize strategy, profitable growth, client relationships, cash discipline, risk, governance and execution across rope access, renewables, offshore, onshore, power, training and global services." },
  { id: "caio", name: "CAIO", title: "Chief AI & Intelligence Officer", focus: "Act as the NEAS AI orchestration lead. Coordinate specialist thinking, break objectives into workstreams, identify dependencies, summarize decisions and route work to the right specialist. Never claim a specialist or external system actually executed work unless confirmed." },
  { id: "sales", name: "Sales & Business Development", title: "Commercial Specialist", focus: "Focus on lead qualification, account strategy, client outreach, proposals, tender positioning, pipeline conversion and profitable commercial growth." },
  { id: "rope-access", name: "Rope Access Technical", title: "Rope Access Specialist", focus: "Focus on industrial rope access, facade works, inspection, maintenance, rescue planning, IRATA-aligned practices, equipment and technical work packs. Flag competent-person review and applicable standards." },
  { id: "renewables", name: "Renewables & Wind", title: "Renewable Energy Specialist", focus: "Focus on wind turbine blade services, met mast, lidar, wind measurement, renewable project development, inspections, maintenance and asset-owner requirements." },
  { id: "offshore-power", name: "Offshore, Onshore & Power", title: "Energy & Industrial Specialist", focus: "Focus on offshore/onshore energy, power plants, industrial maintenance, NDT, welding, electrical works, cable pulling, access constraints and project delivery." },
  { id: "operations", name: "Project Operations", title: "Operations Specialist", focus: "Focus on project planning, mobilization, workforce deployment, procurement, logistics, schedule, productivity, quality and project reporting." },
  { id: "hseq", name: "HSEQ & Compliance", title: "HSEQ Specialist", focus: "Focus on health, safety, environment, quality, risk assessments, method statements, permits, audits, incident prevention and compliance. Never replace site-specific competent-person approval." },
  { id: "finance", name: "Finance & Cash Flow", title: "Finance Specialist", focus: "Focus on project costing, BOQ, margin, cash flow, working capital, billing, retention, tax and financial controls. State assumptions and distinguish estimates from verified figures." },
  { id: "marketing", name: "Marketing & Global Expansion", title: "Growth Specialist", focus: "Focus on SEO, digital marketing, brand positioning, international market research, content, campaign performance and expansion strategy." },
  { id: "training", name: "Training & Human Capital", title: "Training & Workforce Specialist", focus: "Focus on rope access, work-at-height, rescue, GWO and other training operations, competency, recruitment, workforce development and certification tracking." },
  { id: "ai-tech", name: "AI Technology & Automation", title: "Technology Specialist", focus: "Focus on NEAS software, AI agents, model routing, secure integrations, automation, data architecture, monitoring, deployment and technical troubleshooting." },
] as const;

export type NEASVoiceAssistantHandle = { startListening: () => void };

const NEASVoiceAssistant = forwardRef<NEASVoiceAssistantHandle, { open: boolean; onClose: () => void }>(
function NEASVoiceAssistant({ open, onClose }, ref) {
  const [persona, setPersona] = useState<string>("ceo");
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [reply, setReply] = useState("Good day. NEAS AI Orchestration Core is ready. Speak your instruction and I will coordinate the right specialist.");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const recognition = useRef<RecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const active = personas.find((item) => item.id === persona) ?? personas[0];

  useEffect(() => () => {
    recognition.current?.stop();
    audioRef.current?.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
  }, []);

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    setSpeaking(false);
  };

  const speak = async (value: string) => {
    stopAudio();
    try {
      const response = await fetch("/api/neas-voice-tts", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: value.slice(0, 1000) }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : "Natural AI voice is temporarily unavailable.");
      }
      const blob = await response.blob();
      if (!blob.size) throw new Error("The natural voice provider returned an empty audio file.");
      const audioUrl = URL.createObjectURL(blob);
      audioUrlRef.current = audioUrl;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
          audioRef.current = null;
        }
        setSpeaking(false);
      };
      audio.onerror = () => {
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
          audioRef.current = null;
        }
        setSpeaking(false);
        setError("Natural voice playback failed. Your written AI response is still available.");
      };
      await audio.play();
      setSpeaking(true);
    } catch (cause) {
      setSpeaking(false);
      setError(cause instanceof Error ? cause.message : "Natural AI voice generation failed. Your written response remains available.");
    }
  };

  const sendMessage = async (rawMessage: string) => {
    const prompt = rawMessage.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setError("");
    const nextHistory = [...history, { role: "user" as const, content: prompt }];
    try {
      const response = await fetch("/api/admin/ai-workforce", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "voiceChat", persona, message: prompt, history: history.slice(-8) }),
        signal: AbortSignal.timeout(55_000),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "NEAS AI could not answer this request.");
      const answer = String(data.reply || "").trim();
      if (!answer) throw new Error("The AI provider returned an empty response.");
      setHistory([...nextHistory, { role: "assistant" as const, content: answer }].slice(-16));
      setReply(answer);
      setModel(String(data.model || ""));
      setMessage("");
      speak(answer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The voice assistant request failed.");
    } finally {
      setBusy(false);
    }
  };

  const startListening = () => {
    setError("");
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Live microphone input is not supported in this browser. Type your message instead; spoken replies remain available.");
      return;
    }
    try {
      const instance = new Recognition();
      instance.lang = "en-PH";
      instance.interimResults = false;
      instance.maxAlternatives = 1;
      instance.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript) {
          setMessage(transcript);
          void sendMessage(transcript);
        }
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

  // Expose microphone start so the central NEAS AI tap can invoke it
  // synchronously inside the user's click gesture (before opening the panel).
  useImperativeHandle(ref, () => ({ startListening }), [startListening]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        onClose();
        recognition.current?.stop();
        stopAudio();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  const selectPersona = (value: string) => {
    setPersona(value);
    setHistory([]);
    setModel("");
    const selected = personas.find((item) => item.id === value) ?? personas[0];
    setReply(selected.name + " is ready. " + selected.title + ". Ask a question or give an instruction.");
    setError("");
    stopAudio();
  };

  if (!open) return null;

  const closeVoicePanel = () => {
    onClose();
    recognition.current?.stop();
    stopAudio();
  };

  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeVoicePanel();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: "max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom))", background: "rgba(0,0,0,.78)", backdropFilter: "blur(8px)" }}
    >
    <section id="neas-ai-voice-console" data-release="neas-voice-footer-purge-20261120" role="dialog" aria-modal="true" aria-label="NEAS AI Orchestration Core voice interface" style={{ position: "relative", width: "min(860px, 100%)", maxHeight: "min(92dvh, 900px)", overflowY: "auto", padding: "clamp(14px, 3vw, 20px)", border: "1px solid #ca933266", borderRadius: 18, background: "radial-gradient(circle at 85% 0%,#3a2a1644,transparent 35%),linear-gradient(135deg,#071d29,#101b25 68%,#211b11)", color: "#e7edf4", boxShadow: "0 18px 55px #0009" }}>
      <button type="button" onClick={closeVoicePanel} aria-label="Close NEAS AI voice session" style={{ position: "absolute", top: 12, right: 12, zIndex: 2, width: 34, height: 34, borderRadius: 99, border: "1px solid #ca933288", background: "#07111c", color: "#f2d6a2", fontSize: 20, cursor: "pointer" }}>×</button>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 12, marginTop: 34 }}>
        <div style={{ border: "1px solid #385166", borderRadius: 12, padding: 12, background: "#07111c" }}>
          <label htmlFor="neas-agent-persona" style={{ display: "block", color: "#ebc07e", fontSize: 10, letterSpacing: ".12em", marginBottom: 7 }}>SELECT YOUR AI AGENT</label>
          <select id="neas-agent-persona" value={persona} onChange={(event) => selectPersona(event.target.value)} style={{ width: "100%", borderRadius: 9, border: "1px solid #806536", padding: "11px 10px", background: "#132330", color: "#fff", fontWeight: 700 }}>
            <optgroup label="Executive leadership">
              {personas.slice(0, 2).map((item) => <option key={item.id} value={item.id}>{item.name} — {item.title}</option>)}
            </optgroup>
            <optgroup label="Specialist agents">
              {personas.slice(2).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </optgroup>
          </select>
          <div style={{ marginTop: 12, padding: 11, borderRadius: 10, background: "#ca933211", border: "1px solid #ca933244" }}>
            <div style={{ color: "#f0cf91", fontWeight: 800, fontSize: 13 }}>{active.name}</div>
            <div style={{ color: "#9aabba", fontSize: 10, marginTop: 3 }}>{active.title}</div>
            <div style={{ color: "#c4cdd5", fontSize: 11, lineHeight: 1.5, marginTop: 8 }}>{active.focus}</div>
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
            <span style={{ fontSize: 9, color: "#9ce0ba", border: "1px solid #4b967455", borderRadius: 99, padding: "4px 8px" }}>VOICE INPUT READY</span>
            <span style={{ fontSize: 9, color: "#ebc07e", border: "1px solid #ca933255", borderRadius: 99, padding: "4px 8px" }}>NATURAL VOICE OUTPUT</span>
          </div>
          <div style={{ color: "#9ce0ba", fontSize: 10, marginTop: 11 }}>Natural AI voice · OpenRouter Fish Audio · no robotic fallback</div>
        </div>

        <div style={{ minWidth: 0 }}>
          <div aria-live="polite" style={{ padding: 15, borderRadius: 12, background: "#07111c", border: "1px solid #263c4d", minHeight: 145, maxHeight: 290, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.65, fontSize: 13 }}>
            <div style={{ color: "#ebc07e", fontSize: 9, letterSpacing: ".13em", marginBottom: 7 }}>{active.name.toUpperCase()} · LIVE SESSION</div>
            {history.slice(-6).map((turn, index) => <div key={index + "-" + turn.role} style={{ margin: "8px 0", color: turn.role === "user" ? "#c5d6e2" : "#f3e6ce" }}><strong style={{ color: turn.role === "user" ? "#82b9d7" : "#ebc07e" }}>{turn.role === "user" ? "YOU" : active.name}: </strong>{turn.content}</div>)}
            {history.length === 0 ? reply : null}
            {busy ? <div style={{ color: "#ebc07e", marginTop: 8 }}> {active.name} is thinking…</div> : null}
          </div>
          <textarea aria-label="Message to selected NEAS AI agent" value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(message); } }} placeholder={"Talk to " + active.name + " or type your instruction…"} rows={2} style={{ display: "block", width: "100%", boxSizing: "border-box", marginTop: 10, resize: "vertical", borderRadius: 10, border: "1px solid #385166", background: "#07111c", color: "#f1f5f9", padding: 12, outlineColor: "#ca9332" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
            <button type="button" onClick={listening ? () => recognition.current?.stop() : startListening} disabled={busy} style={{ border: "1px solid #ca933288", background: listening ? "#6d2b2b" : "#ca933222", color: "#f2d6a2", borderRadius: 9, padding: "9px 13px", cursor: "pointer" }}>{listening ? "Stop microphone" : "Start talking"}</button>
            <button type="button" onClick={() => void sendMessage(message)} disabled={busy || !message.trim()} style={{ border: "1px solid #ca9332", background: "#ca9332", color: "#07111b", borderRadius: 9, padding: "9px 16px", fontWeight: 800, cursor: "pointer", opacity: busy || !message.trim() ? .55 : 1 }}>{busy ? "Thinking…" : "Send & speak"}</button>
            <button type="button" onClick={() => speak(reply)} disabled={busy || !reply} style={{ border: "1px solid #385166", background: "#ffffff08", color: "#d5e0e9", borderRadius: 9, padding: "9px 13px", cursor: "pointer" }}>Replay voice</button>
            <button type="button" onClick={stopAudio} disabled={!speaking} style={{ border: "1px solid #385166", background: "#ffffff08", color: "#d5e0e9", borderRadius: 9, padding: "9px 13px", cursor: "pointer" }}>Stop audio</button>
            <button type="button" onClick={() => { setHistory([]); setReply(active.name + " session cleared. How can I help?"); setMessage(""); setModel(""); stopAudio(); }} style={{ border: "1px solid #385166", background: "#ffffff08", color: "#d5e0e9", borderRadius: 9, padding: "9px 13px", cursor: "pointer" }}>New session</button>
          </div>
          {model ? <p style={{ color: "#7f9aab", fontSize: 10, margin: "8px 0 0" }}>AI engine: {model}</p> : null}
          {error ? <p role="alert" style={{ color: "#ffb3a9", fontSize: 12, margin: "9px 0 0" }}>{error}</p> : null}
        </div>
      </div>
    </section>
    </div>
  );
});

NEASVoiceAssistant.displayName = "NEASVoiceAssistant";

export default NEASVoiceAssistant;
