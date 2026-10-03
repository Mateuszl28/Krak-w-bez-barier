import { StyleSheet, Text, View } from "react-native";
import { assessStop, formatDate, type NearbyStop, type Profile, type Source } from "../lib/shared";
import { useTheme } from "../lib/theme";
import { Card, Icon, OUTCOME_LABEL, OUTCOME_MCI, P, VerdictBadge, outcomeColor, type IconName } from "./ui";

const MODE: Record<NearbyStop["mode"], string> = { bus: "autobus", tram: "tramwaj", bus_tram: "autobus i tramwaj" };
const MODE_ICON: Record<NearbyStop["mode"], IconName> = { bus: "bus", tram: "tram", bus_tram: "bus-multiple" };

// Dojście do miejsca od najbliższych przystanków — wsiadanie, peron, odpoczynek.
export function StopsList({
  stops,
  profile,
  sources,
}: {
  stops: NearbyStop[];
  profile: Profile;
  sources: Record<string, Source>;
}) {
  const t = useTheme();
  if (stops.length === 0) return <P>Brak przystanków w promieniu 600 m w danych ZTP.</P>;
  return (
    <View style={{ gap: 10 }}>
      <P muted>Najbliższe przystanki i to, jak się z nich wsiada. Odległość w linii prostej.</P>
      {stops.map((s) => {
        const a = assessStop(s, profile);
        const rest = a.rest
          ? [s.shelters ? `wiata (${s.shelters})` : "", s.benches ? `ławki (${s.benches})` : ""].filter(Boolean).join(", ")
          : "brak wiaty i ławek";
        return (
          <Card key={s.id} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Icon name={MODE_ICON[s.mode]} size={26} color={t.accent} />
              <View style={{ flex: 1 }}>
                <Text accessibilityRole="header" style={{ color: t.text, fontWeight: "800", fontSize: 16 }}>
                  {s.name}
                </Text>
                <Text style={{ color: t.muted, fontSize: 14 }}>
                  {MODE[s.mode]} · ok. {s.distanceM} m
                </Text>
              </View>
            </View>
            <VerdictBadge verdict={a.verdict} />
            {[a.boarding, a.platform].map((r) => (
              <View
                key={r.id}
                style={styles.row}
                accessible
                accessibilityLabel={`${r.label}: ${OUTCOME_LABEL[r.outcome]}. ${r.detail}`}
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
                <Text style={{ fontWeight: "700" }}>Odpoczynek: </Text>
                {rest}
              </Text>
            </View>
            <Text style={{ color: t.muted, fontSize: 13 }}>
              {sources[s.sourceId]?.name ?? s.sourceId}
              {s.observedAt ? ` · ${formatDate(s.observedAt)}` : ""}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
});
