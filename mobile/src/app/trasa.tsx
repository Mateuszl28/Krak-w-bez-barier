import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteMap, SEGMENT_COLOR } from "../components/RouteMap";
import {
  Banner,
  Card,
  Icon,
  OUTCOME_MCI,
  P,
  SectionTitle,
  VERDICT_MCI,
  outcomeColor,
  verdictColors,
} from "../components/ui";
import { getRoute, type RouteResult } from "../lib/api";
import { useProfile } from "../lib/profile";
import { useT } from "../lib/strings";
import { formatDate } from "../lib/shared";
import { useTheme } from "../lib/theme";

// Ocena trasy dojścia: od przystanku lub z lokalizacji użytkownika do miejsca.
export default function RouteScreen() {
  const q = useLocalSearchParams<{
    fromLat: string;
    fromLon: string;
    toLat: string;
    toLon: string;
    fromName?: string;
    toName?: string;
  }>();
  const t = useTheme();
  const { s: S, L, locale } = useT();
  const { profile, city, awaria } = useProfile();
  const [data, setData] = useState<RouteResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    getRoute([Number(q.fromLat), Number(q.fromLon)], [Number(q.toLat), Number(q.toLon)], profile, {
      city,
      locale,
      awaria,
    })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [q.fromLat, q.fromLon, q.toLat, q.toLon, profile, city, locale, awaria]);

  const title = S.routeFrom(q.fromName || S.myLocation, q.toName || "");

  if (!data) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Stack.Screen options={{ title: S.routeTitle }} />
        <Text accessibilityRole="header" style={{ color: t.text, fontSize: 20, fontWeight: "800" }}>
          {title}
        </Text>
        {error ? (
          <Banner title={error} icon="map-marker-off" />
        ) : (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <ActivityIndicator color={t.accent} />
            <P muted style={{ marginBottom: 0 }}>
              {S.routeLoading}
            </P>
          </View>
        )}
      </View>
    );
  }

  const r = data.route;
  const vc = verdictColors(t, r.verdict);
  const minutes = Math.max(1, Math.round(r.distanceM / 60)); // ok. 3,6 km/h
  const surfaceOrder = ["smooth", "paving", "cobblestone", "gravel", "unknown"];
  const totalSurface = Object.values(r.surfaces).reduce((a, b) => a + b, 0) || 1;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Stack.Screen options={{ title: S.routeTitle }} />
      <Text accessibilityRole="header" style={{ color: t.text, fontSize: 20, fontWeight: "800", marginBottom: 4 }}>
        {title}
      </Text>
      <P muted>{S.routeLength(r.distanceM, minutes)}</P>

      <View
        accessible
        accessibilityLabel={`${S.routeVerdictTitle[r.verdict]}.`}
        style={[styles.verdict, { backgroundColor: vc.bg, borderColor: vc.fg }]}
      >
        <Icon name={VERDICT_MCI[r.verdict]} size={32} color={vc.fg} />
        <Text style={{ color: vc.fg, fontSize: 19, fontWeight: "800", flex: 1 }}>{S.routeVerdictTitle[r.verdict]}</Text>
      </View>

      {!data.insideDataArea && <Banner title={S.routeOutside} icon="map-marker-question" />}

      <Card style={{ paddingVertical: 4, marginTop: 12 }}>
        {r.requirements.map((req, i) => {
          const color = outcomeColor(t, req.outcome);
          return (
            <View
              key={req.id}
              accessible
              accessibilityLabel={`${req.label}: ${S.outcome[req.outcome]}. ${req.detail}`}
              style={[styles.req, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }]}
            >
              <Icon name={OUTCOME_MCI[req.outcome]} size={26} color={color} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: t.text, fontWeight: "700", fontSize: 16 }}>{req.label}</Text>
                <Text style={{ color, fontWeight: "700", fontSize: 14 }}>{S.outcome[req.outcome]}</Text>
                <Text style={{ color: t.text, fontSize: 15 }}>{req.detail}</Text>
              </View>
            </View>
          );
        })}
      </Card>
      <P muted style={{ marginTop: 8 }}>
        {S.routeChosen(data.alternatives)}
      </P>

      <SectionTitle icon="map-legend">{S.routeTitle}</SectionTitle>
      <RouteMap route={r} label={S.routeMapLabel} />
      <View style={styles.legend}>
        {(Object.keys(SEGMENT_COLOR) as (keyof typeof SEGMENT_COLOR)[]).map((k) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 22,
                height: 6,
                borderRadius: 3,
                backgroundColor: SEGMENT_COLOR[k],
                opacity: k === "unknown" ? 0.6 : 1,
              }}
            />
            <Text style={{ color: t.text, fontSize: 13 }}>{S.routeLegend[k]}</Text>
          </View>
        ))}
      </View>

      <SectionTitle icon="texture-box">{S.routeSurfaces}</SectionTitle>
      <Card style={{ gap: 10 }}>
        {surfaceOrder
          .filter((k) => r.surfaces[k])
          .map((k) => {
            const m = r.surfaces[k];
            const pct = Math.round((m / totalSurface) * 100);
            return (
              <View key={k} accessible accessibilityLabel={`${k === "unknown" ? S.routeNoData : L.enums[k]}: ${m} m`}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: t.text, fontSize: 15 }}>{k === "unknown" ? S.routeNoData : L.enums[k]}</Text>
                  <Text style={{ color: t.muted, fontSize: 15 }}>
                    {m} m · {pct}%
                  </Text>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: t.bg, overflow: "hidden" }}>
                  <View
                    style={{
                      width: `${pct}%`,
                      height: 8,
                      backgroundColor:
                        k === "cobblestone" || k === "gravel" ? "#b35c00" : k === "unknown" ? "#8a8a8a" : t.ok,
                    }}
                  />
                </View>
              </View>
            );
          })}
        <Text style={{ color: t.muted, fontSize: 14 }}>{S.routeCoverage(Math.round(r.coverage * 100))}</Text>
      </Card>

      <SectionTitle icon="database-outline">{S.routeSources}</SectionTitle>
      <P muted>{data.sources.routing}</P>
      <P muted>{`${data.sources.paths} (${formatDate(r.dataDate, locale)})`}</P>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  verdict: { flexDirection: "row", gap: 12, alignItems: "center", borderRadius: 16, borderWidth: 2, padding: 14 },
  req: { flexDirection: "row", gap: 12, paddingVertical: 12 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 },
});
