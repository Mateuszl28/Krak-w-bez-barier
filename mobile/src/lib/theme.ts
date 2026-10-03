import { useColorScheme } from "react-native";

// Kolory jak w wersji webowej — kontrast tekstu ≥ 4.5:1 w obu motywach.
const light = {
  bg: "#f7f7f5",
  surface: "#ffffff",
  text: "#1a1a1a",
  muted: "#4a4a4a",
  border: "#8a8a8a",
  line: "#d6d6d2",
  accent: "#0a4fa8",
  accentText: "#ffffff",
  ok: "#0b6b2e",
  okBg: "#e3f3e8",
  bad: "#a4161a",
  badBg: "#fbe6e6",
  unk: "#6b4a00",
  unkBg: "#fdf1d6",
  infoBg: "#e6eefa",
  sample: "#5b2a86",
  hero: "#0a4fa8",
  heroText: "#ffffff",
  heroMuted: "#d6e4fb",
  shadow: "#0b1a33",
};

const dark: typeof light = {
  bg: "#121314",
  surface: "#1c1d1f",
  text: "#f1f1ef",
  muted: "#c4c4c0",
  border: "#8f8f8a",
  line: "#34363a",
  accent: "#8db8ff",
  accentText: "#0b1a33",
  ok: "#7fd99a",
  okBg: "#12301c",
  bad: "#ff9a9a",
  badBg: "#3a1416",
  unk: "#f3c868",
  unkBg: "#33280c",
  infoBg: "#17243a",
  sample: "#c9a3f0",
  hero: "#0d2a52",
  heroText: "#ffffff",
  heroMuted: "#b9cdee",
  shadow: "#000000",
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
