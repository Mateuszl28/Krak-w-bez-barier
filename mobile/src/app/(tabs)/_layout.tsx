import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, type IconName } from "../../components/ui";
import { useTheme } from "../../lib/theme";

const tab = (icon: IconName) => ({ color }: { color: ColorValue }) => <Icon name={icon} size={26} color={color as string} />;

export default function TabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.muted,
        tabBarStyle: {
          backgroundColor: t.surface,
          borderTopColor: t.line,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
        },
        tabBarLabelStyle: { fontSize: 13, fontWeight: "700" },
        headerStyle: { backgroundColor: t.hero },
        headerTintColor: t.heroText,
        headerTitleStyle: { color: t.heroText, fontWeight: "700" },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Szukaj", headerShown: false, tabBarIcon: tab("magnify") }} />
      <Tabs.Screen name="mapa" options={{ title: "Mapa", tabBarIcon: tab("map-outline") }} />
      <Tabs.Screen name="profil" options={{ title: "Potrzeby", headerTitle: "Twoje potrzeby", tabBarIcon: tab("tune-variant") }} />
      <Tabs.Screen name="zrodla" options={{ title: "Info", headerTitle: "Źródła i metoda", tabBarIcon: tab("information-outline") }} />
    </Tabs>
  );
}
