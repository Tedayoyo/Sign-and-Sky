// Meet the team. Portraits are the photographs the team supplied, resized only.
import React from "react";
import { Image, Text, View } from "react-native";
import { Screen } from "@/components/Screen";
import { useBack } from "@/components/useBack";
import { FadeIn, H, Label, P, shadow, useFont } from "@/components/ui";
import { useApp } from "@/lib/app";
import { space, useTheme } from "@/lib/theme";

// Same order as the website's team page.
const PHOTOS = [require("@/assets/photos/tewodros-birhanu-lera.jpg"), require("@/assets/photos/tesfaye-latebo.jpg"), require("@/assets/photos/ermias-gosaye.jpg")];

export default function TeamScreen() {
  const c = useTheme();
  const f = useFont();
  const { d } = useApp();
  const t = d.team;
  const back = useBack();
  return (
    <Screen title={t.title} left={back} subtitle={t.lead} eyebrow={t.eyebrow}>
      {t.members.map((m, i) => (
        <FadeIn key={m.name} delay={i * 120}>
          <View style={[{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 20, overflow: "hidden" }, shadow(c)]}>
            {PHOTOS[i] ? <Image source={PHOTOS[i]} accessibilityLabel={m.name} accessibilityIgnoresInvertColors resizeMode="cover" style={{ width: "100%", aspectRatio: 4 / 5, maxHeight: 420, backgroundColor: c.soft }} /> : null}
            <View style={{ padding: space.l, gap: 6 }}>
              <H size={20}>{m.name}</H>
              <Text style={[{ color: c.gold, fontSize: 15, lineHeight: 23 }, f("strong")]}>{m.role}</Text>
              {m.meta ? <P muted small>{m.meta}</P> : null}
              <Label>{t.expertise}</Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {m.expertise.map((x) => (
                  <View key={x} style={{ backgroundColor: c.soft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                    <P small>{x}</P>
                  </View>
                ))}
              </View>
              <Label>{t.contribution}</Label>
              <P small>{m.bio}</P>
            </View>
          </View>
        </FadeIn>
      ))}
    </Screen>
  );
}
