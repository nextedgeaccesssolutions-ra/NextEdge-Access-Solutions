"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const WELCOME: Msg = {
  role: "assistant",
  content: "👋 Hi! I'm the NEAS virtual assistant. I can help you with questions about our rope access services, training, equipment, and pricing. How can I help you today?",
};

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "" });
  const [sent, setSent] = useState(false);
  const [unread, setUnread] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) { setUnread(false); endRef.current?.scrollIntoView({ behavior: "smooth" }); } }, [open, msgs]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const newMsgs: Msg[] = [...msgs, { role: "user", content: text }];
    setMsgs(newMsgs);
    setLoading(true);
    try {
      const r = await fetch("/api/chatbot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ messages: newMsgs.slice(-10) }) });
      const j = await r.json();
      const reply = j.reply || "I'm having trouble right now. Please contact us at sales@nextedge-access-solutions.com or call +63 991 426 5886.";
      setMsgs([...newMsgs, { role: "assistant", content: reply }]);
      if (!open) setUnread(true);
      // Suggest contact form after 2+ exchanges
      if (newMsgs.filter((m) => m.role === "user").length >= 2) setShowContact(true);
    } catch {
      setMsgs([...newMsgs, { role: "assistant", content: "Service temporarily unavailable. Please contact sales@nextedge-access-solutions.com or call +63 991 426 5886." }]);
    }
    setLoading(false);
  }

  async function sendInquiry() {
    if (!contact.name && !contact.email && !contact.phone) return;
    setLoading(true);
    try {
      await fetch("/api/chatbot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sendInquiry: true, messages: msgs.slice(-20), ...contact }) });
      setSent(true);
    } catch { /* ignore */ }
    setLoading(false);
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open chat"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999, width: 56, height: 56,
          borderRadius: "50%", border: "none", cursor: "pointer",
          background: "linear-gradient(135deg,#f97316,#ea580c)",
          boxShadow: "0 4px 20px rgba(249,115,22,.5)", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform .2s, box-shadow .2s",
          animation: open ? "none" : "chatPulse 2.5s ease-in-out infinite",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.1)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>
        )}
        {unread && !open && <span style={{ position: "absolute", top: 2, right: 2, width: 12, height: 12, background: "#ef4444", borderRadius: "50%", border: "2px solid #fff" }} />}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{
          position: "fixed", bottom: 92, right: 24, zIndex: 998, width: 360, maxWidth: "calc(100vw - 48px)",
          background: "#fff", borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,.18)",
          border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "chatSlideUp .25s ease",
        }}>
          {/* Header */}
          <div style={{ background: "linear-gradient(135deg,#0f172a,#1e293b)", padding: "14px 16px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(249,115,22,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🤖</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>NEAS Assistant</div>
              <div style={{ color: "#94a3b8", fontSize: 11 }}>Rope Access · Safety · Training</div>
            </div>
            <div style={{ marginLeft: "auto", width: 8, height: 8, background: "#22c55e", borderRadius: "50%" }} title="Online" />
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px", display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, minHeight: 200 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "80%", padding: "9px 12px", borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: m.role === "user" ? "linear-gradient(135deg,#f97316,#ea580c)" : "#f1f5f9",
                  color: m.role === "user" ? "#fff" : "#0f172a", fontSize: 13, lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 4, padding: "9px 12px", background: "#f1f5f9", borderRadius: "14px 14px 14px 4px", width: "fit-content" }}>
                {[0, 1, 2].map((n) => <span key={n} style={{ width: 6, height: 6, background: "#94a3b8", borderRadius: "50%", display: "inline-block", animation: `chatDot 1.4s ${n * .2}s ease-in-out infinite` }} />)}
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Contact form */}
          {showContact && !sent && (
            <div style={{ padding: "10px 14px", background: "#fef9f0", borderTop: "1px solid #fed7aa" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#c2410c", marginBottom: 8 }}>📧 Send inquiry to our team</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {["name", "email", "phone"].map((f) => (
                  <input key={f} placeholder={f === "name" ? "Your name" : f === "email" ? "Email address" : "Phone (optional)"}
                    value={contact[f as keyof typeof contact]} onChange={(e) => setContact({ ...contact, [f]: e.target.value })}
                    style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #fed7aa", fontSize: 12, outline: "none" }} />
                ))}
                <button onClick={sendInquiry} disabled={loading || (!contact.name && !contact.email)}
                  style={{ padding: "8px", background: "#f97316", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                  Send Inquiry
                </button>
              </div>
            </div>
          )}
          {sent && <div style={{ padding: "10px 14px", background: "#f0fdf4", borderTop: "1px solid #bbf7d0", fontSize: 13, color: "#166534", fontWeight: 600 }}>✅ Inquiry sent! Our team will contact you soon.</div>}

          {/* Input */}
          <div style={{ padding: "10px 14px 14px", borderTop: "1px solid #f1f5f9", display: "flex", gap: 8 }}>
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Ask about our services..."
              disabled={loading}
              style={{ flex: 1, padding: "9px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13, outline: "none", fontFamily: "inherit" }}
            />
            <button onClick={send} disabled={loading || !input.trim()} style={{
              padding: "9px 14px", background: input.trim() ? "linear-gradient(135deg,#f97316,#ea580c)" : "#e2e8f0",
              color: input.trim() ? "#fff" : "#94a3b8", border: "none", borderRadius: 10, cursor: input.trim() ? "pointer" : "default",
              fontWeight: 700, fontSize: 12, transition: "all .2s",
            }}>Send</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatPulse { 0%,100%{box-shadow:0 4px 20px rgba(249,115,22,.5)} 50%{box-shadow:0 4px 32px rgba(249,115,22,.8),0 0 0 8px rgba(249,115,22,.12)} }
        @keyframes chatSlideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes chatDot { 0%,80%,100%{transform:scale(0.6);opacity:.4} 40%{transform:scale(1);opacity:1} }
      `}</style>
    </>
  );
}
