// Seasonal calendar for Wolaita: Belg, Kiremt (Meher) and Bega, the signs seen in each month of 2025,
// and the average rainfall the phone last downloaded from the website (never estimated in the app).
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Card, H, Label, LinkCard, Notice, P, useFont } from "@/components/ui";
import { useApp } from "@/lib/app";
import { fmt } from "@/lib/i18n";
import { parseObservations } from "@/lib/observations";
import { seasonFor, type SeasonKey } from "@/lib/places";
import { tr } from "@/lib/records";
import { space, useTheme, type Theme } from "@/lib/theme";

const seasonColor = (c: Theme, s: SeasonKey) => (s === "belg" ? c.green : s === "kiremt" ? c.sky : c.gold);

export default function CalendarScreen() {
  const c = useTheme();
  const { d, s, lang, records, climate } = useApp();
  const cal = d.calendar;
  const thisMonth = new Date().getMonth() + 1;
  const [month, setMonth] = useState(thisMonth);
  const season = seasonFor("wol", month);

  const byMonth = useMemo(() => {
    const out: Record<number, { n: number; name: string; day: number | null }[]> = {};
    for (const r of records) {
      for (const o of parseObservations(r.observation_period ?? "")) {
        (out[o.month] ??= []).push({ n: r.record_number, name: tr(r, lang).name, day: o.day });
      }
    }
    for (const list of Object.values(out)) list.sort((a, b) => (a.day ?? 99) - (b.day ?? 99));
    return out;
  }, [records, lang]);

  const max = climate ? Math.max(1, ...climate.normal.map((v) => v ?? 0)) : 1;
  const seen = byMonth[month] ?? [];
  return (
    <Screen title={cal.title} subtitle={cal.lead} eyebrow={cal.eyebrow} photo={{ source: require("@/assets/photos/calendar-storm.jpg"), alt: d.media.calendar }}>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
        {cal.months.map((name, i) => {
          const m = i + 1;
          const on = m === month;
          const col = seasonColor(c, seasonFor("wol", m));
          return (
            <Pressable
              key={name}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${name}, ${cal.seasons[seasonFor("wol", m)][0]}${m === thisMonth ? `, ${s.calendar.thisMonth}` : ""}`}
              onPress={() => setMonth(m)}
              style={{ width: "22.8%", flexGrow: 1, minHeight: 56, borderRadius: 12, borderWidth: on ? 2.5 : 1, borderColor: on ? col : c.line, backgroundColor: c.card, alignItems: "center", justifyContent: "center", paddingVertical: 6 }}>
              <Text style={{ color: c.ink, fontSize: 15, lineHeight: 22, fontWeight: on ? "700" : "500" }}>{name}</Text>
              <View style={{ flexDirection: "row", gap: 4, alignItems: "center", height: 14 }}>
                <View style={{ width: 18, height: 4, borderRadius: 2, backgroundColor: col }} />
                {byMonth[m]?.length ? <Text style={{ color: c.muted, fontSize: 11, lineHeight: 14 }}>{byMonth[m].length}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card style={{ borderLeftWidth: 5, borderLeftColor: seasonColor(c, season) }}>
        <Label>{`${cal.months[month - 1]}${month === thisMonth ? ` · ${s.calendar.thisMonth}` : ""}`}</Label>
        <H size={18}>{`${cal.seasons[season][0]} · ${cal.seasons[season][1]}`}</H>
        <P>{cal.seasons[season][2]}</P>
        {climate && climate.normal[month - 1] !== null ? (
          <P small>{`${cal.rainTitle}: ${climate.normal[month - 1]} mm`}</P>
        ) : null}
        <P muted small>{cal.activitiesNote}</P>
      </Card>

      <View style={{ gap: space.s }}>
        <H size={17}>{`${cal.observationsTitle} · ${cal.months[month - 1]}`}</H>
        {seen.length === 0 ? <P muted>{s.calendar.noSigns}</P> : null}
        {seen.map((o, i) => (
          <Pressable
            key={`${o.n}-${i}`}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/sign/[n]", params: { n: String(o.n) } })}
            style={({ pressed }) => ({ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 12, padding: space.m, flexDirection: "row", gap: space.m, alignItems: "center", opacity: pressed ? 0.75 : 1 })}>
            <View style={{ width: 44, alignItems: "center" }}>
              <Text style={{ color: c.ink, fontSize: 20, lineHeight: 28, fontWeight: "700" }}>{o.day ?? "–"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <P>{o.name}</P>
              {o.day === null ? <P muted small>{cal.dayUnknown}</P> : null}
            </View>
          </Pressable>
        ))}
      </View>

      <Card>
        <H size={17}>{cal.rainTitle}</H>
        {climate ? (
          <>
            <View accessible accessibilityRole="image" accessibilityLabel={`${cal.rainTitle}: ${cal.months.map((m, i) => `${m} ${climate.normal[i] ?? "–"} mm`).join(", ")}`} style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 150, marginTop: space.s }}>
              {climate.normal.map((v, i) => (
                <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <Text style={{ color: c.muted, fontSize: 10, lineHeight: 14 }}>{v === null ? "–" : Math.round(v)}</Text>
                  <View style={{ width: "100%", height: v === null ? 2 : Math.max(2, (v / max) * 110), backgroundColor: seasonColor(c, seasonFor("wol", i + 1)), opacity: i + 1 === month ? 1 : 0.55, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
                  <Text style={{ color: c.muted, fontSize: 10, lineHeight: 16 }}>{cal.months[i].slice(0, lang === "am" ? 2 : 1)}</Text>
                </View>
              ))}
            </View>
            <P muted small>{`${climate.normal_period}, mm. ${climate.source}`}</P>
            {climate.credit ? <P muted small>{climate.credit}</P> : null}
            <P muted small>{fmt(s.calendar.rainSaved, { date: climate.at.slice(0, 10) })}</P>
          </>
        ) : (
          <Notice>{s.calendar.rainMissing}</Notice>
        )}
      </Card>
      <LinkCard icon="rain" title={s.explore.rainfall[0]} text={s.explore.rainfall[1]} onPress={() => router.push("/rainfall")} />
    </Screen>
  );
}
