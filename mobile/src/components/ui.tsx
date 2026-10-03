import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, View, type PressableProps, type ViewStyle } from "react-native";
import { useT } from "../lib/strings";
import type { Category, Outcome, Profile, Verdict } from "../lib/shared";
import { useTheme, type Theme } from "../lib/theme";

// Wspólne elementy interfejsu. Cele dotykowe ≥ 48 dp, tekst skaluje się z
// ustawieniami systemu, stan zawsze opisany tekstem (nie tylko kolorem).

export type IconName = ComponentProps<typeof MaterialCommunityIcons>["name"];

export const VERDICT_ICON: Record<Verdict, string> = { meets: "✓", barrier: "✕", incomplete: "?" };
export const VERDICT_MCI: Record<Verdict, IconName> = {
  meets: "check-circle",
  barrier: "close-circle",
  incomplete: "help-circle",
};
export const OUTCOME_ICON: Record<Outcome, string> = { ok: "✓", barrier: "✕", unknown: "?", conflict: "!" };
export const OUTCOME_MCI: Record<Outcome, IconName> = {
  ok: "check-circle",
  barrier: "close-circle",
  unknown: "help-circle-outline",
  conflict: "alert-circle",
};

export const CATEGORY_ICON: Record<Category, IconName> = {
  culture: "palette",
  food: "silverware-fork-knife",
  accommodation: "bed",
  toilet: "toilet",
  transport: "bus",
  office: "office-building",
  health: "hospital-box",
  shop: "shopping",
  attraction: "camera",
  sport: "basketball",
  other: "map-marker",
};

export const PRESET_ICON: Record<Profile["preset"], IconName> = {
  wheelchair_manual: "wheelchair-accessibility",
  wheelchair_electric: "lightning-bolt",
  stroller: "baby-carriage",
  custom: "tune-variant",
};

export function verdictColors(t: Theme, v: Verdict) {
  return v === "meets" ? { fg: t.ok, bg: t.okBg } : v === "barrier" ? { fg: t.bad, bg: t.badBg } : { fg: t.unk, bg: t.unkBg };
}

export function outcomeColor(t: Theme, o: Outcome) {
  return o === "ok" ? t.ok : o === "barrier" ? t.bad : t.unk;
}

export function shadow(t: Theme, level = 1): ViewStyle {
  return Platform.select({
    android: { elevation: level * 2 },
    default: {
      shadowColor: t.shadow,
      shadowOpacity: 0.08 * level,
      shadowRadius: 6 * level,
      shadowOffset: { width: 0, height: 2 * level },
    },
  }) as ViewStyle;
}

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color: string }) {
  return (
    <MaterialCommunityIcons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

export function IconCircle({ name, color, bg, size = 44 }: { name: IconName; color: string; bg: string; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}
    >
      <Icon name={name} size={size * 0.52} color={color} />
    </View>
  );
}

export function H1({ children, color }: { children: React.ReactNode; color?: string }) {
  const t = useTheme();
  return (
    <Text accessibilityRole="header" style={[styles.h1, { color: color ?? t.text }]}>
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

/** Nagłówek sekcji z ikoną. */
export function SectionTitle({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Icon name={icon} size={22} color={t.accent} />
      <Text accessibilityRole="header" style={[styles.h2, { color: t.text, marginTop: 0, marginBottom: 0 }]}>
        {children}
      </Text>
    </View>
  );
}

export function P({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: object }) {
  const t = useTheme();
  return <Text style={[styles.p, { color: muted ? t.muted : t.text }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.line }, shadow(t), style]}>{children}</View>;
}

export function Button({
  label,
  icon,
  variant = "primary",
  style,
  ...rest
}: PressableProps & { label: string; icon?: IconName; variant?: "primary" | "secondary" | "ghost"; style?: ViewStyle }) {
  const t = useTheme();
  const primary = variant === "primary";
  const fg = primary ? t.accentText : t.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary ? t.accent : variant === "secondary" ? t.surface : "transparent",
          borderColor: variant === "ghost" ? "transparent" : t.accent,
          opacity: rest.disabled ? 0.6 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {icon && <Icon name={icon} size={20} color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  role = "radio",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  role?: "radio" | "checkbox" | "button";
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={role}
      accessibilityState={role === "button" ? undefined : { checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? t.accent : t.line,
          backgroundColor: selected ? t.accent : t.surface,
        },
      ]}
    >
      {icon && <Icon name={icon} size={18} color={selected ? t.accentText : t.accent} />}
      <Text style={[styles.chipText, { color: selected ? t.accentText : t.text }]}>{label}</Text>
    </Pressable>
  );
}

export type TagKind = "sample" | "unverified" | "stale" | "confirmed" | "conflict";

export function Tag({ kind, label }: { kind: TagKind; label: string }) {
  const t = useTheme();
  const c =
    kind === "sample"
      ? { fg: "#ffffff", bg: "#5b2a86" }
      : kind === "unverified"
        ? { fg: t.unk, bg: t.unkBg }
        : kind === "confirmed"
          ? { fg: t.ok, bg: t.okBg }
          : { fg: t.bad, bg: t.badBg };
  return (
    <View style={[styles.tag, { backgroundColor: c.bg }]}>
      <Text style={[styles.tagText, { color: c.fg }]}>{label}</Text>
    </View>
  );
}

export function VerdictBadge({ verdict, large }: { verdict: Verdict; large?: boolean }) {
  const t = useTheme();
  const { s, V } = useT();
  const c = verdictColors(t, verdict);
  return (
    <View
      style={[styles.badge, { backgroundColor: c.bg }, large && { paddingVertical: 6, paddingHorizontal: 12 }]}
      accessible
      accessibilityLabel={s.verdictA11y(V[verdict].title, "")}
    >
      <Icon name={VERDICT_MCI[verdict]} size={large ? 22 : 18} color={c.fg} />
      <Text style={{ color: c.fg, fontWeight: "700", fontSize: large ? 16 : 14 }}>{V[verdict].title}</Text>
    </View>
  );
}

export function Banner({
  title,
  children,
  tone = "warn",
  icon,
}: {
  title: string;
  children?: React.ReactNode;
  tone?: "warn" | "info" | "sample";
  icon?: IconName;
}) {
  const t = useTheme();
  const bg = tone === "warn" ? t.unkBg : tone === "info" ? t.infoBg : "#efe6f7";
  const fg = tone === "warn" ? t.unk : tone === "info" ? t.accent : "#5b2a86";
  return (
    <View
      accessibilityRole={tone === "warn" ? "alert" : undefined}
      style={[styles.banner, { backgroundColor: bg, borderLeftColor: fg }]}
    >
      <Icon name={icon ?? (tone === "warn" ? "alert" : tone === "info" ? "information" : "flask")} size={22} color={fg} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: tone === "sample" ? "#3b1a5a" : t.text, fontWeight: "700", marginBottom: children ? 2 : 0 }}>
          {title}
        </Text>
        {typeof children === "string" ? (
          <Text style={{ color: tone === "sample" ? "#3b1a5a" : t.text }}>{children}</Text>
        ) : (
          children
        )}
      </View>
    </View>
  );
}

/** Przełącznik z opisem: cały wiersz jest celem dotykowym (≥ 48 dp) z rolą "switch". */
export function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ flexDirection: "row", alignItems: "center", minHeight: 52, gap: 12 }}
    >
      <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>{label}</Text>
      {/* Wskaźnik czysto wizualny — stan ogłasza rola "switch" całego wiersza. */}
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={{
          width: 52,
          height: 32,
          borderRadius: 16,
          padding: 3,
          backgroundColor: value ? t.accent : t.line,
          alignItems: value ? "flex-end" : "flex-start",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#ffffff" }} />
      </View>
    </Pressable>
  );
}

/** Rozwijana sekcja — szczegóły na żądanie zamiast ściany tekstu. */
export function Disclosure({
  title,
  summary,
  children,
  initiallyOpen = false,
}: {
  title: string;
  summary?: React.ReactNode;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => setOpen(!open)}
        style={styles.disclosure}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: t.text, fontWeight: "700", fontSize: 16 }}>{title}</Text>
          {summary}
        </View>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={24} color={t.muted} />
      </Pressable>
      {open && <View style={{ gap: 8, paddingTop: 4 }}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 28, fontWeight: "800", letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: "800", marginTop: 24, marginBottom: 10 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 26, marginBottom: 10 },
  p: { fontSize: 16, lineHeight: 23, marginBottom: 8 },
  card: { borderRadius: 16, padding: 16, borderWidth: StyleSheet.hairlineWidth },
  button: {
    minHeight: 50,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "700" },
  chip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderRadius: 999,
  },
  chipText: { fontSize: 15, fontWeight: "600" },
  tag: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: "flex-start" },
  tagText: { fontSize: 12, fontWeight: "800" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  banner: { flexDirection: "row", gap: 10, borderLeftWidth: 4, borderRadius: 12, padding: 12, marginBottom: 12 },
  disclosure: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8 },
});
