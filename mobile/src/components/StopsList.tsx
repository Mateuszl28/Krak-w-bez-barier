import { Text, View } from "react-native";
import { assessStop, formatDate, type NearbyStop, type Profile, type Source } from "../lib/shared";
import { useTheme } from "../lib/theme";
import { Card, OUTCOME_ICON, OUTCOME_LABEL, P, VerdictBadge, outcomeColor } from "./ui";

const MODE: Record<NearbyStop["mode"], string> = { bus: "autobus", tram: "tramwaj", bus_tram: "autobus i tramwaj" };

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
    <View style={{ gap: 8 }}>
      <P muted>
        Najbliższe przystanki i to, jak się z nich wsiada. Odległość w linii prostej — nawierzchnia chodnika na dojściu
        nie jest jeszcze oceniana.
      </P>
      {stops.map((s) => {
        const a = assessStop(s, profile);
        const rest = a.rest
          ? [s.shelters ? `wiata (${s.shelters})` : "", s.benches ? `ławki (${s.benches})` : ""].filter(Boolean).join(", ")
          : "brak wiaty i ławek";
        return (
          <Card key={s.id} style={{ gap: 6 }}>
            <Text accessibilityRole="header" style={{ color: t.text, fontWeight: "700", fontSize: 16 }}>
              {s.name} · {MODE[s.mode]} · ok. {s.distanceM} m
            </Text>
            <VerdictBadge verdict={a.verdict} />
            {[a.boarding, a.platform].map((r) => (
              <Text
                key={r.id}
                style={{ color: t.text, fontSize: 15 }}
                accessibilityLabel={`${r.label}: ${OUTCOME_LABEL[r.outcome]}. ${r.detail}`}
              >
                <Text style={{ color: outcomeColor(t, r.outcome), fontWeight: "800" }}>{OUTCOME_ICON[r.outcome]} </Text>
                <Text style={{ fontWeight: "700" }}>{r.label}</Text> ({OUTCOME_LABEL[r.outcome]}): {r.detail}
              </Text>
            ))}
            <Text style={{ color: t.text, fontSize: 15 }}>
              <Text style={{ fontWeight: "700" }}>Odpoczynek:</Text> {rest}
            </Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>
              Źródło: {sources[s.sourceId]?.name ?? s.sourceId}
              {s.observedAt ? ` · stan na ${formatDate(s.observedAt)}` : ""}
            </Text>
          </Card>
        );
      })}
    </View>
  );
}
