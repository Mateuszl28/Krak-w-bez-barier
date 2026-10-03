import { View } from "react-native";
import { PRESETS, PRESET_LABELS, type Profile } from "../lib/shared";
import { useProfile } from "../lib/profile";
import { Chip } from "./ui";

export const PRESET_ICONS: Record<Profile["preset"], string> = {
  wheelchair_manual: "♿",
  wheelchair_electric: "⚡",
  stroller: "👶",
  custom: "⚙",
};

export function ProfileChips() {
  const { profile, setProfile } = useProfile();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Czym się poruszasz?" style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => (
        <Chip
          key={key}
          icon={PRESET_ICONS[key]}
          label={PRESET_LABELS[key]}
          selected={profile.preset === key}
          onPress={() => setProfile(PRESETS[key])}
        />
      ))}
      {profile.preset === "custom" && (
        <Chip icon={PRESET_ICONS.custom} label={PRESET_LABELS.custom} selected onPress={() => {}} />
      )}
    </View>
  );
}
