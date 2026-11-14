// One sign: what farmers see, what they say it means, the score and how far it has been evaluated.
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Btn, Card, H, Icon, Label, Notice, P, ScoreRing, TrustBadge } from "@/components/ui";
import { useApp } from "@/lib/app";
import { fmt } from "@/lib/i18n";
import { tr } from "@/lib/records";
import { trustLevel } from "@/lib/scoring";
import { space, useTheme } from "@/lib/theme";

export default function SignScreen() {
  const c = useTheme();
  const { d, s, lang, records } = useApp();
  const { n } = useLocalSearchParams<{ n: string }>();
  const r = records.find((x) => x.record_number === Number(n));
  const back = (
    <Pressable accessibilityRole="button" accessibilityLabel={d.signs.back} hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace("/signs"))}>
      <Icon name="back" color={c.onDark} />
    </Pressable>
  );
  if (!r) {
    return (
      <Screen title={d.signs.title} left={back}>
        <P>{d.signs.notFound}</P>
      </Screen>
    );
  }
  const t = tr(r, lang);
  const g = d.signs;
  const retested = r.evaluations.some((e) => e.method_version && e.method_version !== "field-ai-2025");
  const status: "preliminary" | "retested" | "untested" = !r.evaluations.length ? "untested" : retested ? "retested" : "preliminary";
  const rows: [string, string | null][] = [
    [g.description, t.description],
    [g.behaviour, t.observation_text],
    [g.interpretation, t.interpretation],
    [g.prediction, t.expected_weather],
    [g.delay, t.expected_timing_text],
    [g.relevance, t.agricultural_relevance],
    [g.advice, t.voice_advice],
    [g.recorded, r.observation_period],
    [g.place, d.places.wol.label],
  ];
  return (
    <Screen title={t.name} left={back}>
      <Card>
        {rows.map(([k, v]) =>
          v ? (
            <View key={k}>
              <Label>{k}</Label>
              <P>{v}</P>
            </View>
          ) : null,
        )}
        {t.translation_status === "needs_review" && lang !== "en" ? <P muted small>{s.signs.needsReview}</P> : null}
      </Card>

      <Card>
        <H size={17}>{s.signs.status}</H>
        <TrustBadge level={status === "untested" ? "untested" : status === "retested" ? "strong" : "fair"} label={d.explorer.status[status]} />
        <P small>{d.evidence.statusText[status]}</P>
        <P muted small>{d.evidence.validatedNote}</P>
      </Card>

      <Card>
        <H size={17}>{g.tests}</H>
        {r.evaluations.length === 0 ? <P>{g.noTests}</P> : null}
        {r.evaluations.map((e) => {
          const level = trustLevel(e.score);
          const field = e.method_version === "field-ai-2025" || !e.method_version;
          return (
            <View key={e.id} style={{ flexDirection: "row", gap: space.m, alignItems: "flex-start", borderTopColor: c.line, borderTopWidth: 1, paddingTop: space.m }}>
              <ScoreRing score={e.score} level={level} size={60} label={fmt(d.ask.gaugeLabel, { score: e.score })} />
              <View style={{ flex: 1, gap: 4 }}>
                <TrustBadge level={level} label={d.trust[level]} />
                {e.evaluated_on ? <P small>{fmt(g.testOf, { date: e.evaluated_on.slice(0, 10) })}</P> : null}
                {e.method ? (
                  <View>
                    <Label>{g.method}</Label>
                    <P small>{e.method}</P>
                  </View>
                ) : null}
                {e.window_start && e.window_end ? (
                  <View>
                    <Label>{g.window}</Label>
                    <P small>{`${e.window_start} – ${e.window_end}`}</P>
                  </View>
                ) : null}
                {field ? <Notice tone="warn">{g.noData}</Notice> : null}
              </View>
            </View>
          );
        })}
      </Card>

      {r.source_reference ? (
        <Card>
          <Label>{g.source}</Label>
          <P small>{r.source_reference}</P>
        </Card>
      ) : null}
      <Btn title={g.ask} onPress={() => router.navigate({ pathname: "/", params: { n: String(r.record_number) } })} />
    </Screen>
  );
}
