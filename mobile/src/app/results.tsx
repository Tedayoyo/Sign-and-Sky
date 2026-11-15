// Results: every sign's preliminary score, the trust bands, and how a score is made (SNS-Score v1, unchanged).
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useBack } from "@/components/useBack";
import { BarRow, Card, Chip, FadeIn, H, Label, Notice, P, ScoreRing, Stat, TrustBadge, useFont } from "@/components/ui";
import { useApp } from "@/lib/app";
import { fmt } from "@/lib/i18n";
import { evaluationFor, tr } from "@/lib/records";
import { TRUST_LEVELS, trustLevel } from "@/lib/scoring";
import { space, useTheme } from "@/lib/theme";

const P_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

export default function ResultsScreen() {
  const c = useTheme();
  const f = useFont();
  const { d, lang, records } = useApp();
  const r = d.results;
  const dash = d.dashboard;
  const back = useBack();
  const [h, setH] = useState(1);
  const [p, setP] = useState(0.5);

  const data = useMemo(() => {
    const rows = records.map((x) => {
      const ev = evaluationFor(x, "wol");
      return { n: x.record_number, name: tr(x, lang).name, score: ev ? ev.score : null, field: !ev?.method_version || ev.method_version === "field-ai-2025", has: !!ev };
    });
    const field = rows.filter((x) => x.has && x.field && x.score !== null);
    const retested = rows.filter((x) => x.has && !x.field).length;
    const avg = field.length ? Math.round((field.reduce((a, x) => a + (x.score as number), 0) / field.length) * 10) / 10 : null;
    const bands = Object.fromEntries(TRUST_LEVELS.map((l) => [l, rows.filter((x) => x.score !== null && trustLevel(x.score) === l).length])) as Record<(typeof TRUST_LEVELS)[number], number>;
    return { rows: [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1)), field: field.length, retested, avg, bands };
  }, [records, lang]);

  // The published formula, unchanged: score = 10 × (0.5 × H + 0.5 × P).
  const calc = Math.round(10 * (0.5 * h + 0.5 * p) * 10) / 10;
  return (
    <Screen title={r.title} left={back} subtitle={r.intro}>
      <FadeIn style={{ flexDirection: "row", flexWrap: "wrap", gap: space.s }}>
        <Stat value={String(data.field)} label={dash.cards.preliminary[0]} color={c.fair} />
        <Stat value={String(data.retested)} label={dash.cards.retested[0]} color={c.sky} />
        <Stat value="0" label={dash.cards.validated[0]} color={c.muted} />
      </FadeIn>
      <Notice tone="warn">{dash.cards.preliminary[1]}</Notice>

      <Card>
        <H size={17}>{dash.overview}</H>
        {data.avg !== null ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
            <ScoreRing score={data.avg} level={trustLevel(data.avg)} size={80} label={`${dash.average}: ${data.avg}`} />
            <View style={{ flex: 1 }}>
              <P strong>{dash.average}</P>
              <P muted small>{dash.averageNote}</P>
            </View>
          </View>
        ) : null}
        <Label>{dash.distribution}</Label>
        {TRUST_LEVELS.map((l) => (
          <BarRow key={l} label={d.trust[l]} value={String(data.bands[l])} frac={records.length ? data.bands[l] / records.length : 0} color={c[l]} />
        ))}
        <P muted small>{r.trustRule}</P>
      </Card>

      <Card>
        <H size={17}>{dash.perSign}</H>
        {data.rows.map((x) => (
          <BarRow
            key={x.n}
            label={x.name}
            value={x.score === null ? "–" : String(x.score)}
            frac={(x.score ?? 0) / 10}
            color={x.score === null ? c.untested : c[trustLevel(x.score)]}
            onPress={() => router.push({ pathname: "/sign/[n]", params: { n: String(x.n) } })}
          />
        ))}
      </Card>

      <Card>
        <H size={17}>{r.methodTitle}</H>
        <P small>{r.methodField}</P>
        <P small>{r.methodNew}</P>
        <View style={{ backgroundColor: c.soft, borderRadius: 12, padding: space.m }}>
          <Text style={{ color: c.ink, fontSize: 17, lineHeight: 26, fontWeight: "700", textAlign: "center" }}>{r.formula}</Text>
        </View>
        <P small>{r.formulaH}</P>
        <P small>{r.formulaP}</P>
        <P muted small>{r.thresholds}</P>
        <P muted small>{r.datasets}</P>
      </Card>

      <Card>
        <H size={17}>{dash.calc.title}</H>
        <P muted small>{dash.calc.intro}</P>
        <Label>{dash.calc.h}</Label>
        <View style={{ flexDirection: "row", gap: space.s }}>
          <Chip title={dash.calc.yes} selected={h === 1} onPress={() => setH(1)} />
          <Chip title={dash.calc.no} selected={h === 0} onPress={() => setH(0)} />
        </View>
        <Label>{dash.calc.p}</Label>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {P_STEPS.map((v) => (
            <Chip key={v} title={v.toFixed(1)} selected={p === v} onPress={() => setP(v)} />
          ))}
        </View>
        <P muted small>{`0.0 = ${dash.calc.pLow} · 1.0 = ${dash.calc.pHigh}`}</P>
        <Label>{dash.calc.result}</Label>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.m }}>
          <ScoreRing score={calc} level={trustLevel(calc)} size={76} label={fmt(d.ask.gaugeLabel, { score: calc })} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[{ color: c.ink, fontSize: 15, lineHeight: 23 }, f("body")]}>{`10 × (0.5 × ${h} + 0.5 × ${p.toFixed(1)}) = ${calc}`}</Text>
            <TrustBadge level={trustLevel(calc)} label={d.trust[trustLevel(calc)]} />
          </View>
        </View>
        <P muted small>{dash.calc.note}</P>
      </Card>

      <Card>
        <H size={17}>{dash.retestedTitle}</H>
        <P small>{data.retested ? dash.cards.retested[1] : dash.retestedEmpty}</P>
      </Card>
    </Screen>
  );
}
