import { router } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileTiles } from "../../components/ProfileTiles";
import {
  Banner,
  CATEGORY_ICON,
  Chip,
  Icon,
  IconCircle,
  Tag,
  VerdictBadge,
  shadow,
  verdictColors,
} from "../../components/ui";
import { listCities, type City } from "../../lib/api";
import { useProfile } from "../../lib/profile";
import { useSearch, type Assessed } from "../../lib/search";
import { CATEGORY_LABELS, VERDICT_TEXT, formatDate, type Category } from "../../lib/shared";
import { useTheme } from "../../lib/theme";

const CATEGORIES: Category[] = ["culture", "food", "accommodation", "toilet", "attraction", "health", "office", "shop"];

export default function Search() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const s = useSearch();
  const { city, setCity } = useProfile();
  const [q, setQ] = useState(s.query);
  const [cities, setCities] = useState<City[]>([{ id: "krakow", name: "Kraków" }]);
  const [pickCity, setPickCity] = useState(false);
  const cityName = cities.find((c) => c.id === city)?.name ?? city;

  useEffect(() => {
    listCities().then(setCities).catch(() => {});
  }, []);

  const down = s.loaded?.data.status.filter((x) => !x.ok) ?? [];
  const statusText = s.error
    ? s.error
    : s.loading
      ? "Wczytywanie…"
      : `${s.results.length} ${s.results.length === 1 ? "miejsce" : "miejsc"}${s.near ? " · od najbliższych" : ""}`;

  const header = (
    <View>
      <View style={[styles.hero, { backgroundColor: t.hero, paddingTop: insets.top + 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="wheelchair-accessibility" size={22} color={t.heroMuted} />
            <Text style={{ color: t.heroMuted, fontWeight: "700", fontSize: 15 }}>Bez barier</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Miasto: ${cityName}. Zmień miasto`}
            accessibilityState={{ expanded: pickCity }}
            onPress={() => setPickCity(!pickCity)}
            style={styles.cityPill}
          >
            <Icon name="map-marker" size={18} color="#ffffff" />
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 15 }}>{cityName}</Text>
            <Icon name={pickCity ? "chevron-up" : "chevron-down"} size={18} color="#ffffff" />
          </Pressable>
        </View>
        {pickCity && (
          <View accessibilityRole="radiogroup" accessibilityLabel="Wybierz miasto" style={styles.cityList}>
            {cities.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: c.id === city }}
                onPress={() => {
                  setCity(c.id);
                  setPickCity(false);
                }}
                style={[styles.cityOption, c.id === city && { backgroundColor: "#ffffff" }]}
              >
                <Text style={{ color: c.id === city ? t.hero : "#ffffff", fontWeight: "700", fontSize: 16 }}>{c.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Text accessibilityRole="header" style={[styles.heroTitle, { color: t.heroText }]}>
          Dokąd się wybierasz?
        </Text>
        <Text style={{ color: t.heroMuted, fontSize: 15, marginBottom: 14 }}>
          Sprawdzimy bariery i udogodnienia pod Twoje potrzeby — ze źródłem i datą.
        </Text>

        <ProfileTiles onDark />

        <View style={[styles.searchBox, { backgroundColor: t.surface }]}>
          <Icon name="magnify" size={24} color={t.muted} />
          <TextInput
            accessibilityLabel="Nazwa miejsca lub adres"
            value={q}
            onChangeText={setQ}
            onSubmitEditing={() => s.search(q)}
            returnKeyType="search"
            placeholder="Muzeum, kawiarnia, ulica…"
            placeholderTextColor={t.muted}
            style={[styles.searchInput, { color: t.text }]}
          />
          {q.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Wyczyść"
              onPress={() => {
                setQ("");
                s.search("");
              }}
              style={styles.iconBtn}
            >
              <Icon name="close-circle" size={22} color={t.muted} />
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Szukaj"
            onPress={() => s.search(q)}
            style={[styles.searchBtn, { backgroundColor: t.accent }]}
          >
            <Icon name="arrow-right" size={22} color={t.accentText} />
          </Pressable>
        </View>
      </View>

      <View style={{ paddingTop: 14, gap: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="Wszystkie" icon="apps" selected={!s.category} onPress={() => s.setCategory(undefined)} />
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={CATEGORY_LABELS[c]}
              icon={CATEGORY_ICON[c]}
              selected={s.category === c}
              onPress={() => s.setCategory(s.category === c ? undefined : c)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip role="checkbox" label="Najbliżej mnie" icon="crosshairs-gps" selected={!!s.near} onPress={s.locate} />
          <Chip
            role="checkbox"
            label="Tylko spełniające wymagania"
            icon="check-decagram"
            selected={s.onlyMatching}
            onPress={() => s.setOnlyMatching(!s.onlyMatching)}
          />
        </ScrollView>

        <View style={{ paddingHorizontal: 16, gap: 0 }}>
          {s.loaded?.cachedAt && (
            <Banner title="Jesteś offline — zapisana kopia" icon="cloud-off-outline">
              {`Wyniki z ${formatDate(s.loaded.cachedAt)}. Mogą być nieaktualne.`}
            </Banner>
          )}
          {down.length > 0 && (
            <Banner title="Część źródeł jest niedostępna">
              {`Brak danych z: ${down.map((x) => s.loaded!.data.sources[x.sourceId]?.name ?? x.sourceId).join(", ")}. Brak informacji nie oznacza braku barier.`}
            </Banner>
          )}
          <Text accessibilityLiveRegion="polite" style={{ color: t.muted, fontSize: 15, fontWeight: "600", marginBottom: 4 }}>
            {statusText}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: t.bg }}
      data={s.results}
      keyExtractor={(r) => r.place.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => <ResultCard {...item} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    />
  );
}

function ResultCard({ place, assessment }: Assessed) {
  const t = useTheme();
  const vc = verdictColors(t, assessment.verdict);
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
        styles.card,
        { backgroundColor: t.surface, borderLeftColor: vc.fg, opacity: pressed ? 0.9 : 1 },
        shadow(t),
      ]}
    >
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <IconCircle name={CATEGORY_ICON[place.category]} color={t.accent} bg={t.infoBg} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontWeight: "800", fontSize: 17 }} numberOfLines={2}>
            {place.name}
          </Text>
          <Text style={{ color: t.muted, fontSize: 14 }} numberOfLines={1}>
            {CATEGORY_LABELS[place.category]}
            {place.address ? ` · ${place.address}` : ""}
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color={t.muted} />
      </View>
      <VerdictBadge verdict={assessment.verdict} />
      {reasons.map((r) => (
        <Text key={r.id} style={{ color: t.text, fontSize: 15 }}>
          • {r.detail}
        </Text>
      ))}
      {assessment.verdict === "meets" && assessment.generalOnly && (
        <Text style={{ color: t.muted, fontSize: 14 }}>Na podstawie ogólnej oceny, bez szczegółowych pomiarów.</Text>
      )}
      {(assessment.usesSample || assessment.usesUnverified || assessment.stale) && (
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {assessment.usesSample && <Tag kind="sample" label="Dane przykładowe" />}
          {assessment.usesUnverified && <Tag kind="unverified" label="Niezweryfikowane" />}
          {assessment.stale && <Tag kind="stale" label="Mogą być nieaktualne" />}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 16, paddingBottom: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, gap: 4 },
  heroTitle: { fontSize: 30, fontWeight: "800", letterSpacing: -0.5, marginTop: 6 },
  searchBox: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingLeft: 14,
    paddingRight: 6,
    minHeight: 56,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 17, minHeight: 52 },
  searchBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cityList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  cityOption: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#ffffff",
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  chipRow: { gap: 8, paddingHorizontal: 16 },
  card: { marginHorizontal: 16, padding: 16, borderRadius: 16, borderLeftWidth: 5, gap: 8 },
});
