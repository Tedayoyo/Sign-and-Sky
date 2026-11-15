// About and mission: why Sign & Sky exists, how it works, and what it promises.
import { router } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useBack } from "@/components/useBack";
import { Card, FadeIn, H, LinkCard, P, useFont } from "@/components/ui";
import { useApp } from "@/lib/app";
import { space, useTheme } from "@/lib/theme";

export default function AboutScreen() {
  const c = useTheme();
  const f = useFont();
  const { d, s } = useApp();
  const a = d.about;
  const how = d.landing.how;
  const back = useBack();
  return (
    <Screen title={a.title} left={back} subtitle={a.lead} photo={{ source: require("@/assets/photos/community-farmers.jpg"), alt: d.media.community, caption: d.media.illustrative }}>
      <Card>
        <H size={18}>{how.title}</H>
        {how.steps.map(([title, text], i) => (
          <FadeIn key={title} delay={i * 70} style={{ flexDirection: "row", gap: space.m }}>
            <View style={{ alignItems: "center" }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: c.onPrimary, fontSize: 15, fontWeight: "700" }}>{i + 1}</Text>
              </View>
              {i < how.steps.length - 1 ? <View style={{ width: 2, flex: 1, backgroundColor: c.line, marginVertical: 4 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: space.m }}>
              <Text style={[{ color: c.ink, fontSize: 16, lineHeight: 24 }, f("strong")]}>{title}</Text>
              <P muted small>{text}</P>
            </View>
          </FadeIn>
        ))}
      </Card>

      <H size={19}>{d.mission.title}</H>
      {d.mission.items.map(([key, title, text]) => (
        <Card key={key}>
          <H size={16}>{title}</H>
          <P small>{text}</P>
        </Card>
      ))}

      <Card style={{ borderLeftWidth: 5, borderLeftColor: c.gold }}>
        <H size={17}>{a.promisesTitle}</H>
        {a.promises.map((p) => (
          <View key={p} style={{ flexDirection: "row", gap: space.s }}>
            <Text style={{ color: c.gold, fontSize: 16, lineHeight: 24 }}>●</Text>
            <P small style={{ flex: 1 }}>{p}</P>
          </View>
        ))}
      </Card>

      <Card>
        <H size={17}>{a.source.title}</H>
        <P small>{a.source.lead}</P>
        <P muted small>{s.more.scope}</P>
      </Card>
      <P muted small>{d.mission.teamTeaser}</P>
      <LinkCard icon="people" title={s.explore.team[0]} text={s.explore.team[1]} onPress={() => router.push("/team")} />
    </Screen>
  );
}
