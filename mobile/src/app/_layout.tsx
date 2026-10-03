import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileProvider } from "../lib/profile";
import { SearchProvider } from "../lib/search";
import { useTheme } from "../lib/theme";

export default function RootLayout() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <SearchProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: t.hero },
              headerTintColor: t.heroText,
              headerTitleStyle: { color: t.heroText, fontWeight: "700" },
              contentStyle: { backgroundColor: t.bg },
              headerBackTitle: "Wróć",
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="miejsce/[id]" options={{ title: "Miejsce" }} />
            <Stack.Screen name="zglos/[id]" options={{ title: "Zgłoś poprawkę", presentation: "modal" }} />
          </Stack>
        </SearchProvider>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
