import * as Location from "expo-location";
import { Link, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PlacesMap, type Assessed } from "../components/PlacesMap";
import { ProfileChips } from "../components/ProfileChips";
import { Banner, Button, Card, Chip, H1, P, Tag, VerdictBadge } from "../components/ui";
import { searchPlaces, type Loaded, type PlacesResponse } from "../lib/api";
import { useProfile } from "../lib/profile";
import { CATEGORY_LABELS, VERDICT_TEXT, assess, formatDate, type Category } from "../lib/shared";
import { useTheme } from "../lib/theme";

const CATEGORIES: Category[] = ["culture", "food", "accommodation", "toilet", "attraction", "health", "office", "shop"];

export default function Search() {
  const t = useTheme();
  const { profile, awaria } = useProfile();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [category, setCategory] = useState<Category | undefined>();
  const [near, setNear] = useState<[number, number] | undefined>();
  const [loaded, setLoaded] = useState<Loaded<PlacesResponse> | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"list" | "map">("list");
  const [onlyMatching, setOnlyMatching] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    searchPlaces({ q: submitted, category, near, awaria })
      .then(setLoaded)
      .catch(() => {
        setLoaded(null);
        setError("Brak połączenia z serwerem i brak zapisanej kopii. Spróbuj ponownie, gdy będziesz online.");
      })
      .finally(() => setLoading(false));
  }, [submitted, category, near, awaria]);

  const results: Assessed[] = useMemo(() => {
    if (!loaded) return [];
    const all = loaded.data.places.map((place) => ({ place, assessment: assess(place, profile, loaded.data.sources) }));
    return onlyMatching ? all.filter((r) => r.assessment.verdict === "meets") : all;
  }, [loaded, profile, onlyMatching]);

  const locate = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Bez zgody na lokalizację pokażemy wyniki według nazwy. Możesz wpisać adres.");
      return;
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setNear([pos.coords.latitude, pos.coords.longitude]);
  };

  const down = loaded?.data.status.filter((s) => !s.ok) ?? [];
  const statusText = error
    ? error
    : loading
      ? "Wczytywanie…"
      : `Znaleziono ${results.length} miejsc.`;

  const header = (
    <View style={{ padding: 16, gap: 12 }}>
      <View>
        <H1>Sprawdź dostępność miejsca</H1>
        <P muted>Konkretne bariery i udogodnienia — z informacją, skąd pochodzą i jak są aktualne.</P>
      </View>

      {loaded?.cachedAt && (
        <Banner title="Jesteś offline — pokazujemy zapisaną kopię">
          {`Wyniki z ${formatDate(loaded.cachedAt)}. Mogą być nieaktualne.`}
        </Banner>
      )}
      {down.length > 0 && (
        <Banner title="Część źródeł jest teraz niedostępna">
          {`Brak danych z: ${down.map((s) => loaded!.data.sources[s.sourceId]?.name ?? s.sourceId).join(", ")}. Brak informacji nie oznacza braku barier.`}
        </Banner>
      )}

      <Card style={{ gap: 10 }}>
        <Text accessibilityRole="header" style={[styles.label, { color: t.text }]}>
          Czym się poruszasz?
        </Text>
        <ProfileChips />
        <Link href="/profil" asChild>
          <Pressable accessibilityRole="link" style={styles.link}>
            <Text style={{ color: t.accent, fontWeight: "700", fontSize: 16 }}>Dostosuj wymagania →</Text>
          </Pressable>
        </Link>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text nativeID="q-label" style={[styles.label, { color: t.text }]}>
          Nazwa miejsca lub adres
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            accessibilityLabel="Nazwa miejsca lub adres"
            accessibilityLabelledBy="q-label"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => setSubmitted(q)}
            returnKeyType="search"
            placeholder="np. muzeum, Floriańska, hotel"
            placeholderTextColor={t.muted}
            style={[styles.input, { color: t.text, borderColor: t.border, backgroundColor: t.surface }]}
          />
          <Button label="Szukaj" onPress={() => setSubmitted(q)} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Wszystkie" selected={!category} onPress={() => setCategory(undefined)} />
          {CATEGORIES.map((c) => (
            <Chip key={c} label={CATEGORY_LABELS[c]} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>
        <Button
          variant="secondary"
          label={near ? "Sortuję od najbliższych ✓" : "📍 Pokaż najbliższe mnie"}
          onPress={locate}
        />
      </Card>

      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <Chip label="Lista" selected={mode === "list"} onPress={() => setMode("list")} />
        <Chip label="Mapa" selected={mode === "map"} onPress={() => setMode("map")} />
        <Chip
          label="Tylko spełniające moje wymagania"
          selected={onlyMatching}
          onPress={() => setOnlyMatching(!onlyMatching)}
        />
      </View>

      <Text accessibilityLiveRegion="polite" style={{ color: t.muted, fontSize: 15 }}>
        {statusText}
      </Text>
      {mode === "map" && (
        <>
          <P muted>Mapa pokazuje te same miejsca co lista. Dotknij znacznika, aby zobaczyć szczegóły.</P>
          <PlacesMap results={results} />
        </>
      )}
    </View>
  );

  return (
    <FlatList
      data={mode === "list" ? results : []}
      keyExtractor={(r) => r.place.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => <ResultItem {...item} />}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{ paddingBottom: 40 }}
      ListFooterComponent={
        <View style={{ padding: 16 }}>
          <Link href="/zrodla" asChild>
            <Pressable accessibilityRole="link" style={styles.link}>
              <Text style={{ color: t.accent, fontWeight: "700", fontSize: 16 }}>Źródła danych i metoda oceny →</Text>
            </Pressable>
          </Link>
        </View>
      }
      keyboardShouldPersistTaps="handled"
    />
  );
}

function ResultItem({ place, assessment }: Assessed) {
  const t = useTheme();
  const reasons = assessment.requirements.filter((r) => r.outcome !== "ok").slice(0, 2);
  const label = [
    place.name,
    CATEGORY_LABELS[place.category],
    VERDICT_TEXT[assessment.verdict].title,
    ...reasons.map((r) => r.detail),
    assessment.usesSample ? "Dane przykładowe" : "",
    assessment.usesUnverified ? "Niezweryfikowane" : "",
    assessment.stale ? "Mogą być nieaktualne" : "",
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint="Otwiera szczegóły i źródła"
      onPress={() => router.push({ pathname: "/miejsce/[id]", params: { id: place.id } })}
      style={({ pressed }) => [
        styles.result,
        { backgroundColor: t.surface, borderColor: t.line, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={{ color: t.accent, fontWeight: "700", fontSize: 17 }}>{place.name}</Text>
      <Text style={{ color: t.muted, fontSize: 14 }}>
        {CATEGORY_LABELS[place.category]}
        {place.address ? ` · ${place.address}` : ""}
      </Text>
      <VerdictBadge verdict={assessment.verdict} />
      {reasons.map((r) => (
        <Text key={r.id} style={{ color: t.text, fontSize: 15 }}>
          • {r.detail}
        </Text>
      ))}
      {assessment.verdict === "meets" && assessment.generalOnly && (
        <Text style={{ color: t.muted, fontSize: 14 }}>Na podstawie ogólnej oceny, bez szczegółowych pomiarów.</Text>
      )}
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {assessment.usesSample && <Tag kind="sample" label="Dane przykładowe" />}
        {assessment.usesUnverified && <Tag kind="unverified" label="Niezweryfikowane" />}
        {assessment.stale && <Tag kind="stale" label="Mogą być nieaktualne" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 16, fontWeight: "700" },
  input: { flex: 1, minHeight: 48, borderWidth: 2, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  link: { minHeight: 44, justifyContent: "center" },
  result: { marginHorizontal: 16, padding: 14, borderWidth: 1, borderRadius: 12, gap: 6 },
});
