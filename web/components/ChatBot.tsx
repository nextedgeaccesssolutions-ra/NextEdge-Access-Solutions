"use client";
import { useState, useRef, useEffect, useCallback } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content: "👋 Hello! I'm the NEAS AI Sales Assistant — your direct line to NextEdge Access Solutions.\n\nI can help you with:\n• Rope access services & quotes\n• IRATA/SPRAT training programs\n• Height safety equipment & PPE\n• Wind turbine & facade maintenance\n• Project consultations\n\nOr connect you directly with our team. How can I assist you today?",
};

const PHONE_PRIMARY = "+63 991 426 5886";
const PHONE_SECONDARY = "+63 995 7708 144";
const WHATSAPP_NUMBER = "639914265886";
const EMAIL = "sales@nextedge-access-solutions.com";

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [sent, setSent] = useState(false);
  const [unread, setUnread] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [showCallPanel, setShowCallPanel] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  useEffect(() => { setVoiceSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window); }, []);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (open) {
      setUnread(false);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, msgs]);

  // Stop speech when chat closes
  useEffect(() => {
    if (!open && speaking) {
      window.speechSynthesis?.cancel();
      setSpeaking(false);
    }
  }, [open, speaking]);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*_#`]/g, "").replace(/\n+/g, ". ");
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 0.95;
    utter.pitch = 1.05;
    utter.volume = 1;
    // Pick a good English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
      || voices.find(v => v.lang.startsWith("en"))
      || voices[0];
    if (preferred) utter.voice = preferred;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synthRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, []);

  const stopSpeaking = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const startListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const r = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: newMsgs.slice(-10) }),
      });
      const j = await r.json();
      const reply =
        j.reply ||
        `I'm here to help! For immediate assistance, call us at ${PHONE_PRIMARY} or WhatsApp us. Our team is ready to assist you.`;
      setMsgs([...newMsgs, { role: "assistant", content: reply }]);
      if (!open) setUnread(true);
      if (newMsgs.filter((m) => m.role === "user").length >= 2) setShowContact(true);
    } catch {
      setMsgs([
        ...newMsgs,
        {
          role: "assistant",
          content: `Connection issue. Please contact us directly:\n📞 ${PHONE_PRIMARY}\n📧 ${EMAIL}`,
        },
      ]);
    }
    setLoading(false);
  }

  async function sendInquiry() {
    if (!contact.name && !contact.email && !contact.phone) return;
    setLoading(true);
    try {
      const r = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sendInquiry: true, messages: msgs.slice(-20), ...contact }),
      });
      if (r.ok) setSent(true);
      else {
        const j = await r.json().catch(() => ({}));
        setMsgs((m) => [...m, { role: "assistant", content: `${j.error || "Your inquiry could not be sent."} You can also call ${PHONE_PRIMARY} or email ${EMAIL}.` }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: `Connection issue. Please call ${PHONE_PRIMARY} or email ${EMAIL}.` }]);
    }
    setLoading(false);
  }


  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open NEAS chat"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          width: 60, height: 60, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#f97316,#ea580c)",
          boxShadow: "0 4px 24px rgba(249,115,22,.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform .2s, box-shadow .2s",
          animation: open ? "none" : "chatPulse 2.5s ease-in-out infinite",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
            <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z" />
          </svg>
        )}
        {unread && !open && (
          <span style={{ position: "absolute", top: 2, right: 2, width: 13, height: 13, background: "#ef4444", borderRadius: "50%", border: "2px solid #fff" }} />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 24, zIndex: 998,
          width: 370, maxWidth: "calc(100vw - 48px)",
          background: "#fff", borderRadius: 18,
          boxShadow: "0 24px 64px rgba(0,0,0,.18)",
          border: "1px solid #e2e8f0",
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "chatSlideUp .25s ease",
        }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "linear-gradient(135deg,rgba(249,115,22,.3),rgba(249,115,22,.1))",
                border: "2px solid rgba(249,115,22,.4)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>🤖</div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: ".01em" }}>NEAS AI Sales Assistant</div>
                <div style={{ color: "#94a3b8", fontSize: 11 }}>Rope Access · Safety · Training · Equipment</div>
              </div>
              {/* Call button in header */}
              <button
                onClick={() => setShowCallPanel(v => !v)}
                title="Contact options"
                style={{
                  background: showCallPanel ? "rgba(249,115,22,.3)" : "rgba(255,255,255,.1)",
                  border: "1px solid rgba(255,255,255,.15)",
                  borderRadius: 8, padding: "6px 10px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 5, color: "#fff",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
                <span style={{ fontSize: 11, fontWeight: 600 }}>Call</span>
              </button>
              <div style={{ width: 8, height: 8, background: "#22c55e", borderRadius: "50%", marginLeft: 4 }} title="Online" />
            </div>

            {/* Call panel */}
            {showCallPanel && (
              <div style={{
                marginTop: 12, padding: "12px", background: "rgba(255,255,255,.07)",
                borderRadius: 10, border: "1px solid rgba(255,255,255,.1)",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 2 }}>
                  Direct Contact
                </div>
                {/* Phone call buttons */}
                <a href={`tel:${PHONE_PRIMARY.replace(/\s/g, "")}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)",
                    borderRadius: 8, cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 16 }}>📞</span>
                    <div>
                      <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>Call Now</div>
                      <div style={{ color: "#86efac", fontSize: 11 }}>{PHONE_PRIMARY}</div>
                    </div>
                    <div style={{ marginLeft: "auto", color: "#86efac", fontSize: 10, fontWeight: 600 }}>TAP TO CALL</div>
                  </div>
                </a>
                <a href={`tel:${PHONE_SECONDARY.replace(/\s/g, "")}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)",
                    borderRadius: 8, cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 16 }}>📱</span>
                    <div>
                      <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Alternate Line</div>
                      <div style={{ color: "#86efac", fontSize: 11 }}>{PHONE_SECONDARY}</div>
                    </div>
                  </div>
                </a>
                {/* WhatsApp button */}
                <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hello%2C%20I%20am%20interested%20in%20NEAS%20services.`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    background: "rgba(37,211,102,.15)", border: "1px solid rgba(37,211,102,.3)",
                    borderRadius: 8, cursor: "pointer",
                  }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    <div>
                      <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>WhatsApp</div>
                      <div style={{ color: "#86efac", fontSize: 11 }}>Chat instantly</div>
                    </div>
                    <div style={{ marginLeft: "auto", color: "#86efac", fontSize: 10, fontWeight: 600 }}>OPEN APP</div>
                  </div>
                </a>
                {/* Email */}
                <a href={`mailto:${EMAIL}`} style={{ textDecoration: "none" }}>
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                    background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)",
                    borderRadius: 8, cursor: "pointer",
                  }}>
                    <span style={{ fontSize: 16 }}>✉️</span>
                    <div>
                      <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Email Us</div>
                      <div style={{ color: "#a5b4fc", fontSize: 10 }}>{EMAIL}</div>
                    </div>
                  </div>
                </a>
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px 14px 8px",
            display: "flex", flexDirection: "column", gap: 10,
            maxHeight: 300, minHeight: 180,
          }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 6 }}>
                {m.role === "assistant" && (
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,#f97316,#ea580c)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
                  }}>🤖</div>
                )}
                <div style={{
                  maxWidth: "80%", padding: "9px 12px",
                  borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role === "user" ? "linear-gradient(135deg,#f97316,#ea580c)" : "#f1f5f9",
                  color: m.role === "user" ? "#fff" : "#0f172a",
                  fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap",
                }}>{m.content}</div>
                {/* TTS button for assistant messages */}
                {m.role === "assistant" && i === msgs.length - 1 && (
                  <button
                    onClick={() => speaking ? stopSpeaking() : speak(m.content)}
                    title={speaking ? "Stop speaking" : "Read aloud"}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: speaking ? "#f97316" : "#94a3b8", padding: 2, flexShrink: 0,
                    }}
                  >
                    {speaking ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "9px 12px", background: "#f1f5f9", borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
                {[0, 1, 2].map((n) => (
                  <span key={n} style={{ width: 6, height: 6, background: "#94a3b8", borderRadius: "50%", display: "inline-block", animation: `chatDot 1.4s ${n * 0.2}s ease-in-out infinite` }} />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick action chips */}
          {msgs.length <= 2 && (
            <div style={{ padding: "4px 14px 8px", display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Get a quote", "IRATA training", "Wind turbine services", "PPE equipment", "Talk to sales"].map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  style={{
                    padding: "5px 10px", background: "none",
                    border: "1px solid #e2e8f0", borderRadius: 20,
                    fontSize: 11, color: "#475569", cursor: "pointer",
                    fontFamily: "inherit", transition: "all .15s",
                  }}
                  onMouseEnter={(e) => { const b = e.currentTarget; b.style.background = "#f97316"; b.style.color = "#fff"; b.style.borderColor = "#f97316"; }}
                  onMouseLeave={(e) => { const b = e.currentTarget; b.style.background = "none"; b.style.color = "#475569"; b.style.borderColor = "#e2e8f0"; }}
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Contact form */}
          {showContact && !sent && (
            <div style={{ padding: "10px 14px", background: "#fef9f0", borderTop: "1px solid #fed7aa" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", marginBottom: 8 }}>📧 Send inquiry to our sales team</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["name", "email", "phone"].map((f) => (
                  <input
                    key={f}
                    placeholder={f === "name" ? "Your name" : f === "email" ? "Email address" : "Phone (optional)"}
                    value={contact[f as keyof typeof contact]}
                    onChange={(e) => setContact({ ...contact, [f]: e.target.value })}
                    style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #fed7aa", fontSize: 12, outline: "none", fontFamily: "inherit" }}
                  />
                ))}
                <button
                  onClick={sendInquiry}
                  disabled={loading || (!contact.name && !contact.email)}
                  style={{ padding: "8px", background: "#f97316", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Send Inquiry
                </button>
              </div>
            </div>
          )}
          {sent && (
            <div style={{ padding: "10px 14px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", fontSize: 13, color: "#166534", fontWeight: 600 }}>
              ✅ Inquiry sent! Our sales team will contact you soon.
            </div>
          )}

          {/* Input row */}
          <div style={{ padding: "10px 14px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 7, alignItems: "center" }}>
            {/* Voice input button */}
            {voiceSupported ? (
              <button
                onClick={listening ? stopListening : startListening}
                title={listening ? "Stop listening" : "Voice input"}
                style={{
                  width: 36, height: 36, borderRadius: "50%", border: "none", cursor: "pointer", flexShrink: 0,
                  background: listening ? "linear-gradient(135deg,#ef4444,#dc2626)" : "#f1f5f9",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: listening ? "chatPulse 1s ease-in-out infinite" : "none",
                  transition: "background .2s",
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={listening ? "#fff" : "#64748b"} strokeWidth="2" strokeLinecap="round">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
                </svg>
              </button>
            ) : null}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder={listening ? "🎤 Listening..." : "Ask about services, training, or quotes..."}
              disabled={loading || listening}
              style={{
                flex: 1, padding: "9px 12px", border: "1px solid #e2e8f0",
                borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "inherit",
                background: listening ? "#fef3c7" : "#fff",
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                padding: "9px 14px", border: "none", borderRadius: 10, cursor: input.trim() ? "pointer" : "default",
                background: input.trim() ? "linear-gradient(135deg,#f97316,#ea580c)" : "#e2e8f0",
                color: input.trim() ? "#fff" : "#94a3b8",
                fontWeight: 700, fontSize: 12, transition: "all .2s", fontFamily: "inherit",
              }}
            >
              Send
            </button>
          </div>

          {/* Footer quick-call strip */}
          <div style={{
            padding: "8px 14px 10px", background: "#f8fafc", borderTop: "1px solid #f1f5f9",
            display: "flex", gap: 8, justifyContent: "center",
          }}>
            <a href={`tel:${PHONE_PRIMARY.replace(/\s/g, "")}`} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
                background: "#fff", border: "1px solid #e2e8f0", borderRadius: 20,
                fontSize: 11, color: "#0f172a", fontWeight: 600, cursor: "pointer",
              }}>
                <span>📞</span> {PHONE_PRIMARY}
              </div>
            </a>
            <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                background: "#25D366", borderRadius: 20,
                fontSize: 11, color: "#fff", fontWeight: 600, cursor: "pointer",
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </div>
            </a>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatPulse {
          0%,100%{box-shadow:0 4px 20px rgba(249,115,22,.5)}
          50%{box-shadow:0 4px 32px rgba(249,115,22,.8),0 0 0 8px rgba(249,115,22,.12)}
        }
        @keyframes chatSlideUp {
          from{opacity:0;transform:translateY(16px)}
          to{opacity:1;transform:none}
        }
        @keyframes chatDot {
          0%,80%,100%{transform:scale(0.6);opacity:.4}
          40%{transform:scale(1);opacity:1}
        }
      `}</style>
    </>
  );
}
