import { ScrollView, Switch, Text, View } from "react-native";
import { Card, H2, P, Tag } from "../components/ui";
import { API_URL } from "../lib/api";
import { useProfile } from "../lib/profile";
import { SOURCES, SOURCE_KIND_LABELS } from "../lib/shared";
import { useTheme } from "../lib/theme";

export default function SourcesScreen() {
  const t = useTheme();
  const { awaria, setAwaria } = useProfile();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <P>
        Nie mówimy „dostępne / niedostępne”. Pokazujemy konkretne bariery i udogodnienia, a przy każdej informacji —
        skąd pochodzi, z kiedy jest i na ile jest pewna.
      </P>

      <H2>Źródła</H2>
      <View style={{ gap: 8 }}>
        {Object.values(SOURCES).map((s) => (
          <Card key={s.id} style={{ gap: 4 }}>
            <Text style={{ color: t.text, fontWeight: "700", fontSize: 16 }}>{s.name}</Text>
            <Text style={{ color: t.muted }}>{SOURCE_KIND_LABELS[s.kind]}</Text>
            <Text style={{ color: t.text }}>{s.description}</Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>Licencja: {s.license}</Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>Aktualizacja: {s.updateFrequency}</Text>
          </Card>
        ))}
      </View>

      <H2>Poziomy wiarygodności</H2>
      <View style={{ gap: 6 }}>
        <Tag kind="confirmed" label="Potwierdzone przez kilka źródeł" />
        <P>Co najmniej dwa niezależne źródła podają zgodną informację.</P>
        <Tag kind="unverified" label="Niezweryfikowane" />
        <P>Informacja tylko ze zgłoszeń użytkowników.</P>
        <Tag kind="stale" label="Może być nieaktualne" />
        <P>Najnowsza informacja ma ponad 2 lata.</P>
        <Tag kind="conflict" label="Sprzeczne dane" />
        <P>Źródła się różnią — pokazujemy wszystkie wersje i nie wybieramy za Ciebie.</P>
        <Tag kind="sample" label="Dane przykładowe" />
        <P>Dane przygotowane do demonstracji.</P>
      </View>

      <H2>Prywatność</H2>
      <P>
        Nie pytamy o niepełnosprawność ani dane osobowe. Profil potrzeb i lokalizacja zostają na telefonie. Zgłoszenia
        są anonimowe.
      </P>

      <H2>Tryb demonstracyjny</H2>
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48, gap: 12 }}>
          <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>Symuluj awarię OpenStreetMap</Text>
          <Switch
            accessibilityLabel="Symuluj awarię OpenStreetMap"
            value={awaria === "osm"}
            onValueChange={(on) => setAwaria(on ? "osm" : "")}
          />
        </View>
        <Text style={{ color: t.muted, fontSize: 14 }}>
          Pokazuje, co widzi użytkownik, gdy źródło danych nie odpowiada.
        </Text>
        <Text style={{ color: t.muted, fontSize: 14 }}>Serwer: {API_URL}</Text>
      </Card>
    </ScrollView>
  );
}
