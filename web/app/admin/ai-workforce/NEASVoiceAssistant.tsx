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
type NEASVoiceAssistantProps = { onStatusChange?: (status: NEASVoiceStatus, detail?: string) => void };

const NEASVoiceAssistant = forwardRef<NEASVoiceAssistantHandle, NEASVoiceAssistantProps>(
function NEASVoiceAssistant({ onStatusChange }, ref) {
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
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  };

  const speakWithDeviceVoice = (value: string) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      reportError("NEAS AI received a response, but audio playback is unavailable in this browser. Check your device audio settings.");
      if (conversationActive.current) startListening();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value.slice(0, 1000));
    utterance.lang = "en-PH";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find((voice) => voice.lang.toLowerCase() === "en-ph")
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us"))
      ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb"));
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.onend = () => {
      if (conversationActive.current) startListening();
      else onStatusChange?.("idle");
    };
    utterance.onerror = (event) => {
      reportError("Device voice playback failed: " + event.error);
      if (conversationActive.current) startListening();
    };
    onStatusChange?.("speaking", "Using the device voice fallback because natural voice service is unavailable.");
    window.speechSynthesis.speak(utterance);
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
          reportError("Natural voice playback failed.");
          if (conversationActive.current) startListening();
        }
      };
      onStatusChange?.("speaking");
      await audio.play();
    } catch {
      // Keep AI replies audible even when the paid natural-voice provider is unavailable.
      // The browser voice is a fallback only; it does not replace or mask the written answer.
      speakWithDeviceVoice(value);
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
      reportError(cause instanceof Error ? cause.message : "The voice assistant request failed.");
      if (conversationActive.current) startListening();
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
        // Do not let the browser end event erase an actionable recognition error.
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

  // The central core remains visible throughout the conversation. A tap
  // toggles the microphone; after each spoken answer, listening resumes.
  useImperativeHandle(ref, () => ({ toggleConversation }), [toggleConversation]);

  // Voice runs headlessly: tapping the NEAS AI core starts recognition
  // and responses play through the configured natural voice provider.
  return null;
});

NEASVoiceAssistant.displayName = "NEASVoiceAssistant";

export default NEASVoiceAssistant;
