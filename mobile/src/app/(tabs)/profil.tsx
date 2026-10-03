import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ProfileTiles } from "../../components/ProfileTiles";
import { Card, Chip, P, SectionTitle } from "../../components/ui";
import { useProfile } from "../../lib/profile";
import type { Profile } from "../../lib/shared";
import { useT } from "../../lib/strings";
import { useTheme } from "../../lib/theme";

export default function ProfileScreen() {
  const t = useTheme();
  const { profile, setProfile, locale, setLocale } = useProfile();
  const { s } = useT();
  const update = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch, preset: "custom" });

  const num = (label: string, value: number, onChange: (n: number) => void, hint: string) => (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        keyboardType="number-pad"
        value={String(value)}
        onChangeText={(s) => onChange(Number(s.replace(/\D/g, "")) || 0)}
        style={[styles.input, { color: t.text, borderColor: t.line, backgroundColor: t.bg }]}
      />
    </View>
  );

  const toggle = (label: string, value: boolean, onChange: (b: boolean) => void) => (
    <View style={styles.row}>
      <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>{label}</Text>
      <Switch accessibilityLabel={label} value={value} onValueChange={onChange} />
    </View>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }}>
      <P>{s.needsIntro}</P>
      <ProfileTiles />
      <SectionTitle icon="tune-variant">{s.detailedRequirements}</SectionTitle>
      <Card style={{ gap: 14 }}>
        {num(s.maxStep, profile.maxStepCm, (n) => update({ maxStepCm: n }), s.maxStepHint)}
        {num(s.minDoor, profile.minDoorCm, (n) => update({ minDoorCm: n }), s.minDoorHint)}
        {toggle(s.needToilet, profile.needToilet, (b) => update({ needToilet: b }))}
        {toggle(s.needChanging, profile.needChangingTable, (b) => update({ needChangingTable: b }))}
        {toggle(s.avoidCobbles, profile.avoidCobbles, (b) => update({ avoidCobbles: b }))}
      </Card>
      <P muted>{s.savedLocally}</P>
      <SectionTitle icon="translate">{s.language}</SectionTitle>
      <View accessibilityRole="radiogroup" accessibilityLabel={s.language} style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Polski" selected={locale === "pl"} onPress={() => setLocale("pl")} />
        <Chip label="English" selected={locale === "en"} onPress={() => setLocale("en")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: "700" },
  input: { minHeight: 50, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 12 },
});
