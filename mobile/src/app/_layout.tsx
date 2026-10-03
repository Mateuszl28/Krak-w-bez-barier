import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileProvider } from "../lib/profile";
import { SearchProvider } from "../lib/search";
import { useT } from "../lib/strings";
import { useTheme } from "../lib/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <SearchProvider>
          <StatusBar style="light" />
          <AppStack />
        </SearchProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}

// Osobny komponent, żeby nagłówki korzystały z języka zapisanego w ProfileProvider.
function AppStack() {
  const t = useTheme();
  const { s } = useT();
  return (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: t.hero },
              headerTintColor: t.heroText,
              headerTitleStyle: { color: t.heroText, fontWeight: "700" },
              contentStyle: { backgroundColor: t.bg },
              headerBackTitle: s.back,
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="miejsce/[id]" options={{ title: "" }} />
            <Stack.Screen name="zglos/[id]" options={{ title: s.reportTitle, presentation: "modal" }} />
          </Stack>
  );
}
