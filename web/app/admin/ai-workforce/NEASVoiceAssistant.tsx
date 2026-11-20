"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
type RecognitionEvent = { resultIndex?: number; results: ArrayLike<RecognitionResult> };
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

// Matches MAX_TEXT_LENGTH in app/api/neas-voice-tts/route.ts.
const MAX_SPOKEN_CHARS = 1000;

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
  // Set before any deliberate speechSynthesis.cancel() so the resulting "canceled"
  // error is not mistaken for the browser voice failing.
  const speechCancelled = useRef(false);
  const silenceTimer = useRef<number | null>(null);
  const pendingFinalTranscript = useRef("");
  const pendingInterimTranscript = useRef("");
  const busyRef = useRef(false);

  const cancelBrowserSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    speechCancelled.current = true;
    window.speechSynthesis.cancel();
  };

  useEffect(() => () => {
    conversationActive.current = false;
    if (silenceTimer.current !== null) window.clearTimeout(silenceTimer.current);
    recognition.current?.stop();
    audioRef.current?.pause();
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    // Without this the browser keeps talking after the page is left.
    cancelBrowserSpeech();
  }, []);

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    audioUrlRef.current = null;
    cancelBrowserSpeech();
  };

  // Last-resort voice: the browser's own speech synthesiser. Needs no API key and no
  // network, so NEAS AI still speaks when every remote natural-voice provider is down.
  const browserSpeech = (value: string) =>
    new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        reject(new Error("This browser has no built-in speech synthesiser."));
        return;
      }
      const synth = window.speechSynthesis;
      // Same cap the remote provider gets, so the spoken reply never runs far longer
      // than the natural-voice path would have.
      const utterance = new SpeechSynthesisUtterance(value.slice(0, MAX_SPOKEN_CHARS));
      utterance.lang = "en-PH";
      utterance.rate = 1;
      utterance.pitch = 1;

      let settled = false;
      let started = false;
      let keepAlive = 0;
      let watchdog = 0;

      const finish = (failure?: Error) => {
        if (settled) return;
        settled = true;
        window.clearInterval(keepAlive);
        window.clearTimeout(watchdog);
        if (failure) reject(failure);
        else resolve();
      };

      // The watchdog only settles while nothing is being spoken. Re-arming while
      // synth.speaking keeps the microphone from reopening over NEAS AI's own voice,
      // which would otherwise transcribe the assistant back into the conversation.
      const armWatchdog = (ms: number) => {
        window.clearTimeout(watchdog);
        watchdog = window.setTimeout(() => {
          if (speechCancelled.current) return finish();
          if (synth.speaking) return armWatchdog(15_000);
          finish(started ? undefined : new Error("The browser voice produced no audio."));
        }, ms);
      };

      utterance.onstart = () => { started = true; };
      utterance.onend = () => finish();
      utterance.onerror = (event) => {
        // stopAudio() and toggleConversation() cancel speech deliberately; Chrome
        // reports that as an error, but it is a user action, not a voice failure.
        if (speechCancelled.current || event.error === "canceled" || event.error === "interrupted") finish();
        else finish(new Error(`The browser speech synthesiser failed (${event.error}).`));
      };

      // Chrome pauses long utterances after ~15s; pumping resume() keeps it talking.
      keepAlive = window.setInterval(() => { if (synth.speaking) synth.resume(); }, 10_000);
      armWatchdog(12_000);
      synth.cancel();
      speechCancelled.current = false;
      synth.speak(utterance);
    });

  // Shared by every path that leaves NEAS AI without remote audio.
  const fallbackToBrowserVoice = async (value: string, remoteFailure: string) => {
    try {
      onStatusChange?.("speaking", "Natural voice is unavailable. Using the built-in browser voice.");
      await browserSpeech(value);
      if (speechCancelled.current) return;
      if (conversationActive.current) startListening();
      else onStatusChange?.("idle");
    } catch (cause) {
      conversationActive.current = false;
      recognition.current?.stop();
      const detail = cause instanceof Error ? cause.message : "The built-in browser voice is unavailable.";
      console.error("[NEASVoiceAssistant] Every voice output failed.", { remoteFailure, fallback: detail });
      reportError(`${remoteFailure} ${detail} Your written AI response remains available.`);
    }
  };

  const speak = async (value: string) => {
    stopAudio();
    try {
      const response = await fetch("/api/neas-voice-tts", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: value.slice(0, MAX_SPOKEN_CHARS) }),
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
          void fallbackToBrowserVoice(value, "Natural AI audio could not be played.");
        }
      };
      onStatusChange?.("speaking");
      await audio.play();
    } catch (cause) {
      // A natural-voice outage must not end the conversation: fall back to the browser voice.
      await fallbackToBrowserVoice(
        value,
        cause instanceof Error ? cause.message : "Natural AI voice is unavailable.",
      );
    }
  };

  const sendMessage = async (rawMessage: string) => {
    const prompt = rawMessage.trim();
    if (!prompt || busyRef.current) return;
    busyRef.current = true;
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
      const message = cause instanceof Error ? cause.message : "The voice assistant request failed.";
      if (conversationActive.current && /429|rate limit|temporarily|could not reach|timed out/i.test(message)) {
        // Keep the conversation usable during transient capacity/network failures.
        reportError(message);
        await fallbackToBrowserVoice(
          "I'm having trouble reaching the AI service right now. Please repeat your request in a moment.",
          message,
        );
      } else {
        conversationActive.current = false;
        recognition.current?.stop();
        reportError(message + " The microphone has stopped so this error remains visible.");
      }
    } finally {
      busyRef.current = false;
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
      instance.interimResults = true;
      instance.maxAlternatives = 1;
      let capturedSpeech = false;
      let recognitionFailed = false;
      let turnSubmitted = false;
      const submitRecognizedTurn = () => {
        if (turnSubmitted) return;
        turnSubmitted = true;
        if (silenceTimer.current !== null) window.clearTimeout(silenceTimer.current);
        silenceTimer.current = null;
        const transcript = [pendingFinalTranscript.current, pendingInterimTranscript.current]
          .filter(Boolean).join(" ").replace(/\\s+/g, " ").trim();
        pendingFinalTranscript.current = "";
        pendingInterimTranscript.current = "";
        if (!transcript || !conversationActive.current) return;
        instance.stop();
        void sendMessage(transcript);
      };
      instance.onstart = () => onStatusChange?.("listening", "Speak naturally. NEAS AI sends automatically when you finish.");
      instance.onresult = (event) => {
        let finalChunk = "";
        let interimChunk = "";
        const startIndex = event.resultIndex ?? 0;
        for (let index = startIndex; index < event.results.length; index++) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript?.trim() || "";
          if (!transcript) continue;
          if (result.isFinal) finalChunk += (finalChunk ? " " : "") + transcript;
          else interimChunk = transcript;
        }
        if (finalChunk) {
          pendingFinalTranscript.current = [pendingFinalTranscript.current, finalChunk].filter(Boolean).join(" ");
          pendingInterimTranscript.current = "";
          capturedSpeech = true;
        }
        if (interimChunk) {
          pendingInterimTranscript.current = interimChunk;
          capturedSpeech = true;
        }
        if (!capturedSpeech) return;
        onStatusChange?.("listening", "Finishing your sentence…");
        if (silenceTimer.current !== null) window.clearTimeout(silenceTimer.current);
        silenceTimer.current = window.setTimeout(submitRecognizedTurn, 1100);
      };
      instance.onerror = (event) => {
        recognitionFailed = true;
        if (event.error === "no-speech") {
          if (conversationActive.current) {
            window.setTimeout(() => { if (conversationActive.current && !busyRef.current) startListening(); }, 350);
          }
          return;
        }
        const detail = event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone permission is blocked. Select the lock icon beside the website address, set Microphone to Allow, then reload."
          : event.error === "audio-capture"
            ? "No microphone was detected. Connect or select a microphone in Chrome settings."
            : event.error === "network"
              ? "Browser speech recognition network service is unavailable. Check your internet connection."
              : "Browser speech recognition error: " + event.error;
        reportError(detail);
      };
      instance.onend = () => {
        if (capturedSpeech && !turnSubmitted) {
          submitRecognizedTurn();
          return;
        }
        if (!capturedSpeech && !recognitionFailed && conversationActive.current) {
          window.setTimeout(() => { if (conversationActive.current && !busyRef.current) startListening(); }, 250);
        }
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
      if (silenceTimer.current !== null) window.clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
      pendingFinalTranscript.current = "";
      pendingInterimTranscript.current = "";
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
