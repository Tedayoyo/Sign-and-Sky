// Shown once, the first time the app opens: pick a language, see what the app does, start.
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, ImageBackground, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Btn, FadeIn, Icon, useFont, type IconName } from "@/components/ui";
import { useApp } from "@/lib/app";
import { LOCALES } from "@/lib/i18n";
import { space } from "@/lib/theme";
import { font } from "@/lib/type";
import { Pressable } from "react-native";

const POINT_ICONS: IconName[] = ["wifiOff", "signs", "mic"];

export function Welcome() {
  const { d, s, lang, setLang, finishWelcome } = useApp();
  const f = useFont();
  const insets = useSafeAreaInsets();
  return (
    <ImageBackground source={require("@/assets/photos/hero-landscape.jpg")} accessible accessibilityRole="image" accessibilityLabel={d.media.hero} resizeMode="cover" style={{ flex: 1, backgroundColor: "#0f1a2e" }}>
      <LinearGradient colors={["rgba(15,26,46,0.5)", "rgba(15,26,46,0.82)", "rgba(15,26,46,0.97)"]} locations={[0, 0.45, 1]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "flex-end", padding: space.xl, paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl, gap: space.l, maxWidth: 560, width: "100%", alignSelf: "center" }}>
          <FadeIn>
            <Image source={require("@/assets/images/splash-icon.png")} accessibilityIgnoresInvertColors style={{ width: 72, height: 72, borderRadius: 18 }} />
          </FadeIn>
          <FadeIn delay={100} style={{ gap: space.s }}>
            <Text style={[{ color: "#f0c56a", fontSize: 14, lineHeight: 20, letterSpacing: 1 }, f("strong")]}>SIGN & SKY</Text>
            <Text accessibilityRole="header" style={[{ color: "#fff", fontSize: 30, lineHeight: 42 }, f("head")]}>
              {d.landing.tagline}
            </Text>
          </FadeIn>
          <FadeIn delay={220} style={{ gap: space.m }}>
            {s.welcome.points.map((p, i) => (
              <View key={p} style={{ flexDirection: "row", gap: space.m, alignItems: "center" }}>
                <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: "#ffffff1f", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={POINT_ICONS[i]} color="#9fd6ae" size={20} />
                </View>
                <Text style={[{ color: "#e8edf2", fontSize: 16, lineHeight: 25, flex: 1 }, f("body")]}>{p}</Text>
              </View>
            ))}
          </FadeIn>
          <FadeIn delay={340} style={{ gap: space.s }}>
            <Text style={[{ color: "#c9d2da", fontSize: 14, lineHeight: 22 }, f("strong")]}>{s.welcome.choose}</Text>
            <View style={{ flexDirection: "row", gap: space.s }}>
              {LOCALES.map((l) => {
                const on = l === lang;
                return (
                  <Pressable
                    key={l}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setLang(l)}
                    style={{ flex: 1, minHeight: 54, borderRadius: 14, borderWidth: 2, borderColor: on ? "#f0c56a" : "#ffffff55", backgroundColor: on ? "#f0c56a22" : "transparent", alignItems: "center", justifyContent: "center" }}>
                    <Text style={[{ color: "#fff", fontSize: 18, lineHeight: 28 }, font(l, "strong")]}>{d.langName[l]}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ marginTop: space.s }}>
              <Btn kind="gold" title={s.welcome.start} onPress={finishWelcome} />
            </View>
          </FadeIn>
        </ScrollView>
      </LinearGradient>
    </ImageBackground>
  );
}
