// Rainfall at the Offa Woreda study point, year by year, exactly as the website reported it when the
// phone was last online. Missing months stay missing; nothing is filled in.
import React, { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useBack } from "@/components/useBack";
import { Card, Chip, H, Notice, P, useFont } from "@/components/ui";
import { useApp } from "@/lib/app";
import { fmt } from "@/lib/i18n";
import { seasonFor, type SeasonKey } from "@/lib/places";
import { space, useTheme, type Theme } from "@/lib/theme";

const seasonColor = (c: Theme, s: SeasonKey) => (s === "belg" ? c.green : s === "kiremt" ? c.sky : c.gold);
const SEASONS: SeasonKey[] = ["belg", "kiremt", "bega"];

export default function RainfallScreen() {
  const c = useTheme();
  const f = useFont();
  const { d, s, lang, climate } = useApp();
  const t = s.rainfall;
  const cal = d.calendar;
  const back = useBack();
  const years = useMemo(() => Object.keys(climate?.years ?? {}).map(Number).sort((a, b) => b - a), [climate]);
  const [picked, setPicked] = useState<number | null>(null);
  const year = picked ?? years[0] ?? null;
  const months = year !== null ? climate?.years?.[String(year)] ?? null : null;
  const season = year !== null ? climate?.seasons?.find((r) => r.year === year) ?? null : null;
  const max = Math.max(1, ...(months ?? []).map((v) => v ?? 0), ...(climate?.normal ?? []).map((v) => v ?? 0));
  const H_MAX = 130;

  return (
    <Screen title={s.explore.rainfall[0]} left={back} subtitle={d.places.wol.label}>
      {!climate || !months ? (
        <Notice>{t.missing}</Notice>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
            {years.map((y) => (
              <Chip key={y} title={String(y)} selected={y === year} onPress={() => setPicked(y)} />
            ))}
          </ScrollView>

          <Card>
            <H size={17}>{fmt(t.monthly, { year: year as number })}</H>
            <View
              accessible
              accessibilityRole="image"
              accessibilityLabel={`${fmt(t.monthly, { year: year as number })}: ${cal.months.map((m, i) => `${m} ${months[i] ?? t.incomplete}`).join(", ")}`}
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: H_MAX + 40, marginTop: space.s }}>
              {months.map((v, i) => {
                const n = climate.normal[i];
                return (
                  <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                    <Text style={{ color: c.muted, fontSize: 10, lineHeight: 14 }}>{v === null ? "–" : Math.round(v)}</Text>
                    <View style={{ width: "100%", height: H_MAX, justifyContent: "flex-end" }}>
                      <View style={{ width: "100%", height: v === null ? 0 : Math.max(2, (v / max) * H_MAX), backgroundColor: seasonColor(c, seasonFor("wol", i + 1)), borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                      {n !== null ? <View style={{ position: "absolute", left: -1, right: -1, bottom: (n / max) * H_MAX - 1, height: 2.5, backgroundColor: c.ink, borderRadius: 2 }} /> : null}
                    </View>
                    <Text style={[{ color: c.muted, fontSize: 10, lineHeight: 16 }, f("body")]}>{cal.months[i].slice(0, lang === "am" ? 2 : 1)}</Text>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.m, alignItems: "center" }}>
              {SEASONS.map((k) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: seasonColor(c, k) }} />
                  <P muted small>{cal.seasons[k][0]}</P>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 16, height: 2.5, backgroundColor: c.ink }} />
                <P muted small>{fmt(t.legendNormal, { period: climate.normal_period })}</P>
              </View>
            </View>
          </Card>

          {season ? (
            <Card>
              <H size={17}>{fmt(t.seasonal, { year: year as number })}</H>
              <View style={{ flexDirection: "row", borderBottomColor: c.line, borderBottomWidth: 1, paddingBottom: 6 }}>
                <P muted small style={{ flex: 1.4 }}>{t.season}</P>
                <P muted small style={{ flex: 1, textAlign: "right" }}>{t.total}</P>
                <P muted small style={{ flex: 1, textAlign: "right" }}>{t.normal}</P>
              </View>
              {SEASONS.map((k) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4 }}>
                  <View style={{ flex: 1.4, flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={{ width: 6, height: 28, borderRadius: 3, backgroundColor: seasonColor(c, k) }} />
                    <View style={{ flex: 1 }}>
                      <P strong>{cal.seasons[k][0]}</P>
                      <P muted small>{cal.seasons[k][1]}</P>
                    </View>
                  </View>
                  <P strong style={{ flex: 1, textAlign: "right" }}>{season[k] === null ? t.incomplete : String(season[k])}</P>
                  <P style={{ flex: 1, textAlign: "right" }}>{climate.season_normal?.[k] ?? "–"}</P>
                </View>
              ))}
            </Card>
          ) : null}

          <Card>
            <P muted small>{climate.source}</P>
            {climate.credit ? <P muted small>{climate.credit}</P> : null}
            {climate.last_date ? <P muted small>{fmt(t.lastDay, { date: climate.last_date })}</P> : null}
            <P muted small>{fmt(s.calendar.rainSaved, { date: climate.at.slice(0, 10) })}</P>
          </Card>
        </>
      )}
    </Screen>
  );
}
