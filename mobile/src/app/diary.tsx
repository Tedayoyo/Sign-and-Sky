// My observations: the farmer's own notebook. A sign is noted on the day it is seen; later the farmer
// records whether the predicted weather came. It stays on the phone and is not a scientific score.
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useBack } from "@/components/useBack";
import { Btn, Card, Chip, FadeIn, GroupIcon, H, Label, Notice, P } from "@/components/ui";
import { useApp } from "@/lib/app";
import { summarize } from "@/lib/diary-rules";
import { groupFor } from "@/lib/explorer";
import { fmt } from "@/lib/i18n";
import { tr } from "@/lib/records";
import { space, useTheme } from "@/lib/theme";

export default function DiaryScreen() {
  const c = useTheme();
  const { d, s, lang, records, diary, setDiaryOutcome, removeSighting } = useApp();
  const t = s.diary;
  const back = useBack();
  const byN = useMemo(() => new Map(records.map((r) => [r.record_number, r])), [records]);
  const summary = useMemo(() => summarize(diary), [diary]);
  return (
    <Screen title={t.title} left={back} subtitle={t.lead}>
      <Notice>{t.private}</Notice>
      {diary.length === 0 ? (
        <Card>
          <P>{t.empty}</P>
          <Btn title={s.tabs.ask} onPress={() => router.navigate("/")} />
        </Card>
      ) : null}

      {summary.length ? (
        <Card>
          <H size={17}>{t.mySummary}</H>
          {summary.map((x) => {
            const r = byN.get(x.n);
            if (!r) return null;
            return (
              <Pressable key={x.n} accessibilityRole="button" onPress={() => router.push({ pathname: "/sign/[n]", params: { n: String(x.n) } })} style={{ gap: 4 }}>
                <P strong>{tr(r, lang).name}</P>
                <P muted small>{x.checked ? fmt(t.summary, { seen: x.seen, yes: x.yes, checked: x.checked }) : fmt(t.summaryNone, { seen: x.seen })}</P>
                {x.checked ? (
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "hidden" }}>
                    <View style={{ width: `${(x.yes / x.checked) * 100}%`, height: 8, backgroundColor: c.green }} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </Card>
      ) : null}

      {diary.map((e, i) => {
        const r = byN.get(e.n);
        if (!r) return null;
        const x = tr(r, lang);
        return (
          <FadeIn key={e.id} delay={Math.min(i, 6) * 40}>
            <Card>
              <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/sign/[n]", params: { n: String(e.n) } })} style={{ flexDirection: "row", gap: space.m, alignItems: "center" }}>
                <GroupIcon group={groupFor(r.record_number, r.category)} />
                <View style={{ flex: 1 }}>
                  <H size={16}>{x.name}</H>
                  <P muted small>{fmt(t.seenOn, { date: e.date })}</P>
                </View>
              </Pressable>
              {x.expected_weather ? (
                <View>
                  <Label>{d.signs.prediction}</Label>
                  <P small>{`${x.expected_weather}${x.expected_timing_text ? ` · ${x.expected_timing_text}` : ""}`}</P>
                </View>
              ) : null}
              <Label>{t.question}</Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Chip title={t.yes} selected={e.outcome === "yes"} onPress={() => setDiaryOutcome(e.id, "yes")} />
                <Chip title={t.no} selected={e.outcome === "no"} onPress={() => setDiaryOutcome(e.id, "no")} />
                <Chip title={t.waiting} selected={e.outcome === null} onPress={() => setDiaryOutcome(e.id, null)} />
              </View>
              <View style={{ flexDirection: "row" }}>
                <Btn small kind="danger" title={t.remove} onPress={() => removeSighting(e.id)} />
              </View>
            </Card>
          </FadeIn>
        );
      })}
    </Screen>
  );
}
