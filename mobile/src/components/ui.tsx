import { Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from "react-native";
import { VERDICT_TEXT, type Outcome, type Verdict } from "../lib/shared";
import { useTheme, type Theme } from "../lib/theme";

// Wspólne elementy interfejsu. Cele dotykowe ≥ 48 dp, tekst skaluje się z
// ustawieniami systemu, stan zawsze opisany tekstem (nie tylko kolorem).

export const VERDICT_ICON: Record<Verdict, string> = { meets: "✓", barrier: "✕", incomplete: "?" };
export const OUTCOME_ICON: Record<Outcome, string> = { ok: "✓", barrier: "✕", unknown: "?", conflict: "!" };
export const OUTCOME_LABEL: Record<Outcome, string> = {
  ok: "spełnione",
  barrier: "bariera",
  unknown: "brak danych",
  conflict: "sprzeczne dane",
};

export function verdictColors(t: Theme, v: Verdict) {
  return v === "meets" ? { fg: t.ok, bg: t.okBg } : v === "barrier" ? { fg: t.bad, bg: t.badBg } : { fg: t.unk, bg: t.unkBg };
}

export function outcomeColor(t: Theme, o: Outcome) {
  return o === "ok" ? t.ok : o === "barrier" ? t.bad : t.unk;
}

export function H1({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.h1, { color: t.text }]}>
      {children}
    </Text>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.h2, { color: t.text }]}>
      {children}
    </Text>
  );
}

export function P({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  const t = useTheme();
  return <Text style={[styles.p, { color: muted ? t.muted : t.text }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }, style]}>{children}</View>;
}

export function Button({
  label,
  variant = "primary",
  style,
  ...rest
}: PressableProps & { label: string; variant?: "primary" | "secondary"; style?: ViewStyle }) {
  const t = useTheme();
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? t.accent : "transparent",
          borderColor: t.accent,
          opacity: rest.disabled ? 0.6 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? t.accentText : t.accent }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? t.accent : t.border, backgroundColor: selected ? t.infoBg : t.surface },
      ]}
    >
      {icon ? (
        <Text style={{ fontSize: 18 }} importantForAccessibility="no" accessibilityElementsHidden>
          {icon}
        </Text>
      ) : null}
      <Text style={[styles.chipText, { color: t.text, fontWeight: selected ? "700" : "500" }]}>{label}</Text>
    </Pressable>
  );
}

export type TagKind = "sample" | "unverified" | "stale" | "confirmed" | "conflict";

export function Tag({ kind, label }: { kind: TagKind; label: string }) {
  const t = useTheme();
  const c =
    kind === "sample"
      ? { fg: "#ffffff", bg: "#5b2a86", border: "#5b2a86" }
      : kind === "unverified"
        ? { fg: t.unk, bg: t.unkBg, border: t.unk }
        : kind === "confirmed"
          ? { fg: t.ok, bg: t.okBg, border: t.ok }
          : { fg: t.bad, bg: t.badBg, border: t.bad };
  return (
    <View style={[styles.tag, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[styles.tagText, { color: c.fg }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const t = useTheme();
  const c = verdictColors(t, verdict);
  return (
    <View
      style={[styles.badge, { backgroundColor: c.bg, borderColor: c.fg }]}
      accessible
      accessibilityLabel={`Ocena: ${VERDICT_TEXT[verdict].title}`}
    >
      <View style={[styles.badgeIcon, { backgroundColor: c.fg }]}>
        <Text style={{ color: t.surface, fontWeight: "800", fontSize: 12 }}>{VERDICT_ICON[verdict]}</Text>
      </View>
      <Text style={{ color: c.fg, fontWeight: "700" }}>{VERDICT_TEXT[verdict].title}</Text>
    </View>
  );
}

export function Banner({
  title,
  children,
  tone = "warn",
}: {
  title: string;
  children?: React.ReactNode;
  tone?: "warn" | "info";
}) {
  const t = useTheme();
  return (
    <View
      accessibilityRole={tone === "warn" ? "alert" : undefined}
      style={[styles.banner, { backgroundColor: tone === "warn" ? t.unkBg : t.infoBg, borderColor: t.border }]}
    >
      <Text style={{ color: t.text, fontWeight: "700", marginBottom: children ? 4 : 0 }}>{title}</Text>
      {typeof children === "string" ? <Text style={{ color: t.text }}>{children}</Text> : children}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, fontWeight: "800", marginBottom: 6 },
  h2: { fontSize: 20, fontWeight: "700", marginTop: 22, marginBottom: 8 },
  p: { fontSize: 16, lineHeight: 23, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  button: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
  chip: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 10,
  },
  chipText: { fontSize: 15 },
  tag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start" },
  tagText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  badgeIcon: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  banner: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
});
