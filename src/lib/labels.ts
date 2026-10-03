import type { Category, FactValue, FeatureKey, Profile, SourceKind } from "./model.ts";

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  entrance: "Wejście",
  step_count: "Liczba stopni przy wejściu",
  step_height_cm: "Wysokość progu / stopnia",
  door_width_cm: "Szerokość drzwi",
  elevator: "Winda",
  toilet: "Toaleta dostępna dla wózka",
  changing_table: "Przewijak",
  surface: "Nawierzchnia dojścia",
  rest: "Miejsca do odpoczynku",
  parking: "Parking dla osób z niepełnosprawnościami",
  general: "Ogólna ocena w źródle",
};

/** Kolejność wyświetlania cech na karcie miejsca. */
export const FEATURE_ORDER: FeatureKey[] = [
  "entrance",
  "step_count",
  "step_height_cm",
  "door_width_cm",
  "elevator",
  "toilet",
  "changing_table",
  "surface",
  "rest",
  "parking",
  "general",
];

const ENUM_LABELS: Record<string, string> = {
  level: "bez stopni (poziom terenu)",
  ramp: "podjazd / pochylnia",
  lift: "platforma lub winda",
  steps: "stopnie",
  smooth: "gładka (asfalt, płyty)",
  paving: "kostka brukowa",
  cobblestone: "bruk / kocie łby",
  gravel: "żwir / nieutwardzona",
  yes: "dostępne",
  limited: "częściowo dostępne",
  no: "niedostępne",
};

export function formatValue(key: FeatureKey, value: FactValue): string {
  if (typeof value === "boolean") return value ? "tak" : "nie";
  if (typeof value === "number") {
    if (key.endsWith("_cm")) return `${value} cm`;
    return String(value);
  }
  return ENUM_LABELS[value] ?? value;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  culture: "Kultura",
  food: "Gastronomia",
  accommodation: "Nocleg",
  toilet: "Toaleta publiczna",
  transport: "Transport",
  office: "Urząd",
  health: "Zdrowie",
  shop: "Sklep",
  attraction: "Atrakcja",
  other: "Inne",
};

export const SOURCE_KIND_LABELS: Record<SourceKind, string> = {
  official: "Dane publiczne",
  owner: "Deklaracja właściciela",
  community: "Dane społeczności (OpenStreetMap)",
  user_report: "Zgłoszenie użytkownika — niezweryfikowane",
};

export const PRESETS: Record<Exclude<Profile["preset"], "custom">, Profile> = {
  wheelchair_manual: {
    preset: "wheelchair_manual",
    maxStepCm: 2,
    minDoorCm: 80,
    needToilet: false,
    needChangingTable: false,
    avoidCobbles: false,
  },
  wheelchair_electric: {
    preset: "wheelchair_electric",
    maxStepCm: 2,
    minDoorCm: 90,
    needToilet: false,
    needChangingTable: false,
    avoidCobbles: false,
  },
  stroller: {
    preset: "stroller",
    maxStepCm: 15,
    minDoorCm: 65,
    needToilet: false,
    needChangingTable: false,
    avoidCobbles: false,
  },
};

export const PRESET_LABELS: Record<Profile["preset"], string> = {
  wheelchair_manual: "Wózek ręczny",
  wheelchair_electric: "Wózek elektryczny",
  stroller: "Wózek dziecięcy",
  custom: "Własne ustawienia",
};

export const DEFAULT_PROFILE = PRESETS.wheelchair_manual;

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}
