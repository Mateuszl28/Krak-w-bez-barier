import { Text, View } from "react-native";
import { PlacesMap } from "../../components/PlacesMap";
import { Icon, VERDICT_MCI, shadow, verdictColors } from "../../components/ui";
import { useSearch } from "../../lib/search";
import type { Verdict } from "../../lib/shared";
import { useT } from "../../lib/strings";
import { useTheme } from "../../lib/theme";

// Mapa pokazuje te same miejsca co lista w zakładce "Szukaj" — jest jej dodatkiem.
export default function MapScreen() {
  const t = useTheme();
  const { results, loading } = useSearch();
  const { s, V } = useT();
  return (
    <View style={{ flex: 1 }}>
      <PlacesMap results={results} height="100%" />
      <View
        style={[
          {
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            backgroundColor: t.surface,
            borderRadius: 16,
            padding: 12,
            gap: 6,
          },
          shadow(t, 2),
        ]}
      >
        <Text style={{ color: t.text, fontWeight: "700" }}>
          {loading ? s.loading : s.mapHint(results.length)}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {(["meets", "barrier", "incomplete"] as Verdict[]).map((v) => (
            <View key={v} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Icon name={VERDICT_MCI[v]} size={18} color={verdictColors(t, v).fg} />
              <Text style={{ color: t.text, fontSize: 13 }}>{V[v].title}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
