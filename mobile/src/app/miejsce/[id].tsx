import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlacesMap } from "../../components/PlacesMap";
import { StopsList } from "../../components/StopsList";
import {
  Banner,
  Button,
  CATEGORY_ICON,
  Card,
  Disclosure,
  Icon,
  IconCircle,
  OUTCOME_LABEL,
  OUTCOME_MCI,
  P,
  SectionTitle,
  Tag,
  VERDICT_MCI,
  outcomeColor,
  shadow,
  verdictColors,
} from "../../components/ui";
import { getPlace, liveCheck, sendReport, type LiveResult, type Loaded, type PlaceResponse } from "../../lib/api";
import { useProfile } from "../../lib/profile";
import {
  CATEGORY_LABELS,
  FEATURE_LABELS,
  FEATURE_ORDER,
  VERDICT_TEXT,
  assess,
  formatDate,
  formatValue,
  type FactValue,
  type FeatureKey,
  type FeatureView,
  type Source,
} from "../../lib/shared";
import { useTheme } from "../../lib/theme";

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, awaria, city } = useProfile();
  const [loaded, setLoaded] = useState<Loaded<PlaceResponse> | null>(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState<LiveResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Odświeżamy po powrocie z formularza zgłoszenia.
  const reload = useCallback(() => {
    getPlace(id, awaria, city)
      .then(setLoaded)
      .catch(() => setError("Nie udało się wczytać miejsca. Sprawdź połączenie."));
  }, [id, awaria, city]);
  useFocusEffect(reload);

  /** Potwierdzenie aktualności = zgłoszenie z tą samą wartością (niezależne źródło). */
  const confirm = async (key: FeatureKey, value: FactValue) => {
    await sendReport(id, { [key]: value }, "Potwierdzenie aktualności na miejscu", city);
    reload();
  };

  const a = useMemo(
    () => (loaded ? assess(loaded.data.place, profile, loaded.data.sources) : null),
    [loaded, profile],
  );

  if (!loaded || !a) {
    return (
      <View style={{ padding: 16 }}>
        <P>{error || "Wczytywanie…"}</P>
      </View>
    );
  }

  const { place, sources } = loaded.data;
  const v = VERDICT_TEXT[a.verdict];
  const vc = verdictColors(t, a.verdict);

  const navigate = () => {
    const label = encodeURIComponent(place.name);
    const url =
      Platform.OS === "ios"
        ? `maps://?q=${label}&ll=${place.lat},${place.lon}`
        : `geo:${place.lat},${place.lon}?q=${place.lat},${place.lon}(${label})`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=19/${place.lat}/${place.lon}`),
    );
  };

  const check = async () => {
    setChecking(true);
    setLive(await liveCheck(place.id, awaria, city));
    setChecking(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}>
        {/* Nagłówek z oceną */}
        <View style={[styles.hero, { backgroundColor: t.hero }]}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <IconCircle name={CATEGORY_ICON[place.category]} color={t.hero} bg="#ffffff" size={52} />
            <View style={{ flex: 1 }}>
              <Text accessibilityRole="header" style={{ color: t.heroText, fontSize: 24, fontWeight: "800" }}>
                {place.name}
              </Text>
              <Text style={{ color: t.heroMuted, fontSize: 15 }}>
                {CATEGORY_LABELS[place.category]}
                {place.address ? ` · ${place.address}` : ""}
              </Text>
            </View>
          </View>
          <View
            accessible
            accessibilityLabel={`Ocena: ${v.title}. ${v.body}`}
            style={[styles.verdict, { backgroundColor: vc.bg }]}
          >
            <Icon name={VERDICT_MCI[a.verdict]} size={34} color={vc.fg} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: vc.fg, fontSize: 20, fontWeight: "800" }}>{v.title}</Text>
              <Text style={{ color: t.text, fontSize: 15 }}>{v.body}</Text>
            </View>
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {loaded.cachedAt && (
            <Banner title="Jesteś offline — zapisana kopia" icon="cloud-off-outline">
              {`Stan z ${formatDate(loaded.cachedAt)}.`}
            </Banner>
          )}
          {(place.sample || a.usesSample) && (
            <Banner tone="sample" title="Dane przykładowe">
              Wpis przygotowany na potrzeby demonstracji — nie opisuje rzeczywistego obiektu.
            </Banner>
          )}
          {a.verdict === "meets" && a.generalOnly && (
            <Banner tone="info" title="Ocena ogólna">
              Źródło podaje „dostępne”, ale bez szczegółowych pomiarów wejścia i drzwi.
            </Banner>
          )}
          {a.usesUnverified && (
            <Banner title="Niezweryfikowane informacje" icon="account-question">
              Część informacji pochodzi tylko ze zgłoszeń użytkowników.
            </Banner>
          )}
          {a.stale && (
            <Banner title="Mogą być nieaktualne" icon="calendar-alert">
              Część informacji ma ponad 2 lata.
            </Banner>
          )}

          <SectionTitle icon="clipboard-check-outline">Twoje wymagania</SectionTitle>
          <Card style={{ paddingVertical: 4 }}>
            {a.requirements.map((r, i) => {
              const color = outcomeColor(t, r.outcome);
              return (
                <View
                  key={r.id}
                  accessible
                  accessibilityLabel={`${r.label}: ${OUTCOME_LABEL[r.outcome]}. ${r.detail}`}
                  style={[styles.req, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }]}
                >
                  <Icon name={OUTCOME_MCI[r.outcome]} size={28} color={color} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: t.text, fontWeight: "700", fontSize: 16 }}>{r.label}</Text>
                    <Text style={{ color, fontWeight: "700", fontSize: 14 }}>{OUTCOME_LABEL[r.outcome]}</Text>
                    <Text style={{ color: t.text, fontSize: 15 }}>{r.detail}</Text>
                  </View>
                </View>
              );
            })}
          </Card>
          <Button
            variant="ghost"
            icon="tune-variant"
            label="Zmień swoje wymagania"
            onPress={() => router.push("/profil")}
            style={{ alignSelf: "flex-start", paddingHorizontal: 0 }}
          />

          <SectionTitle icon="text-box-search-outline">Bariery i udogodnienia</SectionTitle>
          <P muted>Dotknij, aby zobaczyć źródło, datę i wiarygodność każdej informacji.</P>
          <Card style={{ paddingVertical: 4 }}>
            {FEATURE_ORDER.map((key, i) => (
              <View key={key} style={i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line } : undefined}>
                <FeatureRow
                  featureKey={key}
                  view={a.features[key]}
                  sources={sources}
                  onConfirm={confirm}
                  onReport={() => router.push({ pathname: "/zglos/[id]", params: { id: place.id } })}
                />
              </View>
            ))}
          </Card>

          <SectionTitle icon="bus-stop">Dojazd komunikacją</SectionTitle>
          <StopsList stops={loaded.data.stops ?? []} profile={profile} sources={sources} />

          <SectionTitle icon="map-marker-radius">Na mapie</SectionTitle>
          <PlacesMap results={[{ place, assessment: a }]} height={220} />

          {place.id.startsWith("osm-") && (
            <>
              <SectionTitle icon="update">Aktualność danych OSM</SectionTitle>
              <P muted>Dane OpenStreetMap są importowane codziennie. Możesz sprawdzić ten obiekt teraz.</P>
              <Button
                variant="secondary"
                icon="refresh"
                label={checking ? "Sprawdzam…" : "Sprawdź teraz w OpenStreetMap"}
                disabled={checking}
                onPress={check}
              />
              <View accessibilityLiveRegion="polite" style={{ marginTop: 10 }}>
                {live?.ok === true && (
                  <Banner
                    tone="info"
                    title={live.changed ? "W OSM są zmiany od ostatniego importu" : "Dane w OSM nie zmieniły się od importu"}
                  >
                    {live.lastEdit ? `Ostatnia edycja obiektu w OSM: ${formatDate(live.lastEdit)}.` : ""}
                  </Banner>
                )}
                {live?.ok === false && (
                  <Banner title="Nie udało się połączyć z OpenStreetMap" icon="cloud-off-outline">
                    {`Pokazujemy kopię z ${live.snapshotAt ? formatDate(live.snapshotAt) : "ostatniego importu"}. Nie traktuj jej jako potwierdzenia bieżącego stanu.`}
                  </Banner>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Stały pasek akcji */}
      <View
        style={[
          styles.actions,
          { backgroundColor: t.surface, borderTopColor: t.line, paddingBottom: 12 + insets.bottom },
          shadow(t, 2),
        ]}
      >
        <Button icon="navigation-variant" label="Prowadź" onPress={navigate} style={{ flex: 1 }} />
        <Button
          variant="secondary"
          icon="pencil-outline"
          label="Zgłoś zmianę"
          onPress={() => router.push({ pathname: "/zglos/[id]", params: { id: place.id } })}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function FeatureRow({
  featureKey,
  view,
  sources,
  onConfirm,
  onReport,
}: {
  featureKey: FeatureKey;
  view?: FeatureView;
  sources: Record<string, Source>;
  onConfirm: (key: FeatureKey, value: FactValue) => Promise<void>;
  onReport: () => void;
}) {
  const t = useTheme();
  const [sent, setSent] = useState("");
  const label = FEATURE_LABELS[featureKey];
  if (!view) {
    return (
      <View style={styles.featureEmpty} accessible accessibilityLabel={`${label}: brak informacji`}>
        <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>{label}</Text>
        <Text style={{ color: t.muted, fontSize: 14 }}>brak informacji</Text>
      </View>
    );
  }
  const value =
    view.status === "conflict" ? "sprzeczne dane" : view.value !== undefined ? formatValue(featureKey, view.value) : "";
  return (
    <Disclosure
      title={label}
      summary={
        <View style={{ gap: 6 }}>
          <Text style={{ color: view.status === "conflict" ? t.bad : t.text, fontSize: 15, fontWeight: "600" }}>
            {value}
          </Text>
          {(view.status === "confirmed" || view.status === "conflict" || view.stale || view.unverifiedOnly) && (
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {view.status === "confirmed" && <Tag kind="confirmed" label="Potwierdzone przez kilka źródeł" />}
              {view.status === "conflict" && <Tag kind="conflict" label="Sprzeczne dane" />}
              {view.stale && <Tag kind="stale" label="Może być nieaktualne" />}
              {view.unverifiedOnly && <Tag kind="unverified" label="Niezweryfikowane" />}
            </View>
          )}
        </View>
      }
    >
      {view.facts.map((f, i) => {
        const src = sources[f.sourceId];
        return (
          <View key={i} style={[styles.fact, { backgroundColor: t.bg }]}>
            <Text style={{ color: t.text, fontSize: 15 }}>
              <Text style={{ fontWeight: "700" }}>{formatValue(f.key, f.value)}</Text>
              {f.note ? ` — ${f.note}` : ""}
            </Text>
            {f.sample && <Tag kind="sample" label="Dane przykładowe" />}
            <Text style={{ color: t.muted, fontSize: 14 }}>
              {src?.name ?? f.sourceId} · {f.observedAt ? formatDate(f.observedAt) : "data nieznana"}
            </Text>
            {f.ref && (
              <Text
                accessibilityRole="link"
                onPress={() => Linking.openURL(f.ref!)}
                style={{ color: t.accent, fontSize: 14, fontWeight: "600", paddingVertical: 6 }}
              >
                Zobacz rekord w źródle →
              </Text>
            )}
          </View>
        );
      })}
      {featureKey !== "general" && (
        <View style={{ gap: 8, paddingBottom: 8 }}>
          <Text style={{ color: t.text, fontWeight: "700", fontSize: 15 }}>
            {view.status === "conflict" ? "Byłeś na miejscu? Która wersja jest prawdziwa?" : "Byłeś na miejscu? Czy to nadal aktualne?"}
          </Text>
          {sent ? (
            <Text accessibilityLiveRegion="polite" style={{ color: t.ok, fontWeight: "700" }}>
              {sent}
            </Text>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {(view.status === "conflict"
                ? [...new Map(view.facts.map((f) => [String(f.value), f.value])).values()]
                : view.value !== undefined
                  ? [view.value]
                  : []
              ).map((value) => (
                <Button
                  key={String(value)}
                  variant="secondary"
                  icon="check"
                  label={view.status === "conflict" ? formatValue(featureKey, value) : "Tak, aktualne"}
                  onPress={() =>
                    onConfirm(featureKey, value)
                      .then(() => setSent("Dziękujemy — potwierdzenie zapisane."))
                      .catch(() => setSent("Nie udało się zapisać. Spróbuj ponownie."))
                  }
                />
              ))}
              <Button variant="ghost" icon="pencil-outline" label="Nie, zgłoś zmianę" onPress={onReport} />
            </View>
          )}
        </View>
      )}
    </Disclosure>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 16, paddingTop: 8, gap: 14, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  verdict: { flexDirection: "row", gap: 12, alignItems: "center", borderRadius: 16, padding: 14 },
  req: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  featureEmpty: { flexDirection: "row", alignItems: "center", minHeight: 48, gap: 8 },
  fact: { borderRadius: 12, padding: 12, gap: 4 },
  actions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
