// Explore: the other parts of Sign & Sky, then language, offline data and privacy.
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { View } from "react-native";
import { Screen } from "@/components/Screen";
import { Btn, Card, Chip, FadeIn, H, Label, LinkCard, Notice, P } from "@/components/ui";
import { useApp } from "@/lib/app";
import { API_BASE, APP_VERSION } from "@/lib/config";
import { fmt, LOCALES } from "@/lib/i18n";
import { space } from "@/lib/theme";

export default function MoreScreen() {
  const app = useApp();
  const { d, s, lang, setLang, records, libraryAt, climate, online, voice, voiceReady, update, outbox, diary } = app;
  const m = s.more;
  const e = s.explore;
  const links = [
    ["note", e.diary, "/diary", diary.length ? String(diary.length) : undefined],
    ["chart", e.results, "/results", undefined],
    ["rain", e.rainfall, "/rainfall", undefined],
    ["book", e.stories, "/stories", undefined],
    ["leaf", e.about, "/about", undefined],
    ["people", e.team, "/team", undefined],
  ] as const;
  return (
    <Screen title={e.title} subtitle={d.landing.taglineText} eyebrow="Sign & Sky" photo={{ source: require("@/assets/photos/science-landscape.jpg"), alt: d.media.science }}>
      {links.map(([icon, [title, text], href, badge], i) => (
        <FadeIn key={href} delay={i * 50}>
          <LinkCard icon={icon} title={title} text={text} badge={badge} onPress={() => router.push(href)} />
        </FadeIn>
      ))}

      <H size={18}>{e.settings}</H>
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
        <P>{voice.running ? fmt(m.voiceDownloading, { done: voice.done, total: voice.total }) : fmt(m.voiceCount, { done: voiceReady.have, total: voiceReady.total })}</P>
        {voice.problem && !voice.running ? <Notice tone="warn">{m.voiceUnavailable}</Notice> : null}
        {!online && voiceReady.have < voiceReady.total ? <P muted small>{m.voiceNeedsInternet}</P> : null}
        {voice.running ? (
          <Btn kind="ghost" title={m.voiceStop} onPress={app.stopVoiceDownload} />
        ) : voiceReady.have < voiceReady.total ? (
          <Btn title={m.voiceDownload} disabled={!online} onPress={app.startVoiceDownload} />
        ) : null}
        {Object.keys(app.manifest).length > 0 && !voice.running ? <Btn small kind="danger" title={m.voiceDelete} onPress={() => void app.removeVoice()} /> : null}
      </Card>

      <Card>
        <H size={17}>{m.privacyTitle}</H>
        <P small>{m.privacy}</P>
        <P small>{s.diary.private}</P>
      </Card>
      <Btn kind="ghost" title={m.website} disabled={!online} onPress={() => void WebBrowser.openBrowserAsync(`${API_BASE}/${lang}`)} />
      <P muted small>{d.footer.note}</P>
      <P muted small>{`Sign & Sky · ${fmt(m.version, { v: APP_VERSION })}`}</P>
    </Screen>
  );
}
