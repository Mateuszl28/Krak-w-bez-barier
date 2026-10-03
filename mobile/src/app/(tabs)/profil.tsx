import { ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { ProfileTiles } from "../../components/ProfileTiles";
import { Card, P, SectionTitle } from "../../components/ui";
import { useProfile } from "../../lib/profile";
import type { Profile } from "../../lib/shared";
import { useTheme } from "../../lib/theme";

export default function ProfileScreen() {
  const t = useTheme();
  const { profile, setProfile } = useProfile();
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
      <P>
        Wybierz, czym się poruszasz, albo ustaw własne wymagania. Nie pytamy o niepełnosprawność — wystarczą Twoje
        potrzeby.
      </P>
      <ProfileTiles />
      <SectionTitle icon="tune-variant">Szczegółowe wymagania</SectionTitle>
      <Card style={{ gap: 14 }}>
        {num(
          "Najwyższy próg, który pokonam (cm)",
          profile.maxStepCm,
          (n) => update({ maxStepCm: n }),
          "Na przykład 2 dla wózka ręcznego",
        )}
        {num("Potrzebna szerokość przejścia (cm)", profile.minDoorCm, (n) => update({ minDoorCm: n }), "Na przykład 80")}
        {toggle("Potrzebuję toalety dostępnej dla wózka", profile.needToilet, (b) => update({ needToilet: b }))}
        {toggle("Potrzebuję przewijaka", profile.needChangingTable, (b) => update({ needChangingTable: b }))}
        {toggle("Unikam bruku i żwiru na dojściu", profile.avoidCobbles, (b) => update({ avoidCobbles: b }))}
      </Card>
      <P muted>Ustawienia zapisują się tylko na tym telefonie. Zmiana działa od razu na liście, mapie i kartach miejsc.</P>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: "700" },
  input: { minHeight: 50, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  row: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 12 },
});
