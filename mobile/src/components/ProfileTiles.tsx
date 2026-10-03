import { Pressable, Text, View } from "react-native";
import { useProfile } from "../lib/profile";
import { PRESETS, PRESET_LABELS } from "../lib/shared";
import { useTheme } from "../lib/theme";
import { Icon, PRESET_ICON, shadow } from "./ui";

// Wybór profilu: trzy kafelki z ikoną. Działa jak grupa przycisków radiowych.
export function ProfileTiles({ onDark = false }: { onDark?: boolean }) {
  const t = useTheme();
  const { profile, setProfile } = useProfile();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Czym się poruszasz?" style={{ flexDirection: "row", gap: 10 }}>
      {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => {
        const selected = profile.preset === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={PRESET_LABELS[key]}
            onPress={() => setProfile(PRESETS[key])}
            style={[
              {
                flex: 1,
                minHeight: 88,
                borderRadius: 16,
                paddingVertical: 12,
                paddingHorizontal: 6,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                borderWidth: 2,
                borderColor: selected ? (onDark ? "#ffffff" : t.accent) : "transparent",
                backgroundColor: selected ? (onDark ? "#ffffff" : t.infoBg) : onDark ? "rgba(255,255,255,0.14)" : t.surface,
              },
              !onDark && shadow(t),
            ]}
          >
            <Icon
              name={PRESET_ICON[key]}
              size={30}
              color={selected ? t.hero : onDark ? "#ffffff" : t.accent}
            />
            <Text
              style={{
                textAlign: "center",
                fontWeight: "700",
                fontSize: 14,
                color: selected ? (onDark ? t.hero : t.text) : onDark ? "#ffffff" : t.text,
              }}
            >
              {PRESET_LABELS[key]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
