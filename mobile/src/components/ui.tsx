// Shared building blocks so every screen looks and behaves the same.
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useApp } from "@/lib/app";
import type { GroupKey } from "@/lib/explorer";
import type { TrustLevel } from "@/lib/scoring";
import { space, useTheme, type Theme } from "@/lib/theme";
import { font, type Weight } from "@/lib/type";

export function useFont() {
  const { lang } = useApp();
  return (w: Weight) => font(lang, w);
}

export function tap() {
  Haptics.selectionAsync().catch(() => {});
}

/** True when the phone asks for less motion; animations are then skipped. */
function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
  }, []);
  return reduced;
}

/** Content that rises gently into place the first time it appears. */
export function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: reduced ? 0 : 420, delay: reduced ? 0 : delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [v, delay, reduced]);
  return <Animated.View style={[{ opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }, style]}>{children}</Animated.View>;
}

export const shadow = (c: Theme): ViewStyle => ({ shadowColor: "#0f1a2e", shadowOpacity: c.paper === "#0f1a2e" ? 0 : 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: c.paper === "#0f1a2e" ? 0 : 2 });

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 18, padding: space.l, gap: space.s }, shadow(c), style]}>{children}</View>;
}

export function H({ children, size = 20, style }: { children: React.ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const c = useTheme();
  const f = useFont();
  return (
    <Text accessibilityRole="header" style={[{ color: c.ink, fontSize: size, lineHeight: Math.round(size * 1.4) }, f("head"), style]}>
      {children}
    </Text>
  );
}

export function P({ children, muted, small, strong, style }: { children: React.ReactNode; muted?: boolean; small?: boolean; strong?: boolean; style?: StyleProp<TextStyle> }) {
  const c = useTheme();
  const f = useFont();
  const size = small ? 14 : 16;
  // Ethiopic letters are tall: generous line height keeps them from being clipped.
  return <Text style={[{ color: muted ? c.muted : c.ink, fontSize: size, lineHeight: Math.round(size * 1.55) }, f(strong ? "strong" : "body"), style]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  const f = useFont();
  return <Text style={[{ color: c.muted, fontSize: 13, lineHeight: 20 }, f("strong")]}>{children}</Text>;
}

/** Small capital line above a title. */
export function Eyebrow({ children, color }: { children: React.ReactNode; color?: string }) {
  const c = useTheme();
  const f = useFont();
  return <Text style={[{ color: color ?? c.gold, fontSize: 12, lineHeight: 18, letterSpacing: 0.8, textTransform: "uppercase" }, f("strong")]}>{children}</Text>;
}

export function Btn({ title, onPress, kind = "primary", disabled, icon, small }: { title: string; onPress: () => void; kind?: "primary" | "ghost" | "danger" | "gold"; disabled?: boolean; icon?: React.ReactNode; small?: boolean }) {
  const c = useTheme();
  const f = useFont();
  const bg = kind === "primary" ? c.primary : kind === "gold" ? c.gold : "transparent";
  const fg = kind === "primary" ? c.onPrimary : kind === "gold" ? "#0f1a2e" : kind === "danger" ? c.weak : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: kind === "primary" ? c.primary : kind === "gold" ? c.gold : c.line, opacity: disabled ? 0.5 : 1, transform: [{ scale: pressed ? 0.97 : 1 }], minHeight: small ? 40 : 50, paddingHorizontal: small ? space.m : space.l },
      ]}>
      {icon}
      <Text style={[{ color: fg, fontSize: small ? 14 : 16, lineHeight: small ? 22 : 24, flexShrink: 1, textAlign: "center" }, f("strong")]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ title, selected, onPress }: { title: string; selected?: boolean; onPress: () => void }) {
  const c = useTheme();
  const f = useFont();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, { backgroundColor: selected ? c.primary : c.soft, borderColor: selected ? c.primary : c.line, opacity: pressed ? 0.75 : 1 }]}>
      <Text style={[{ color: selected ? c.onPrimary : c.ink, fontSize: 14, lineHeight: 22 }, f(selected ? "strong" : "body")]}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string; help?: string }) {
  const c = useTheme();
  const f = useFont();
  const { label, help, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...rest}
        style={[{ backgroundColor: c.field, color: c.ink, borderColor: c.line, borderWidth: 1, borderRadius: 12, paddingHorizontal: space.m, paddingVertical: 10, fontSize: 16, lineHeight: 24, minHeight: rest.multiline ? 96 : 48, textAlignVertical: rest.multiline ? "top" : "center" }, f("body"), style]}
      />
      {help ? <P muted small>{help}</P> : null}
    </View>
  );
}

export function TrustBadge({ level, label }: { level: TrustLevel | "untested"; label: string }) {
  const c = useTheme();
  const f = useFont();
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 999, borderWidth: 1.5, borderColor: c[level], paddingHorizontal: 10, paddingVertical: 2 }}>
      <Text style={[{ color: c[level], fontSize: 13, lineHeight: 20 }, f("strong")]}>{label}</Text>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** The score out of 10 as a ring that fills when it appears; shows a dash when the sign has no test yet. */
export function ScoreRing({ score, level, size = 64, label }: { score: number | null; level: TrustLevel | "untested"; size?: number; label: string }) {
  const c = useTheme();
  const reduced = useReducedMotion();
  const stroke = Math.max(5, Math.round(size / 10));
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const frac = score === null ? 0 : Math.max(0, Math.min(1, score / 10));
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    v.setValue(0);
    Animated.timing(v, { toValue: frac, duration: reduced ? 0 : 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [v, frac, reduced]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
        {frac > 0 ? (
          <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={c[level]} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${len} ${len}`} strokeDashoffset={v.interpolate({ inputRange: [0, 1], outputRange: [len, 0] })} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
      </Svg>
      <Text style={{ color: c.ink, fontSize: Math.round(size * 0.3), fontWeight: "700" }}>{score === null ? "–" : Number.isInteger(score) ? String(score) : score.toFixed(1)}</Text>
    </View>
  );
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  const c = useTheme();
  return (
    <View style={{ backgroundColor: tone === "warn" ? c.warnBg : c.soft, borderLeftWidth: 4, borderLeftColor: tone === "warn" ? c.gold : c.sky, borderRadius: 10, padding: space.m }}>
      <P small>{children}</P>
    </View>
  );
}

/** A labelled bar: used for score lists and rainfall. frac is 0–1. */
export function BarRow({ label, value, frac, color, onPress }: { label: string; value: string; frac: number; color: string; onPress?: () => void }) {
  const c = useTheme();
  const body = (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: space.s }}>
        <P small style={{ flex: 1 }}>{label}</P>
        <P small strong>{value}</P>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "hidden" }}>
        <View style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, height: 8, borderRadius: 4, backgroundColor: color }} />
      </View>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  const c = useTheme();
  const f = useFont();
  return (
    <View style={{ flex: 1, minWidth: 96, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 16, padding: space.m, gap: 2 }}>
      <Text style={[{ color: color ?? c.ink, fontSize: 28, lineHeight: 36 }, f("head")]}>{value}</Text>
      <P muted small>{label}</P>
    </View>
  );
}

export type IconName = "ask" | "signs" | "calendar" | "share" | "more" | "mic" | "stop" | "play" | "back" | "chevron" | "book" | "chart" | "rain" | "people" | "leaf" | "note" | "send" | "check" | "wifiOff" | "plus";
const PATHS: Record<IconName, string> = {
  ask: "M4 5h16v11H9l-5 4V5z",
  signs: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  share: "M12 16V4M7 9l5-5 5 5M5 14v6h14v-6",
  more: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z",
  mic: "M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4",
  stop: "M7 7h10v10H7z",
  play: "M8 5l11 7-11 7z",
  back: "M15 5l-7 7 7 7",
  chevron: "M9 5l7 7-7 7",
  book: "M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8",
  rain: "M7 14h9a4 4 0 0 0 0-8 5 5 0 0 0-9.6 1.5A3.5 3.5 0 0 0 7 14zM8 17l-1 3M12 17l-1 3M16 17l-1 3",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16 5a3 3 0 0 1 0 6M17 15c2 .5 4 2 4 5",
  leaf: "M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l8-8",
  note: "M6 3h9l4 4v14H6zM15 3v4h4M9 12h6M9 16h6",
  send: "M4 12l16-8-6 16-3-7z",
  check: "M5 12l5 5 9-10",
  wifiOff: "M3 9a14 14 0 0 1 18 0M6.5 12.5a9 9 0 0 1 11 0M10 16a4 4 0 0 1 4 0M12 19.5h.01M4 4l16 16",
  plus: "M12 5v14M5 12h14",
};
export function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

// One drawing per group of signs, in the group's own colour.
const GROUP_ART: Record<GroupKey, string> = {
  insects: "M12 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 14a2.3 2.3 0 1 0 0-4.6A2.3 2.3 0 0 0 12 14zM12 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM10.5 6L8 3.5M13.5 6L16 3.5M9.8 11L6 9.5M14.2 11L18 9.5M9.5 16L6 18M14.5 16L18 18",
  animals: "M3 13c3-5 7-7 11-6l4-2-1 4c1 3-1 7-5 8l-2 3-1-3c-3 0-5-2-6-4zM14.5 9.5h.01",
  wind: "M3 9h11a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M3 17h7",
  sky: "M15 4a8 8 0 1 0 5 13A7 7 0 0 1 15 4zM6 4v3M4.5 5.5h3M9 9v2M8 10h2",
  plants: "M12 21V10M12 13c-4 0-7-3-7-8 4 0 7 3 7 8zM12 11c0-4 3-7 7-7 0 4-3 7-7 7z",
};
export const groupColor = (c: Theme, g: GroupKey) => ({ insects: c.gold, animals: c.weak, wind: c.sky, sky: c.sky, plants: c.green })[g];

export function GroupIcon({ group, size = 44 }: { group: GroupKey; size?: number }) {
  const c = useTheme();
  const col = groupColor(c, group);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: col + "22", alignItems: "center", justifyContent: "center" }}>
      <Svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24">
        <Path d={GROUP_ART[group]} stroke={col} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </View>
  );
}

/** A row that opens another screen. */
export function LinkCard({ icon, title, text, onPress, badge }: { icon: IconName; title: string; text: string; onPress: () => void; badge?: string }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 18, padding: space.m, flexDirection: "row", alignItems: "center", gap: space.m, transform: [{ scale: pressed ? 0.98 : 1 }] }, shadow(c)]}>
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: c.soft, alignItems: "center", justifyContent: "center" }}>
        <Icon name={icon} color={c.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <H size={16}>{title}</H>
        <P muted small>{text}</P>
      </View>
      {badge ? (
        <View style={{ backgroundColor: c.gold, borderRadius: 999, minWidth: 24, paddingHorizontal: 8, alignItems: "center" }}>
          <Text style={{ color: "#0f1a2e", fontSize: 13, lineHeight: 22, fontWeight: "700" }}>{badge}</Text>
        </View>
      ) : null}
      <Icon name="chevron" color={c.muted} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.s, borderRadius: 14, borderWidth: 1, paddingVertical: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, justifyContent: "center" },
});
