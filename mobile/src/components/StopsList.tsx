import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { assessStop, formatDate, type NearbyStop, type Place, type Profile, type Source } from "../lib/shared";
import { useT } from "../lib/strings";
import { useTheme } from "../lib/theme";
import { Button, Card, Icon, OUTCOME_MCI, P, VerdictBadge, outcomeColor, type IconName } from "./ui";

const MODE_ICON: Record<NearbyStop["mode"], IconName> = { bus: "bus", tram: "tram", bus_tram: "bus-multiple" };

// Dojście do miejsca od najbliższych przystanków — wsiadanie, peron, odpoczynek.
export function StopsList({
  stops,
  profile,
  sources,
  place,
}: {
  stops: NearbyStop[];
  profile: Profile;
  sources: Record<string, Source>;
  place: Place;
}) {
  const t = useTheme();
  const { s: S, locale } = useT();
  if (stops.length === 0) return <P>{S.noStops}</P>;
  return (
    <View style={{ gap: 10 }}>
      <P muted>{S.stopsHint}</P>
      {stops.map((s) => {
        const a = assessStop(s, profile, locale);
        const rest = a.rest
          ? [s.shelters ? S.shelter(s.shelters) : "", s.benches ? S.benches(s.benches) : ""].filter(Boolean).join(", ")
          : S.noRest;
        return (
          <Card key={s.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name={MODE_ICON[s.mode]} size={26} color={t.accent} />
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={{ color: t.text, fontWeight: "800", fontSize: 16 }}>
                  {s.name}
                </Text>
                <Text style={{ color: t.muted, fontSize: 14 }}>
                  {S.mode[s.mode]} · {S.approx(s.distanceM)}
                </Text>
              </View>
            </View>
            <VerdictBadge verdict={a.verdict} />
            {[a.boarding, a.platform].map((r) => (
              <View
                key={r.id}
                style={styles.row}
                accessible
                accessibilityLabel={`${r.label}: ${S.outcome[r.outcome]}. ${r.detail}`}
              >
                <Icon name={OUTCOME_MCI[r.outcome]} size={20} color={outcomeColor(t, r.outcome)} />
                <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>
                  <Text style={{ fontWeight: "700" }}>{r.label}: </Text>
                  {r.detail}
                </Text>
              </View>
            ))}
            <View style={styles.row}>
              <Icon name="seat-outline" size={20} color={a.rest ? t.ok : t.muted} />
              <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>
                <Text style={{ fontWeight: "700" }}>{S.rest}: </Text>
                {rest}
              </Text>
            </View>
            <Text style={{ color: t.muted, fontSize: 13 }}>
              {sources[s.sourceId]?.name ?? s.sourceId}
              {s.observedAt ? ` · ${formatDate(s.observedAt, locale)}` : ""}
            </Text>
            <Button
              variant="secondary"
              icon="walk"
              label={S.routeFromHere}
              onPress={() =>
                router.push({
                  pathname: "/trasa",
                  params: {
                    fromLat: String(s.lat),
                    fromLon: String(s.lon),
                    toLat: String(place.lat),
                    toLon: String(place.lon),
                    fromName: s.name,
                    toName: place.name,
                  },
                })
              }
            />
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
});
