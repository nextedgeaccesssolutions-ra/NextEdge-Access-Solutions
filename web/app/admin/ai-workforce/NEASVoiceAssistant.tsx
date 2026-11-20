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
type NEASVoiceAssistantProps = {
  onStatusChange?: (status: NEASVoiceStatus, detail?: string) => void;
  onTranscript?: (answer: string) => void;
};

const NEASVoiceAssistant = forwardRef<NEASVoiceAssistantHandle, NEASVoiceAssistantProps>(
function NEASVoiceAssistant({ onStatusChange, onTranscript }, ref) {
  const persona = "ceo";
  const [history, setHistory] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [, setError] = useState("");
  const reportError = (message: string) => { setError(message); onStatusChange?.("error", message); };
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
          conversationActive.current = false;
          recognition.current?.stop();
          reportError("AI replied in text, but natural voice playback failed. Check the voice provider and try again.");
        }
      };
      onStatusChange?.("speaking");
      await audio.play();
    } catch (cause) {
      conversationActive.current = false;
      recognition.current?.stop();
      reportError(cause instanceof Error ? cause.message : "AI replied in text, but natural voice generation failed. Check the voice provider and try again.");
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
      // Publish the answer before TTS so a voice-provider outage never hides a successful AI reply.
      onTranscript?.(answer);
      await speak(answer);
    } catch (cause) {
      conversationActive.current = false;
      recognition.current?.stop();
      reportError(cause instanceof Error ? cause.message : "The voice assistant request failed. The microphone has stopped so this error remains visible.");
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
      reportError("Live microphone input is not supported in this browser. Use Chrome or Edge, or type your message.");
      return;
    }
    try {
      const instance = new Recognition();
      instance.lang = "en-PH";
      instance.interimResults = false;
      instance.maxAlternatives = 1;
      let capturedSpeech = false;
      let recognitionFailed = false;
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
        recognitionFailed = true;
        const detail = event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone permission is blocked. Select the lock icon beside the website address, set Microphone to Allow, then reload."
          : event.error === "audio-capture"
            ? "No microphone was detected. Connect or select a microphone in Chrome settings."
            : event.error === "network"
              ? "Browser speech recognition network service is unavailable. Check your internet connection."
              : event.error === "no-speech"
                ? "No speech was detected. Tap the NEAS AI core and speak again."
                : "Browser speech recognition error: " + event.error;
        reportError(detail);
      };
      instance.onend = () => {
        if (!capturedSpeech && !recognitionFailed && conversationActive.current) onStatusChange?.("idle");
      };
      recognition.current = instance;
      instance.start();
    } catch {
      reportError("Could not start the microphone. Check Chrome microphone permission and selected input device.");
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

  useImperativeHandle(ref, () => ({ toggleConversation }), [toggleConversation]);

  return null;
});

NEASVoiceAssistant.displayName = "NEASVoiceAssistant";

export default NEASVoiceAssistant;
