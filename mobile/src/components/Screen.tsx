// The frame every tab shares: navy header with the title, the offline badge and the language switch.
import React from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/lib/app";
import { otherLocale } from "@/lib/i18n";
import { space, useTheme } from "@/lib/theme";

export function Screen({ title, children, left, scrollRef }: { title: string; children: React.ReactNode; left?: React.ReactNode; scrollRef?: React.RefObject<React.ComponentRef<typeof ScrollView> | null> }) {
  const c = useTheme();
  const { lang, setLang, d, s, online } = useApp();
  const insets = useSafeAreaInsets();
  const other = otherLocale(lang);
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={{ backgroundColor: c.header, paddingTop: insets.top + space.s, paddingBottom: space.m, paddingHorizontal: space.l, flexDirection: "row", alignItems: "center", gap: space.s }}>
        {left}
        <Text accessibilityRole="header" numberOfLines={2} style={{ color: c.onDark, fontSize: 20, lineHeight: 28, fontWeight: "700", flex: 1 }}>
          {title}
        </Text>
        {!online ? (
          <View style={{ backgroundColor: c.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 2 }}>
            <Text style={{ color: "#0f1a2e", fontSize: 12, lineHeight: 18, fontWeight: "700" }}>{s.offlineBadge}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={d.langName[other]}
          onPress={() => setLang(other)}
          hitSlop={8}
          style={({ pressed }) => ({ borderColor: "#ffffff66", borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, minHeight: 36, justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ color: c.onDark, fontSize: 14, lineHeight: 22, fontWeight: "600" }}>{d.langName[other]}</Text>
        </Pressable>
      </View>
      <ScrollView ref={scrollRef} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space.l, gap: space.l, paddingBottom: space.xl * 2, maxWidth: 720, width: "100%", alignSelf: "center" }}>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
