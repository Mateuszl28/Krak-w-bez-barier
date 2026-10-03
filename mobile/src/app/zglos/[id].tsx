import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Chip, P } from "../../components/ui";
import { sendReport } from "../../lib/api";
import { useTheme } from "../../lib/theme";

// Zgłoszenie korekty. Trafia na kartę jako niezweryfikowane. Bez danych osobowych.
type Tri = "" | "yes" | "no";

export default function ReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const [entrance, setEntrance] = useState("");
  const [steps, setSteps] = useState("");
  const [height, setHeight] = useState("");
  const [door, setDoor] = useState("");
  const [toilet, setToilet] = useState<Tri>("");
  const [changing, setChanging] = useState<Tri>("");
  const [elevator, setElevator] = useState<Tri>("");
  const [surface, setSurface] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const submit = async () => {
    const facts: Record<string, unknown> = {};
    if (entrance) facts.entrance = entrance;
    if (steps) facts.step_count = Number(steps);
    if (height) facts.step_height_cm = Number(height);
    if (door) facts.door_width_cm = Number(door);
    if (toilet) facts.toilet = toilet === "yes";
    if (changing) facts.changing_table = changing === "yes";
    if (elevator) facts.elevator = elevator === "yes";
    if (surface) facts.surface = surface;
    setBusy(true);
    setMsg("");
    try {
      await sendReport(id, facts, comment);
      router.back();
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  };

  const choice = (label: string, value: string, set: (v: string) => void, options: [string, string][]) => (
    <View style={{ gap: 6 }}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.wrap}>
        {options.map(([v, l]) => (
          <Chip key={v} label={l} selected={value === v} onPress={() => set(value === v ? "" : v)} />
        ))}
      </View>
    </View>
  );

  const yesNo = (label: string, value: Tri, set: (v: Tri) => void) =>
    choice(label, value, (v) => set(v as Tri), [
      ["yes", "jest"],
      ["no", "nie ma"],
    ]);

  const num = (label: string, value: string, set: (v: string) => void) => (
    <View style={{ gap: 6, flex: 1, minWidth: 140 }}>
      <Text style={[styles.label, { color: t.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType="number-pad"
        value={value}
        onChangeText={(s) => set(s.replace(/\D/g, ""))}
        style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.surface }]}
      />
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <P>Uzupełnij to, co wiesz — wystarczy jedno pole. Zgłoszenie pojawi się na karcie jako niezweryfikowane.</P>
      {choice("Wejście", entrance, setEntrance, [
        ["level", "bez stopni"],
        ["ramp", "podjazd"],
        ["lift", "platforma / winda"],
        ["steps", "stopnie"],
      ])}
      <View style={styles.wrap}>
        {num("Liczba stopni", steps, setSteps)}
        {num("Najwyższy próg (cm)", height, setHeight)}
        {num("Szerokość drzwi (cm)", door, setDoor)}
      </View>
      {yesNo("Toaleta dostępna dla wózka", toilet, setToilet)}
      {yesNo("Przewijak", changing, setChanging)}
      {yesNo("Winda na inne piętra", elevator, setElevator)}
      {choice("Nawierzchnia dojścia", surface, setSurface, [
        ["smooth", "gładka"],
        ["paving", "kostka"],
        ["cobblestone", "bruk"],
        ["gravel", "żwir"],
      ])}
      <View style={{ gap: 6 }}>
        <Text style={[styles.label, { color: t.text }]}>Uwagi (opcjonalnie)</Text>
        <TextInput
          accessibilityLabel="Uwagi"
          multiline
          maxLength={500}
          value={comment}
          onChangeText={setComment}
          style={[
            styles.input,
            {
              minHeight: 96,
              color: t.text,
              borderColor: t.border,
              backgroundColor: t.surface,
              textAlignVertical: "top",
              paddingTop: 10,
            },
          ]}
        />
      </View>
      <Button label={busy ? "Wysyłanie…" : "Wyślij zgłoszenie"} disabled={busy} onPress={submit} />
      {msg ? (
        <Text accessibilityLiveRegion="assertive" style={{ color: t.bad, fontWeight: "700", fontSize: 16 }}>
          {msg}
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: "700" },
  input: { minHeight: 48, borderWidth: 2, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
