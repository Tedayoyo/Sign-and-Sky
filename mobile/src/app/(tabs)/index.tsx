// Ask: the farmer speaks, types or taps a sign and gets the score and advice, with no internet needed.
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Btn, Card, Chip, H, Icon, Label, Notice, P, ScoreRing, TrustBadge } from "@/components/ui";
import type { Analysis } from "@/lib/analyze";
import { useApp } from "@/lib/app";
import { analyzeTapped, analyzeText, clipKeyFor } from "@/lib/ask";
import { fmt } from "@/lib/i18n";
import { useListen, type ListenError } from "@/lib/listen";
import { tr } from "@/lib/records";
import { speakReply, stopSpeaking, type Spoken } from "@/lib/speak";
import { space, useTheme } from "@/lib/theme";
import { clipFor } from "@/lib/voicepack";

export default function AskScreen() {
  const c = useTheme();
  const { d, s, lang, records, manifest, muted, setMuted, online } = useApp();
  const a = d.ask;
  const params = useLocalSearchParams<{ n?: string }>();
  const [text, setText] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [spoken, setSpoken] = useState<Spoken | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const last = useRef<number | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const say = useCallback(
    async (r: Analysis) => {
      if (!r.reply) return;
      const key = clipKeyFor(r);
      setSpeaking(true);
      const how = await speakReply(r.lang, r.reply, key ? clipFor(manifest, key, r.reply) : null, () => setSpeaking(false));
      setSpoken(how);
      if (how === "written") setSpeaking(false);
    },
    [manifest],
  );

  const show = useCallback(
    (r: Analysis | null) => {
      setMessage(null);
      setSpoken(null);
      if (!r || r.kind === "empty") {
        setResult(null);
        setMessage(a.empty);
        return;
      }
      last.current = r.last;
      setResult(r);
      scroll.current?.scrollTo({ y: 0, animated: true });
      if (!muted) void say(r);
    },
    [a.empty, muted, say],
  );

  const run = useCallback((t: string, alt?: string) => show(analyzeText(records, t, lang, last.current, alt)), [records, lang, show]);

  const onListenError = useCallback(
    (e: ListenError) => setMessage(e === "blocked" ? a.blocked : e === "nohear" ? a.nohear : e === "network" ? s.ask.amharicSpeechOffline : s.ask.speakUnavailable),
    [a.blocked, a.nohear, s.ask],
  );
  const onFinal = useCallback(
    (t: string, alt: string) => {
      setText(t);
      run(t, alt);
    },
    [run],
  );
  const { listening, interim, start, stop } = useListen(lang, onFinal, onListenError);

  // "Ask about this sign" from a sign page.
  useEffect(() => {
    const n = Number(params.n);
    if (Number.isInteger(n) && n > 0) {
      show(analyzeTapped(records, n, lang, d));
      router.setParams({ n: undefined });
    }
  }, [params.n, records, lang, d, show]);

  // The answer follows the language switch.
  useEffect(() => {
    void stopSpeaking();
    setSpeaking(false);
    setSpoken(null);
    setResult((r) => {
      if (!r || r.lang === lang) return r;
      if (r.record && r.kind === "sign") return analyzeTapped(records, r.record.number, lang, d) ?? null;
      return null;
    });
  }, [lang, records, d]);

  useEffect(() => () => void stopSpeaking(), []);

  const rec = result?.record;
  const test = result?.test;
  return (
    <Screen title={d.home.title} scrollRef={scroll}>
      <Card>
        <Label>{a.label}</Label>
        <TextInput
          accessibilityLabel={a.label}
          value={listening && interim ? interim : text}
          onChangeText={setText}
          placeholder={a.placeholder}
          placeholderTextColor={c.muted}
          multiline
          onSubmitEditing={() => run(text)}
          style={{ backgroundColor: c.field, color: c.ink, borderColor: c.line, borderWidth: 1, borderRadius: 10, padding: space.m, fontSize: 17, lineHeight: 27, minHeight: 84, textAlignVertical: "top" }}
        />
        <View style={{ flexDirection: "row", gap: space.s }}>
          <View style={{ flex: 1 }}>
            <Btn title={listening ? a.micStop : a.mic} kind="ghost" onPress={listening ? stop : () => { setMessage(null); void start(); }} icon={<Icon name={listening ? "stop" : "mic"} color={listening ? c.weak : c.ink} size={20} />} />
          </View>
          <View style={{ flex: 1 }}>
            <Btn title={a.go} onPress={() => run(text)} />
          </View>
        </View>
        {listening ? <P muted small>{a.listening}</P> : null}
        {message ? <Notice tone="warn">{message}</Notice> : null}
      </Card>

      {result ? (
        <Card>
          <Label>{s.ask.heard}</Label>
          <P>{result.heard}</P>
          {rec && test ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.m, marginTop: space.s }}>
                <ScoreRing score={test.score} level={test.trust} size={76} label={test.score === null ? a.notTested : fmt(a.gaugeLabel, { score: test.score })} />
                <View style={{ flex: 1, gap: 4 }}>
                  <H size={18}>{rec.name}</H>
                  <TrustBadge level={test.trust} label={d.trust[test.trust]} />
                  {test.score !== null ? <P muted small>{s.ask.preliminary}</P> : null}
                </View>
              </View>
              <View style={{ gap: 6, marginTop: space.s }}>
                {([[a.kv.place, result.place.name], [a.kv.season, result.season], [a.kv.predicts, rec.prediction], [a.kv.delay, rec.delay]] as const).map(([k, v]) =>
                  v ? (
                    <View key={k}>
                      <Label>{k}</Label>
                      <P>{v}</P>
                    </View>
                  ) : null,
                )}
              </View>
            </>
          ) : (
            <TrustBadge level="untested" label={a.notRecognised} />
          )}
          <View style={{ backgroundColor: c.soft, borderRadius: 10, padding: space.m, marginTop: space.s }}>
            <Text style={{ color: c.ink, fontSize: 17, lineHeight: 28 }}>{result.reply}</Text>
          </View>
          {rec?.translationNeedsReview ? <P muted small>{s.signs.needsReview}</P> : null}
          {spoken === "written" && !muted ? <Notice>{lang === "am" ? (online ? s.ask.writtenOnly : `${s.ask.writtenOnly} ${s.more.voiceNeedsInternet}`) : a.noVoice}</Notice> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
            {speaking ? (
              <Btn small kind="ghost" title={a.stopVoice} icon={<Icon name="stop" color={c.ink} size={18} />} onPress={() => { void stopSpeaking(); setSpeaking(false); }} />
            ) : (
              <Btn small kind="ghost" title={a.playAgain} icon={<Icon name="play" color={c.ink} size={18} />} onPress={() => void say(result)} />
            )}
            <Btn small kind="ghost" title={muted ? a.unmute : a.mute} onPress={() => { if (!muted) { void stopSpeaking(); setSpeaking(false); } setMuted(!muted); }} />
            {rec ? <Btn small kind="ghost" title={a.openRecord} onPress={() => router.push({ pathname: "/sign/[n]", params: { n: String(rec.number) } })} /> : null}
          </View>
          {result.kind === "unknown" ? (
            <>
              <P muted small>{a.unknownTest}</P>
              <Btn title={d.share.title} onPress={() => router.push({ pathname: "/share", params: { description: result.heard } })} />
            </>
          ) : null}
        </Card>
      ) : null}

      {last.current ? (
        <View style={{ gap: space.s }}>
          <H size={16}>{a.questionTitle}</H>
          <View style={{ flexDirection: "row" }}>
            <Chip title={a.question} onPress={() => { setText(a.question); run(a.question); }} />
          </View>
        </View>
      ) : null}

      <View style={{ gap: space.s }}>
        <H size={16}>{a.examplesTitle}</H>
        <View style={{ gap: space.s }}>
          {records.map((r) => (
            <Pressable
              key={r.record_number}
              accessibilityRole="button"
              onPress={() => { setText(""); show(analyzeTapped(records, r.record_number, lang, d)); }}
              style={({ pressed }) => ({ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: space.m, paddingVertical: 10, minHeight: 48, justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
              <P>{d.ask.examples[r.record_number - 1] ?? tr(r, lang).name}</P>
            </Pressable>
          ))}
        </View>
      </View>
      <P muted small>{d.footer.note}</P>
    </Screen>
  );
}
