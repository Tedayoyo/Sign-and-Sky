// Language, what is stored on the phone for offline use, and what the app is.
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { Btn, Card, Chip, H, Label, Notice, P } from "@/components/ui";
import { useApp } from "@/lib/app";
import { API_BASE, APP_VERSION } from "@/lib/config";
import { fmt, LOCALES } from "@/lib/i18n";
import { space } from "@/lib/theme";
import { expectedClips } from "@/lib/voicepack";

export default function MoreScreen() {
  const app = useApp();
  const { d, s, lang, setLang, records, libraryAt, climate, online, manifest, voice, update, outbox } = app;
  const m = s.more;
  const clips = Object.keys(manifest).length;
  const total = expectedClips(records);
  return (
    <Screen title={s.tabs.more}>
      <Card>
        <H size={17}>{m.language}</H>
        <View style={{ flexDirection: "row", gap: space.s }}>
          {LOCALES.map((l) => (
            <Chip key={l} title={d.langName[l]} selected={lang === l} onPress={() => setLang(l)} />
          ))}
        </View>
      </Card>

      <Card>
        <H size={17}>{m.offlineTitle}</H>
        <P muted small>{s.offlineReady}</P>
        <View>
          <Label>{m.library}</Label>
          <P>{libraryAt ? fmt(m.libraryUpdated, { n: records.length, date: libraryAt.slice(0, 10) }) : fmt(m.libraryBuiltin, { n: records.length })}</P>
        </View>
        <View>
          <Label>{m.rainfall}</Label>
          <P>{climate ? `${climate.normal_period} · ${climate.at.slice(0, 10)}` : m.rainfallNone}</P>
        </View>
        {outbox.length ? (
          <View>
            <Label>{m.outbox}</Label>
            <P>{String(outbox.length)}</P>
          </View>
        ) : null}
        <Btn kind="ghost" title={update === "running" ? m.updating : m.updateNow} disabled={!online || update === "running"} onPress={() => void app.updateNow()} />
        {update === "ok" ? <P muted small>{m.updated}</P> : null}
        {update === "failed" ? <Notice tone="warn">{m.updateFailed}</Notice> : null}
      </Card>

      <Card>
        <H size={17}>{m.voice}</H>
        <P>{voice.running ? fmt(m.voiceDownloading, { done: voice.done, total: voice.total }) : fmt(m.voiceCount, { done: clips, total })}</P>
        {voice.problem && !voice.running ? <Notice tone="warn">{m.voiceUnavailable}</Notice> : null}
        {!online ? <P muted small>{m.voiceNeedsInternet}</P> : null}
        {voice.running ? (
          <Btn kind="ghost" title={m.voiceStop} onPress={app.stopVoiceDownload} />
        ) : (
          <Btn title={m.voiceDownload} disabled={!online || clips >= total} onPress={app.startVoiceDownload} />
        )}
        {clips > 0 && !voice.running ? <Btn small kind="danger" title={m.voiceDelete} onPress={() => void app.removeVoice()} /> : null}
      </Card>

      <Card>
        <H size={17}>{m.aboutTitle}</H>
        <P>{d.about.lead}</P>
        <P small>{m.scope}</P>
        {d.about.promises.map((p) => (
          <P key={p} small>{`• ${p}`}</P>
        ))}
        <P muted small>{d.footer.note}</P>
        <Btn kind="ghost" title={m.website} disabled={!online} onPress={() => void WebBrowser.openBrowserAsync(`${API_BASE}/${lang}`)} />
      </Card>

      <Card>
        <H size={17}>{m.privacyTitle}</H>
        <P small>{m.privacy}</P>
      </Card>
      <P muted small>{`Sign & Sky · ${fmt(m.version, { v: APP_VERSION })}`}</P>
    </Screen>
  );
}
