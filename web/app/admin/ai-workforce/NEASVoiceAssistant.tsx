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

const NEASVoiceAssistant = forwardRef<NEASVoiceAssistantHandle, Record<string, never>>(
function NEASVoiceAssistant(_props, ref) {
  const [persona, setPersona] = useState<string>("ceo");
  const [history, setHistory] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [, setError] = useState("");
  const recognition = useRef<RecognitionInstance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

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
      };
      audio.onerror = () => {
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
          audioRef.current = null;
        }
          setError("Natural voice playback failed. Your written AI response is still available.");
      };
      await audio.play();
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

  // Voice runs headlessly: tapping the NEAS AI core starts recognition
  // and responses play through the configured natural voice provider.
  return null;
  );
});

NEASVoiceAssistant.displayName = "NEASVoiceAssistant";

export default NEASVoiceAssistant;
