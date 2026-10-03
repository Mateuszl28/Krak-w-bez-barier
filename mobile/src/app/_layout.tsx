import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ProfileProvider } from "../lib/profile";
import { useTheme } from "../lib/theme";

export default function RootLayout() {
  const t = useTheme();
  return (
    <SafeAreaProvider>
      <ProfileProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: t.surface },
            headerTintColor: t.accent,
            headerTitleStyle: { color: t.text, fontWeight: "700" },
            contentStyle: { backgroundColor: t.bg },
            headerBackTitle: "Wróć",
          }}
        >
          <Stack.Screen name="index" options={{ title: "Kraków bez barier" }} />
          <Stack.Screen name="miejsce/[id]" options={{ title: "Miejsce" }} />
          <Stack.Screen name="profil" options={{ title: "Twoje potrzeby", presentation: "modal" }} />
          <Stack.Screen name="zglos/[id]" options={{ title: "Zgłoś poprawkę", presentation: "modal" }} />
          <Stack.Screen name="zrodla" options={{ title: "Źródła i metoda" }} />
        </Stack>
      </ProfileProvider>
    </SafeAreaProvider>
  );
}
