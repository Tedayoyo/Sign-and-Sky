// Speech to text with the phone's recogniser. It differs from phone to phone (Amharic most of all),
// so every failure ends in a plain message and typing or tapping a sign always remains possible.
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import { useCallback, useRef, useState } from "react";
import { SPEECH, type Locale } from "./i18n";

export type ListenError = "blocked" | "nohear" | "unavailable" | "network";

export function useListen(lang: Locale, onFinal: (text: string, alternatives: string) => void, onError: (e: ListenError) => void) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const got = useRef(false);

  useSpeechRecognitionEvent("start", () => setListening(true));
  useSpeechRecognitionEvent("end", () => {
    setListening(false);
    setInterim("");
  });
  useSpeechRecognitionEvent("result", (e) => {
    const best = e.results[0]?.transcript ?? "";
    if (!e.isFinal) return setInterim(best);
    if (best.trim()) {
      got.current = true;
      onFinal(best.trim(), e.results.slice(1).map((r) => r.transcript).join(" "));
    }
  });
  useSpeechRecognitionEvent("error", (e) => {
    setListening(false);
    if (e.error === "aborted" || got.current) return;
    onError(
      e.error === "not-allowed" ? "blocked"
      : e.error === "no-speech" || e.error === "speech-timeout" ? "nohear"
      : e.error === "network" ? "network"
      : "unavailable",
    );
  });

  const start = useCallback(async () => {
    got.current = false;
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) return onError("unavailable");
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) return onError("blocked");
      ExpoSpeechRecognitionModule.start({ lang: SPEECH[lang], interimResults: true, maxAlternatives: 3, continuous: false });
    } catch {
      onError("unavailable");
    }
  }, [lang, onError]);

  const stop = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {}
  }, []);

  return { listening, interim, start, stop };
}
