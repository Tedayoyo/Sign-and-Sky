// Shared building blocks so every screen looks and behaves the same.
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import type { TrustLevel } from "@/lib/scoring";
import { space, useTheme } from "@/lib/theme";

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[{ backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 14, padding: space.l, gap: space.s }, style]}>{children}</View>;
}

export function H({ children, size = 20, style }: { children: React.ReactNode; size?: number; style?: StyleProp<TextStyle> }) {
  const c = useTheme();
  return (
    <Text accessibilityRole="header" style={[{ color: c.ink, fontSize: size, lineHeight: Math.round(size * 1.4), fontWeight: "700" }, style]}>
      {children}
    </Text>
  );
}

export function P({ children, muted, small, style }: { children: React.ReactNode; muted?: boolean; small?: boolean; style?: StyleProp<TextStyle> }) {
  const c = useTheme();
  const size = small ? 14 : 16;
  // Ethiopic letters are tall: generous line height keeps them from being clipped.
  return <Text style={[{ color: muted ? c.muted : c.ink, fontSize: size, lineHeight: Math.round(size * 1.55) }, style]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  return <Text style={{ color: c.muted, fontSize: 13, lineHeight: 20, fontWeight: "600" }}>{children}</Text>;
}

export function Btn({ title, onPress, kind = "primary", disabled, icon, small }: { title: string; onPress: () => void; kind?: "primary" | "ghost" | "danger"; disabled?: boolean; icon?: React.ReactNode; small?: boolean }) {
  const c = useTheme();
  const bg = kind === "primary" ? c.primary : "transparent";
  const fg = kind === "primary" ? c.onPrimary : kind === "danger" ? c.weak : c.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor: kind === "primary" ? c.primary : c.line, opacity: disabled ? 0.5 : pressed ? 0.75 : 1, minHeight: small ? 40 : 48, paddingHorizontal: small ? space.m : space.l },
      ]}>
      {icon}
      <Text style={{ color: fg, fontSize: small ? 14 : 16, lineHeight: small ? 22 : 24, fontWeight: "600", flexShrink: 1, textAlign: "center" }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ title, selected, onPress }: { title: string; selected?: boolean; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, { backgroundColor: selected ? c.primary : c.soft, borderColor: selected ? c.primary : c.line, opacity: pressed ? 0.75 : 1 }]}>
      <Text style={{ color: selected ? c.onPrimary : c.ink, fontSize: 14, lineHeight: 22, fontWeight: selected ? "700" : "500" }}>{title}</Text>
    </Pressable>
  );
}

export function Field(props: TextInputProps & { label: string; help?: string }) {
  const c = useTheme();
  const { label, help, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        {...rest}
        style={[{ backgroundColor: c.field, color: c.ink, borderColor: c.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: space.m, paddingVertical: 10, fontSize: 16, lineHeight: 24, minHeight: rest.multiline ? 96 : 48, textAlignVertical: rest.multiline ? "top" : "center" }, style]}
      />
      {help ? <P muted small>{help}</P> : null}
    </View>
  );
}

export function TrustBadge({ level, label }: { level: TrustLevel | "untested"; label: string }) {
  const c = useTheme();
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 999, borderWidth: 1.5, borderColor: c[level], paddingHorizontal: 10, paddingVertical: 2 }}>
      <Text style={{ color: c[level], fontSize: 13, lineHeight: 20, fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

/** The score out of 10 as a ring; shows a dash when the sign has no test yet. */
export function ScoreRing({ score, level, size = 64, label }: { score: number | null; level: TrustLevel | "untested"; size?: number; label: string }) {
  const c = useTheme();
  const stroke = Math.max(5, Math.round(size / 10));
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const frac = score === null ? 0 : Math.max(0, Math.min(1, score / 10));
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.line} strokeWidth={stroke} fill="none" />
        {frac > 0 ? (
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c[level]} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${len * frac} ${len}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        ) : null}
      </Svg>
      <Text style={{ color: c.ink, fontSize: Math.round(size * 0.3), fontWeight: "700" }}>{score === null ? "–" : Number.isInteger(score) ? String(score) : score.toFixed(1)}</Text>
    </View>
  );
}

export function Notice({ children, tone = "info" }: { children: React.ReactNode; tone?: "info" | "warn" }) {
  const c = useTheme();
  return (
    <View style={{ backgroundColor: tone === "warn" ? c.warnBg : c.soft, borderLeftWidth: 4, borderLeftColor: tone === "warn" ? c.gold : c.sky, borderRadius: 8, padding: space.m }}>
      <P small>{children}</P>
    </View>
  );
}

export type IconName = "ask" | "signs" | "calendar" | "share" | "more" | "mic" | "stop" | "play" | "back";
const PATHS: Record<IconName, string> = {
  ask: "M4 5h16v11H9l-5 4V5z",
  signs: "M5 4h14v16H5zM8 8h8M8 12h8M8 16h5",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  share: "M12 16V4M7 9l5-5 5 5M5 14v6h14v-6",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  mic: "M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM6 11a6 6 0 0 0 12 0M12 17v4",
  stop: "M7 7h10v10H7z",
  play: "M8 5l11 7-11 7z",
  back: "M15 5l-7 7 7 7",
};
export function Icon({ name, color, size = 24 }: { name: IconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={PATHS[name]} stroke={color} strokeWidth={name === "more" ? 3.2 : 2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: space.s, borderRadius: 12, borderWidth: 1, paddingVertical: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, justifyContent: "center" },
});
