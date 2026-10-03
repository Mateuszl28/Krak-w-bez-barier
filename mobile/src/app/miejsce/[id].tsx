import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Linking, Platform, ScrollView, Text, View } from "react-native";
import { PlacesMap } from "../../components/PlacesMap";
import {
  Banner,
  Button,
  Card,
  H1,
  H2,
  OUTCOME_ICON,
  OUTCOME_LABEL,
  P,
  Tag,
  VERDICT_ICON,
  outcomeColor,
  verdictColors,
} from "../../components/ui";
import { getPlace, liveCheck, type LiveResult, type Loaded, type PlaceResponse } from "../../lib/api";
import { useProfile } from "../../lib/profile";
import {
  CATEGORY_LABELS,
  FEATURE_LABELS,
  FEATURE_ORDER,
  SOURCE_KIND_LABELS,
  VERDICT_TEXT,
  assess,
  formatDate,
  formatValue,
  type FeatureKey,
  type FeatureView,
  type Source,
} from "../../lib/shared";
import { useTheme } from "../../lib/theme";

export default function PlaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const t = useTheme();
  const { profile, awaria } = useProfile();
  const [loaded, setLoaded] = useState<Loaded<PlaceResponse> | null>(null);
  const [error, setError] = useState("");
  const [live, setLive] = useState<LiveResult | null>(null);
  const [checking, setChecking] = useState(false);

  // Odświeżamy po powrocie z formularza zgłoszenia.
  useFocusEffect(
    useCallback(() => {
      getPlace(id, awaria)
        .then(setLoaded)
        .catch(() => setError("Nie udało się wczytać miejsca. Sprawdź połączenie."));
    }, [id, awaria]),
  );

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
    setLive(await liveCheck(place.id, awaria));
    setChecking(false);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: place.name }} />
      <H1>{place.name}</H1>
      <P muted>
        {CATEGORY_LABELS[place.category]}
        {place.address ? ` · ${place.address}` : ""}
      </P>

      {loaded.cachedAt && (
        <Banner title="Jesteś offline — zapisana kopia">{`Stan z ${formatDate(loaded.cachedAt)}.`}</Banner>
      )}
      {(place.sample || a.usesSample) && (
        <Banner title="Dane przykładowe">Ten wpis zawiera dane przygotowane na potrzeby demonstracji. Nie opisują rzeczywistego stanu obiektu.</Banner>
      )}

      <View
        accessible
        accessibilityLabel={`Ocena: ${v.title}. ${v.body}`}
        style={{ borderWidth: 2, borderColor: vc.fg, backgroundColor: vc.bg, borderRadius: 12, padding: 14, gap: 6 }}
      >
        <Text style={{ color: vc.fg, fontSize: 22, fontWeight: "800" }}>
          {VERDICT_ICON[a.verdict]} {v.title}
        </Text>
        <Text style={{ color: t.text, fontSize: 16 }}>{v.body}</Text>
        {a.verdict === "meets" && a.generalOnly && (
          <Text style={{ color: t.text }}>ⓘ Ocena opiera się na ogólnej deklaracji „dostępne”, bez szczegółowych pomiarów.</Text>
        )}
        {a.usesUnverified && <Text style={{ color: t.text }}>⚠ Część informacji pochodzi tylko z niezweryfikowanych zgłoszeń.</Text>}
        {a.stale && <Text style={{ color: t.text }}>⚠ Część informacji ma ponad 2 lata i może być nieaktualna.</Text>}
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Button label="🧭 Prowadź do miejsca" onPress={navigate} style={{ flexGrow: 1 }} />
        <Button
          label="Zmień wymagania"
          variant="secondary"
          onPress={() => router.push("/profil")}
          style={{ flexGrow: 1 }}
        />
      </View>

      <H2>Twoje wymagania</H2>
      <View style={{ gap: 8 }}>
        {a.requirements.map((r) => {
          const color = outcomeColor(t, r.outcome);
          return (
            <View
              key={r.id}
              accessible
              accessibilityLabel={`${r.label}: ${OUTCOME_LABEL[r.outcome]}. ${r.detail}`}
              style={{
                flexDirection: "row",
                gap: 10,
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: t.line,
                backgroundColor: t.surface,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  borderWidth: 2,
                  borderColor: color,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color, fontWeight: "800" }}>{OUTCOME_ICON[r.outcome]}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: "700", fontSize: 16 }}>
                  {r.label}: <Text style={{ color }}>{OUTCOME_LABEL[r.outcome]}</Text>
                </Text>
                <Text style={{ color: t.text, fontSize: 15 }}>{r.detail}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <H2>Bariery i udogodnienia — skąd to wiemy</H2>
      <P muted>Każda informacja ma źródło, datę i poziom wiarygodności. Gdy źródła się różnią, pokazujemy wszystkie wersje.</P>
      <View style={{ gap: 8 }}>
        {FEATURE_ORDER.map((key) => (
          <FeatureBlock key={key} featureKey={key} view={a.features[key]} sources={sources} />
        ))}
      </View>

      <H2>Na mapie</H2>
      <PlacesMap results={[{ place, assessment: a }]} height={240} />

      {place.id.startsWith("osm-") && (
        <>
          <H2>Aktualność danych z OpenStreetMap</H2>
          <P muted>Dane OSM są importowane codziennie. Możesz sprawdzić ten obiekt w OSM teraz.</P>
          <Button
            variant="secondary"
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
              <Banner title="Nie udało się połączyć z OpenStreetMap">
                {`Pokazujemy kopię z ${live.snapshotAt ? formatDate(live.snapshotAt) : "ostatniego importu"}. Nie traktuj jej jako potwierdzenia bieżącego stanu.`}
              </Banner>
            )}
          </View>
        </>
      )}

      <H2>Coś się nie zgadza?</H2>
      <P>Byłeś na miejscu? Uzupełnij to, co wiesz — wystarczy jedno pole. Nie prosimy o imię ani e-mail.</P>
      <Button label="Zgłoś poprawkę" onPress={() => router.push({ pathname: "/zglos/[id]", params: { id: place.id } })} />
    </ScrollView>
  );
}

function FeatureBlock({
  featureKey,
  view,
  sources,
}: {
  featureKey: FeatureKey;
  view?: FeatureView;
  sources: Record<string, Source>;
}) {
  const t = useTheme();
  const label = FEATURE_LABELS[featureKey];
  if (!view) {
    return (
      <Card style={{ paddingVertical: 10 }}>
        <Text style={{ color: t.muted, fontSize: 15 }}>
          <Text style={{ fontWeight: "700" }}>{label}:</Text> brak informacji w żadnym źródle.
        </Text>
      </Card>
    );
  }
  return (
    <Card style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: t.text, fontWeight: "700", fontSize: 16 }}>
        {label}
      </Text>
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {view.status === "confirmed" && <Tag kind="confirmed" label="Potwierdzone przez kilka źródeł" />}
        {view.status === "conflict" && <Tag kind="conflict" label="Sprzeczne dane" />}
        {view.stale && <Tag kind="stale" label="Może być nieaktualne" />}
        {view.unverifiedOnly && <Tag kind="unverified" label="Niezweryfikowane" />}
      </View>
      {view.facts.map((f, i) => {
        const src = sources[f.sourceId];
        return (
          <View key={i} style={{ borderLeftWidth: 4, borderLeftColor: t.line, paddingLeft: 10, gap: 2 }}>
            <Text style={{ color: t.text, fontSize: 15 }}>
              <Text style={{ fontWeight: "700" }}>{formatValue(f.key, f.value)}</Text>
              {f.note ? ` — ${f.note}` : ""}
            </Text>
            {f.sample && <Tag kind="sample" label="Dane przykładowe" />}
            <Text style={{ color: t.muted, fontSize: 14 }}>
              Źródło: {src ? `${src.name} (${SOURCE_KIND_LABELS[src.kind]})` : f.sourceId} · stan na{" "}
              {f.observedAt ? formatDate(f.observedAt) : "datę nieznaną"}
            </Text>
            {f.ref && (
              <Text
                accessibilityRole="link"
                onPress={() => Linking.openURL(f.ref!)}
                style={{ color: t.accent, fontSize: 14, textDecorationLine: "underline", paddingVertical: 6 }}
              >
                Rekord w źródle
              </Text>
            )}
          </View>
        );
      })}
    </Card>
  );
}
