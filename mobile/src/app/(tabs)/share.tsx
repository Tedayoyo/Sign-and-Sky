// Share a sign. The form works with no internet: the sign is saved on the phone and sent to the
// researchers when a connection comes back. The same checks as the website are made before saving.
import { createAudioPlayer, requestRecordingPermissionsAsync, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Btn, Card, Chip, Field, H, Label, Notice, P } from "@/components/ui";
import { useApp } from "@/lib/app";
import { fmt } from "@/lib/i18n";
import { enqueue, removeQueued, validateShare, type ShareFields } from "@/lib/outbox";
import { KEYS, load, remove, save } from "@/lib/storage";
import { space, useTheme } from "@/lib/theme";

const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = (lang: string): ShareFields => ({
  farmer_name: "", region: "", location_text: "", village: "", observation_date: today(), indicator: "", description: "",
  original_language: lang, interpretation: "", expected_event: "", expected_timing: "other_unknown", agricultural_activity: "other", crop_type: "", notes: "",
});
const MAX_SECONDS = 120;
// Small mono AAC (.m4a): two minutes stay well under the website's 3 MB limit.
const VOICE = { ...RecordingPresets.HIGH_QUALITY, sampleRate: 22050, numberOfChannels: 1, bitRate: 32000 };

export default function ShareScreen() {
  const c = useTheme();
  const { d, s, lang, online, outbox, sent, sending, sendNow, reloadOutbox } = useApp();
  const t = d.share;
  const params = useLocalSearchParams<{ description?: string }>();
  const [f, setF] = useState<ShareFields>(() => EMPTY(lang));
  const [consent, setConsent] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [voice, setVoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | "queued" | "sending">(null);
  const [restored, setRestored] = useState(false);
  const loaded = useRef(false);
  const recorder = useAudioRecorder(VOICE);
  const rec = useAudioRecorderState(recorder, 500);

  useEffect(() => {
    (async () => {
      const draft = await load<ShareFields>(KEYS.draft);
      if (draft && (draft.indicator || draft.description)) {
        setF({ ...EMPTY(lang), ...draft });
        setRestored(true);
      }
      loaded.current = true;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (params.description) setF((x) => ({ ...x, description: x.description || String(params.description) }));
  }, [params.description]);

  useEffect(() => {
    if (!loaded.current) return;
    const id = setTimeout(() => void save(KEYS.draft, f), 600);
    return () => clearTimeout(id);
  }, [f]);

  useEffect(() => {
    if (rec.isRecording && rec.durationMillis >= MAX_SECONDS * 1000) void stopRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec.isRecording, rec.durationMillis]);

  const set = (k: string) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function pick(camera: boolean) {
    try {
      if (camera) {
        const p = await ImagePicker.requestCameraPermissionsAsync();
        if (!p.granted) return;
      }
      const r = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: "images", quality: 0.8 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", quality: 0.8 });
      const asset = r.canceled ? null : r.assets[0];
      if (!asset) return;
      const big = Math.max(asset.width ?? 0, asset.height ?? 0) > 1600;
      const out = await manipulateAsync(asset.uri, big ? [{ resize: (asset.width ?? 0) >= (asset.height ?? 0) ? { width: 1600 } : { height: 1600 } }] : [], { compress: 0.7, format: SaveFormat.JPEG });
      setPhoto(out.uri);
    } catch {
      setError(t.errors.photo);
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const p = await requestRecordingPermissionsAsync();
      if (!p.granted) return setError(t.voice.denied);
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setError(t.voice.notSupported);
    }
  }
  async function stopRecording() {
    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      if (recorder.uri) setVoice(recorder.uri);
    } catch {
      setError(t.errors.voice);
    }
  }
  function playVoice() {
    if (!voice) return;
    try {
      const p = createAudioPlayer(voice);
      p.addListener("playbackStatusUpdate", (st) => {
        if (st.didJustFinish) p.remove();
      });
      p.play();
    } catch {}
  }

  async function submit() {
    setError(null);
    const v = validateShare(f, consent);
    if (v.missing.length) {
      const names: Record<string, string> = { region: t.region, location_text: t.location, indicator: t.indicator, description: t.description, observation_date: t.date };
      return setError(fmt(t.errors.required, { fields: v.missing.map((k) => names[k]).join(", ") }));
    }
    if (v.badDate) return setError(t.errors.date);
    if (v.noConsent) return setError(t.errors.consent);
    if (rec.isRecording) await stopRecording();
    await enqueue({ ...f, lang }, photo, voice);
    await remove(KEYS.draft);
    setF(EMPTY(lang));
    setConsent(false);
    setPhoto(null);
    setVoice(null);
    setRestored(false);
    await reloadOutbox();
    if (online) {
      setDone("sending");
      await sendNow();
    }
    setDone("queued");
  }

  const mmss = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  const choice = (key: string, options: Record<string, string>) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
      {Object.entries(options).map(([k, label]) => (
        <Chip key={k} title={label} selected={f[key] === k} onPress={() => set(key)(k)} />
      ))}
    </View>
  );

  return (
    <Screen title={t.title}>
      <P muted>{t.intro}</P>
      <Notice tone={online ? "info" : "warn"}>{online ? t.privacy : t.offline.offline}</Notice>

      {outbox.length > 0 || sent.length > 0 ? (
        <Card>
          {outbox.length > 0 ? (
            <>
              <H size={17}>{t.offline.queuedTitle}</H>
              <P small>{sending ? fmt(t.offline.sending, { n: outbox.length }) : fmt(t.offline.waiting, { n: outbox.length })}</P>
              {outbox.map((q) => (
                <View key={q.id} style={{ borderTopColor: c.line, borderTopWidth: 1, paddingTop: space.s, gap: 4 }}>
                  <P>{q.fields.indicator}</P>
                  <P muted small>{q.savedAt.slice(0, 10)}</P>
                  {q.lastError && online ? <P small style={{ color: c.weak }}>{fmt(s.share.refused, { reason: q.lastError })}</P> : null}
                  <View style={{ flexDirection: "row" }}>
                    <Btn small kind="danger" title={s.share.delete} onPress={async () => { await removeQueued(q.id); await reloadOutbox(); }} />
                  </View>
                </View>
              ))}
              <Btn title={t.offline.sendNow} disabled={!online || sending} onPress={() => void sendNow()} />
            </>
          ) : null}
          {sent.length > 0 ? (
            <>
              <H size={15}>{s.share.sentList}</H>
              {sent.slice(0, 5).map((x) => (
                <P key={x.id} small>{`${x.indicator} · ${fmt(t.offline.sent, { code: x.code })}`}</P>
              ))}
            </>
          ) : null}
        </Card>
      ) : null}

      {done && outbox.length > 0 && !sending ? <Notice>{t.offline.queued}</Notice> : null}
      {done && outbox.length === 0 && !sending && sent[0] ? (
        <Notice>{`${t.successTitle} ${fmt(t.success, { code: sent[0].code })}`}</Notice>
      ) : null}
      {restored ? (
        <View style={{ gap: space.s }}>
          <Notice>{t.offline.draftRestored}</Notice>
          <View style={{ flexDirection: "row" }}>
            <Btn small kind="ghost" title={t.offline.discard} onPress={() => { setF(EMPTY(lang)); setRestored(false); void remove(KEYS.draft); }} />
          </View>
        </View>
      ) : null}

      <Card>
        <Field label={t.indicator} value={f.indicator} onChangeText={set("indicator")} maxLength={200} />
        <Field label={t.description} value={f.description} onChangeText={set("description")} multiline maxLength={2000} />
        <View style={{ gap: 4 }}>
          <Label>{t.voice.title}</Label>
          <P muted small>{t.voice.help}</P>
          {rec.isRecording ? (
            <Btn kind="danger" title={`${t.voice.stop} · ${mmss(rec.durationMillis)}`} onPress={() => void stopRecording()} />
          ) : voice ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
              <Btn small kind="ghost" title={s.share.play} onPress={playVoice} />
              <Btn small kind="ghost" title={t.voice.again} onPress={() => { setVoice(null); void startRecording(); }} />
              <Btn small kind="danger" title={t.voice.remove} onPress={() => setVoice(null)} />
            </View>
          ) : (
            <Btn kind="ghost" title={t.voice.start} onPress={() => void startRecording()} />
          )}
        </View>
        <View style={{ gap: 4 }}>
          <Field label={t.date} value={f.observation_date} onChangeText={set("observation_date")} keyboardType="numbers-and-punctuation" autoCorrect={false} maxLength={10} help={fmt(s.share.dateHelp, { example: today() })} />
          <View style={{ flexDirection: "row" }}>
            <Chip title={s.share.today} selected={f.observation_date === today()} onPress={() => set("observation_date")(today())} />
          </View>
        </View>
        <Field label={t.region} value={f.region} onChangeText={set("region")} maxLength={120} />
        <Field label={t.location} value={f.location_text} onChangeText={set("location_text")} maxLength={160} />
        <Field label={t.village} value={f.village} onChangeText={set("village")} maxLength={120} />
        <View style={{ gap: 4 }}>
          <Label>{t.language}</Label>
          {choice("original_language", t.languages)}
        </View>
      </Card>

      <Card>
        <Field label={t.interpretation} value={f.interpretation} onChangeText={set("interpretation")} multiline maxLength={1000} />
        <Field label={t.expected} value={f.expected_event} onChangeText={set("expected_event")} maxLength={300} />
        <View style={{ gap: 4 }}>
          <Label>{t.timing}</Label>
          {choice("expected_timing", t.timings)}
        </View>
        <View style={{ gap: 4 }}>
          <Label>{t.activity}</Label>
          {choice("agricultural_activity", t.activities)}
        </View>
        <Field label={t.crop} value={f.crop_type} onChangeText={set("crop_type")} maxLength={120} />
        <Field label={t.notes} value={f.notes} onChangeText={set("notes")} multiline maxLength={1000} />
        <Field label={t.farmerName} value={f.farmer_name} onChangeText={set("farmer_name")} maxLength={120} />
        <View style={{ gap: space.s }}>
          <Label>{t.photo}</Label>
          {photo ? <Image source={{ uri: photo }} accessibilityIgnoresInvertColors style={{ width: "100%", height: 180, borderRadius: 10 }} resizeMode="cover" /> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
            <Btn small kind="ghost" title={s.share.takePhoto} onPress={() => void pick(true)} />
            <Btn small kind="ghost" title={s.share.choosePhoto} onPress={() => void pick(false)} />
            {photo ? <Btn small kind="danger" title={s.share.removePhoto} onPress={() => setPhoto(null)} /> : null}
          </View>
        </View>
      </Card>

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: consent }} onPress={() => setConsent(!consent)} style={{ flexDirection: "row", gap: space.m, alignItems: "flex-start" }}>
        <View style={{ width: 28, height: 28, borderRadius: 6, borderWidth: 2, borderColor: consent ? c.primary : c.muted, backgroundColor: consent ? c.primary : "transparent", alignItems: "center", justifyContent: "center", marginTop: 2 }}>
          {consent ? <Text style={{ color: c.onPrimary, fontSize: 18, lineHeight: 22, fontWeight: "700" }}>✓</Text> : null}
        </View>
        <P style={{ flex: 1 }}>{t.consent}</P>
      </Pressable>
      {error ? <Notice tone="warn">{error}</Notice> : null}
      <Btn title={t.submit} onPress={() => void submit()} disabled={sending} />
      <P muted small>{t.privacy}</P>
    </Screen>
  );
}
