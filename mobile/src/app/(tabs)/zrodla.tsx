import { ScrollView, Switch, Text, View } from "react-native";
import { Card, P, SectionTitle, Tag } from "../../components/ui";
import { API_URL } from "../../lib/api";
import { useProfile } from "../../lib/profile";
import { SOURCES } from "../../lib/shared";
import { useT } from "../../lib/strings";
import { useTheme } from "../../lib/theme";

export default function SourcesScreen() {
  const t = useTheme();
  const { awaria, setAwaria } = useProfile();
  const { s, L } = useT();
  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <P>{s.infoIntro}</P>

      <SectionTitle icon="database-outline">{s.sources}</SectionTitle>
      <View style={{ gap: 8 }}>
        {Object.values(SOURCES).map((src) => (
          <Card key={src.id} style={{ gap: 4 }}>
            <Text style={{ color: t.text, fontWeight: "700", fontSize: 16 }}>{src.name}</Text>
            <Text style={{ color: t.muted }}>{L.sourceKind[src.kind]}</Text>
            <Text style={{ color: t.text }}>{s.sourceDescriptions[src.id] ?? src.description}</Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>
              {s.license}: {src.license}
            </Text>
            <Text style={{ color: t.muted, fontSize: 14 }}>
              {s.updates}: {src.updateFrequency}
            </Text>
          </Card>
        ))}
      </View>

      <SectionTitle icon="shield-check-outline">{s.trustLevels}</SectionTitle>
      <View style={{ gap: 6 }}>
        <Tag kind="confirmed" label={s.tagConfirmed} />
        <P>{s.trustConfirmed}</P>
        <Tag kind="unverified" label={s.tagUnverified} />
        <P>{s.trustUnverified}</P>
        <Tag kind="stale" label={s.tagStaleOne} />
        <P>{s.trustStale}</P>
        <Tag kind="conflict" label={s.tagConflict} />
        <P>{s.trustConflict}</P>
        <Tag kind="sample" label={s.tagSample} />
        <P>{s.trustSample}</P>
      </View>

      <SectionTitle icon="lock-outline">{s.privacy}</SectionTitle>
      <P>{s.privacyBody}</P>

      <SectionTitle icon="flask-outline">{s.demo}</SectionTitle>
      <Card style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", minHeight: 48, gap: 12 }}>
          <Text style={{ color: t.text, fontSize: 16, flex: 1 }}>{s.simulateOutage}</Text>
          <Switch
            accessibilityLabel={s.simulateOutage}
            value={awaria === "osm"}
            onValueChange={(on) => setAwaria(on ? "osm" : "")}
          />
        </View>
        <Text style={{ color: t.muted, fontSize: 14 }}>{s.simulateHint}</Text>
        <Text style={{ color: t.muted, fontSize: 14 }}>{s.server(API_URL)}</Text>
      </Card>
    </ScrollView>
  );
}
