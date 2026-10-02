"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in the TypeScript DOM lib).
type SpeechRecognitionResultLike = { isFinal: boolean; 0: { transcript: string } };
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// Browser speech-to-text (Chrome, Edge, Safari). `onFinal` receives each
// finished phrase; `interim` is the phrase currently being spoken.
export function useSpeechToText(onFinal: (text: string) => void) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const wanted = useRef(false);
  const onFinalRef = useRef(onFinal);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    // Feature detection has to run in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognition() !== null);
    return () => {
      wanted.current = false;
      recognition.current?.stop();
    };
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognition();
    if (!Ctor) return;
    setError(null);
    const r = new Ctor();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) onFinalRef.current(res[0].transcript.trim());
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        wanted.current = false;
        setError("Microphone access was blocked. Allow it in the browser, or answer by text.");
      } else if (e.error === "network") {
        wanted.current = false;
        setError("Speech recognition needs an internet connection.");
      }
    };
    // Browsers stop after a pause; restart while the user still wants to record.
    // An older instance (replaced by a restart) just ends.
    r.onend = () => {
      if (recognition.current !== r) return;
      setInterim("");
      if (wanted.current) r.start();
      else setListening(false);
    };
    recognition.current = r;
    wanted.current = true;
    r.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    wanted.current = false;
    recognition.current?.stop();
    setListening(false);
  }, []);

  return { supported, listening, interim, error, start, stop };
}
