// Reading an answer aloud. English uses the phone's own voice (works offline).
// Amharic plays the stored clip for exactly this answer; if there is none and the phone has
// an Amharic voice it is used; otherwise the answer stays written and the screen says so.
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";
import type { Locale } from "./i18n";
import type { Clip } from "./voice-keys";

let player: AudioPlayer | null = null;

export async function stopSpeaking() {
  try {
    await Speech.stop();
  } catch {}
  try {
    player?.pause();
    player?.remove();
  } catch {}
  player = null;
}

async function phoneHasVoice(prefix: string): Promise<boolean> {
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.some((v) => v.language?.toLowerCase().startsWith(prefix));
  } catch {
    return false;
  }
}

export type Spoken = "clip" | "phone" | "written";

export async function speakReply(lang: Locale, text: string, clip: Clip | null, onDone: () => void): Promise<Spoken> {
  await stopSpeaking();
  if (!text) return "written";
  if (clip) {
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
      const p = createAudioPlayer(clip.uri);
      player = p;
      p.addListener("playbackStatusUpdate", (st) => {
        if (st.didJustFinish) {
          onDone();
          if (player === p) void stopSpeaking();
        }
      });
      p.play();
      return "clip";
    } catch {
      // fall through to the phone's voice
    }
  }
  if (lang === "am" && !(await phoneHasVoice("am"))) return "written";
  Speech.speak(text, { language: lang === "am" ? "am-ET" : "en-US", rate: 0.92, onDone, onError: onDone });
  return "phone";
}
