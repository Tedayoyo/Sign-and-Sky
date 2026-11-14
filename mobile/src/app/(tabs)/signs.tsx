// The sign library: search, groups and trust filter, all from the copy on the phone.
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Screen } from "@/components/Screen";
import { Chip, Field, H, P, ScoreRing, TrustBadge } from "@/components/ui";
import { useApp } from "@/lib/app";
import { GROUPS, groupFor, type GroupKey } from "@/lib/explorer";
import { fmt } from "@/lib/i18n";
import { normalize } from "@/lib/match";
import { evaluationFor, tr } from "@/lib/records";
import { TRUST_LEVELS, trustLevel, type TrustLevel } from "@/lib/scoring";
import { space, useTheme } from "@/lib/theme";

export default function SignsScreen() {
  const c = useTheme();
  const { d, lang, records } = useApp();
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<GroupKey | null>(null);
  const [trust, setTrust] = useState<TrustLevel | null>(null);

  const rows = useMemo(() => {
    const needle = normalize(q);
    return records
      .map((r) => {
        const t = tr(r, lang);
        const ev = evaluationFor(r, "wol");
        return { r, t, score: ev ? ev.score : null, level: (ev ? trustLevel(ev.score) : "untested") as TrustLevel | "untested", group: groupFor(r.record_number, r.category) };
      })
      .filter((x) => !group || x.group === group)
      .filter((x) => !trust || x.level === trust)
      .filter((x) => {
        if (!needle) return true;
        const hay = normalize([x.t.name, x.t.description, x.t.interpretation, x.t.expected_weather, ...(x.t.keywords ?? []), x.r.tr.en?.name, ...(x.r.tr.en?.keywords ?? [])].filter(Boolean).join(" "));
        return hay.includes(needle);
      });
  }, [records, lang, q, group, trust]);

  return (
    <Screen title={d.signs.title}>
      <P muted>{d.signs.intro}</P>
      <Field label={d.signs.search} value={q} onChangeText={setQ} placeholder={d.signs.searchPlaceholder} autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
        <Chip title={d.explorer.all} selected={!group} onPress={() => setGroup(null)} />
        {GROUPS.map((g) => (
          <Chip key={g} title={d.explorer.groups[g]} selected={group === g} onPress={() => setGroup(group === g ? null : g)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s }}>
        <Chip title={d.signs.allTrust} selected={!trust} onPress={() => setTrust(null)} />
        {TRUST_LEVELS.map((l) => (
          <Chip key={l} title={d.trust[l]} selected={trust === l} onPress={() => setTrust(trust === l ? null : l)} />
        ))}
      </ScrollView>
      <P muted small>{fmt(d.signs.count, { n: rows.length })}</P>
      {rows.length === 0 ? <P>{d.signs.none}</P> : null}
      {rows.map(({ r, t, score, level, group: g }) => (
        <Pressable
          key={r.record_number}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: "/sign/[n]", params: { n: String(r.record_number) } })}
          style={({ pressed }) => ({ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: space.m, flexDirection: "row", gap: space.m, alignItems: "center", opacity: pressed ? 0.75 : 1 })}>
          <ScoreRing score={score} level={level} size={58} label={score === null ? d.ask.notTested : fmt(d.ask.gaugeLabel, { score })} />
          <View style={{ flex: 1, gap: 4 }}>
            <P muted small>{d.explorer.groups[g]}</P>
            <H size={16}>{t.name}</H>
            {t.expected_weather ? <P small>{t.expected_weather}</P> : null}
            <TrustBadge level={level} label={d.trust[level]} />
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
