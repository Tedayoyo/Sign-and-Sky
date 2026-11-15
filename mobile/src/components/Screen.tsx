// The frame every screen shares: a header (photo or gradient) with the title, the offline badge and
// the language switch, then the scrolling content.
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, useFont } from "@/components/ui";
import { useApp } from "@/lib/app";
import { otherLocale } from "@/lib/i18n";
import { font } from "@/lib/type";
import { space, useTheme } from "@/lib/theme";

type Props = {
  title: string;
  children: React.ReactNode;
  left?: React.ReactNode;
  /** A line under the title. */
  subtitle?: string;
  /** A small line above the title. */
  eyebrow?: string;
  /** Header photograph with what it shows (read by screen readers) and an optional caption such as "Illustrative photo". */
  photo?: { source: ImageSourcePropType; alt: string; caption?: string };
  scrollRef?: React.RefObject<React.ComponentRef<typeof ScrollView> | null>;
};

export function Screen({ title, children, left, subtitle, eyebrow, photo, scrollRef }: Props) {
  const c = useTheme();
  const f = useFont();
  const { lang, setLang, d, s, online } = useApp();
  const insets = useSafeAreaInsets();
  const other = otherLocale(lang);
  const big = !!photo || !!subtitle;

  const bar = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: space.s, minHeight: 40 }}>
      {left}
      {!big ? (
        <Text accessibilityRole="header" numberOfLines={2} style={[{ color: "#fff", fontSize: 20, lineHeight: 28, flex: 1 }, f("head")]}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {!online ? (
        <View style={{ backgroundColor: c.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, flexDirection: "row", gap: 4, alignItems: "center" }}>
          <Icon name="wifiOff" color="#0f1a2e" size={14} />
          <Text style={[{ color: "#0f1a2e", fontSize: 12, lineHeight: 18 }, f("strong")]}>{s.offlineBadge}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={d.langName[other]}
        onPress={() => setLang(other)}
        hitSlop={8}
        style={({ pressed }) => ({ backgroundColor: "#ffffff22", borderColor: "#ffffff66", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
        <Text style={[{ color: "#fff", fontSize: 14, lineHeight: 22 }, font(other, "strong")]}>{d.langName[other]}</Text>
      </Pressable>
    </View>
  );
  const heading = big ? (
    <View style={{ gap: 4, marginTop: photo ? space.xl * 2 : space.m }}>
      {eyebrow ? <Text style={[{ color: "#f0c56a", fontSize: 12, lineHeight: 18, letterSpacing: 0.8, textTransform: "uppercase" }, f("strong")]}>{eyebrow}</Text> : null}
      <Text accessibilityRole="header" style={[{ color: "#fff", fontSize: 26, lineHeight: 36 }, f("head")]}>
        {title}
      </Text>
      {subtitle ? <Text style={[{ color: "#e3e9ee", fontSize: 15, lineHeight: 23 }, f("body")]}>{subtitle}</Text> : null}
      {photo?.caption ? <Text style={[{ color: "#c9d2da", fontSize: 11, lineHeight: 16, marginTop: 2 }, f("body")]}>{photo.caption}</Text> : null}
    </View>
  ) : null;
  const pad = { paddingTop: insets.top + space.s, paddingBottom: big ? space.xl : space.m, paddingHorizontal: space.l };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" stickyHeaderIndices={big ? undefined : [0]} contentContainerStyle={{ paddingBottom: space.xl * 2 }}>
        {photo ? (
          <View style={{ backgroundColor: c.header, overflow: "hidden" }}>
            <Image source={photo.source} accessible accessibilityRole="image" accessibilityLabel={photo.alt} accessibilityIgnoresInvertColors resizeMode="cover" style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]} />
            <LinearGradient colors={["rgba(15,26,46,0.55)", "rgba(15,26,46,0.25)", "rgba(15,26,46,0.92)"]} locations={[0, 0.35, 1]} style={pad}>
              {bar}
              {heading}
            </LinearGradient>
          </View>
        ) : (
          <LinearGradient colors={[c.header, c.paper === "#0f1a2e" ? "#132a2c" : "#1f4d36"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={pad}>
            {bar}
            {heading}
          </LinearGradient>
        )}
        <View style={{ padding: space.l, gap: space.l, maxWidth: 720, width: "100%", alignSelf: "center", marginTop: big ? -space.m : 0 }}>{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function BackButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffff22", alignItems: "center", justifyContent: "center" }}>
      <Icon name="back" color="#fff" size={22} />
    </Pressable>
  );
}
