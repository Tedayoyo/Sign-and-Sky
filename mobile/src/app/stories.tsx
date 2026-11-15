// Wisdom Written in Nature: the field record season by season, with the meanings farmers gave.
// No invented stories or quotes: only what is in the published library.
import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useBack } from "@/components/useBack";
import { Btn, Card, FadeIn, GroupIcon, H, Label, P } from "@/components/ui";
import { useApp } from "@/lib/app";
import { groupFor } from "@/lib/explorer";
import { parseObservations } from "@/lib/observations";
import type { SeasonKey } from "@/lib/places";
import { tr } from "@/lib/records";
import { space, useTheme } from "@/lib/theme";

const ORDER: SeasonKey[] = ["belg", "kiremt", "bega"];

export default function StoriesScreen() {
  const c = useTheme();
  const { d, lang, records } = useApp();
  const t = d.stories;
  const back = useBack();
  const bySeason = useMemo(() => {
    const out: Record<SeasonKey, { n: number; name: string; meaning: string | null; seen: string | null; group: ReturnType<typeof groupFor> }[]> = { belg: [], kiremt: [], bega: [] };
    for (const r of records) {
      const seasons = new Set(parseObservations(r.observation_period ?? "").map((o) => o.season));
      for (const s of seasons) out[s].push({ n: r.record_number, name: tr(r, lang).name, meaning: tr(r, lang).interpretation, seen: r.observation_period, group: groupFor(r.record_number, r.category) });
    }
    return out;
  }, [records, lang]);
  const color = { belg: c.green, kiremt: c.sky, bega: c.gold };
  return (
    <Screen title={t.title} left={back} subtitle={t.lead} eyebrow={t.eyebrow} photo={{ source: require("@/assets/photos/stories-farmer.jpg"), alt: d.media.stories, caption: d.media.illustrative }}>
      <Card>
        {t.documented.map(([value, label]) => (
          <View key={value} style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
            <H size={28} style={{ color: c.primary, width: 72 }}>{value}</H>
            <P small style={{ flex: 1 }}>{label}</P>
          </View>
        ))}
      </Card>
      <Card>
        <H size={17}>{t.documentedTitle}</H>
        <P small>{t.documentedText}</P>
      </Card>

      <H size={19}>{t.bySeason}</H>
      {ORDER.map((k) => (
        <View key={k} style={{ gap: space.s }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.s }}>
            <View style={{ width: 6, height: 30, borderRadius: 3, backgroundColor: color[k] }} />
            <View style={{ flex: 1 }}>
              <H size={17}>{d.calendar.seasons[k][0]}</H>
              <P muted small>{`${d.calendar.seasons[k][1]} · ${d.calendar.seasons[k][2]}`}</P>
            </View>
          </View>
          {bySeason[k].map((x, i) => (
            <FadeIn key={x.n} delay={Math.min(i, 6) * 40}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/sign/[n]", params: { n: String(x.n) } })}
                style={({ pressed }) => ({ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: color[k], borderRadius: 16, padding: space.m, flexDirection: "row", gap: space.m, opacity: pressed ? 0.75 : 1 })}>
                <GroupIcon group={x.group} />
                <View style={{ flex: 1, gap: 2 }}>
                  <H size={16}>{x.name}</H>
                  {x.meaning ? (
                    <>
                      <Label>{t.meaning}</Label>
                      <P small>{x.meaning}</P>
                    </>
                  ) : null}
                  {x.seen ? <P muted small>{`${t.seen}: ${x.seen}`}</P> : null}
                </View>
              </Pressable>
            </FadeIn>
          ))}
        </View>
      ))}

      <Card>
        <H size={17}>{t.consentTitle}</H>
        <P small>{t.consentText}</P>
        <Btn title={t.shareCta} onPress={() => router.navigate("/share")} />
      </Card>
    </Screen>
  );
}
