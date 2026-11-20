"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

type RecognitionEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type RecognitionInstance = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEvent) => void) | null;
  onstart: (() => void) | null;
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

export type NEASVoiceStatus = "idle" | "listening" | "thinking" | "speaking" | "error";
export type NEASVoiceAssistantHandle = { toggleConversation: () => void };
type NEASVoiceAssistantProps = { onStatusChange?: (status: NEASVoiceStatus) => void };

const NEASVoiceAssistant = forwardRef<NEASVoiceAssistantHandle, NEASVoiceAssistantProps>(
function NEASVoiceAssistant({ onStatusChange }, ref) {
  const persona = "ceo";
  const [history, setHistory] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [, setError] = useState("");
  const recognition = useRef<RecognitionInstance | null>(null);
  const conversationActive = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    conversationActive.current = false;
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
          if (conversationActive.current) startListening();
          else onStatusChange?.("idle");
        }
      };
      audio.onerror = () => {
        if (audioUrlRef.current === audioUrl) {
          URL.revokeObjectURL(audioUrl);
          audioUrlRef.current = null;
          audioRef.current = null;
          setError("Natural voice playback failed.");
          onStatusChange?.("error");
          if (conversationActive.current) startListening();
        }
      };
      onStatusChange?.("speaking");
      await audio.play();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Natural AI voice generation failed. Your written response remains available.");
      onStatusChange?.("error");
    }
  };

  const sendMessage = async (rawMessage: string) => {
    const prompt = rawMessage.trim();
    if (!prompt || busy) return;
    setBusy(true);
    setError("");
    onStatusChange?.("thinking");
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
      await speak(answer);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The voice assistant request failed.");
      onStatusChange?.("error");
    } finally {
      setBusy(false);
    }
  };

  const startListening = () => {
    if (!conversationActive.current) return;
    setError("");
    const speechWindow = window as SpeechWindow;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Live microphone input is not supported in this browser. Type your message instead; spoken replies remain available.");
      onStatusChange?.("error");
      return;
    }
    try {
      const instance = new Recognition();
      instance.lang = "en-PH";
      instance.interimResults = false;
      instance.maxAlternatives = 1;
      let capturedSpeech = false;
      instance.onstart = () => onStatusChange?.("listening");
      instance.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        if (transcript) {
          capturedSpeech = true;
          onStatusChange?.("thinking");
          void sendMessage(transcript);
        }
      };
      instance.onerror = (event) => {
        setError(event.error === "not-allowed" ? "Microphone permission is blocked. Allow microphone access for this website in your browser settings." : "Voice recognition stopped: " + event.error);
        onStatusChange?.("error");
      };
      instance.onend = () => {
        if (!capturedSpeech && conversationActive.current) onStatusChange?.("idle");
      };
      recognition.current = instance;
      instance.start();
    } catch {
      setError("Could not start the microphone. Check browser permission and try again.");
      onStatusChange?.("error");
    }
  };

  const toggleConversation = () => {
    if (conversationActive.current) {
      conversationActive.current = false;
      recognition.current?.stop();
      stopAudio();
      onStatusChange?.("idle");
      return;
    }
    conversationActive.current = true;
    startListening();
  };

  // The central core remains visible throughout the conversation. A tap
  // toggles the microphone; after each spoken answer, listening resumes.
  useImperativeHandle(ref, () => ({ toggleConversation }), [toggleConversation]);

  // Voice runs headlessly: tapping the NEAS AI core starts recognition
  // and responses play through the configured natural voice provider.
  return null;
});

NEASVoiceAssistant.displayName = "NEASVoiceAssistant";

export default NEASVoiceAssistant;
