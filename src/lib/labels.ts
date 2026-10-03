import type { Locale } from "./i18n.ts";
import type { Category, FactValue, FeatureKey, Profile, SourceKind } from "./model.ts";

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

interface Labels {
  feature: Record<FeatureKey, string>;
  enums: Record<string, string>;
  yes: string;
  no: string;
  category: Record<Category, string>;
  sourceKind: Record<SourceKind, string>;
  preset: Record<Profile["preset"], string>;
  dateLocale: string;
}

export const LABELS: Record<Locale, Labels> = {
  pl: {
    feature: {
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
    },
    enums: {
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
    },
    yes: "tak",
    no: "nie",
    category: {
      culture: "Kultura",
      food: "Gastronomia",
      accommodation: "Nocleg",
      toilet: "Toaleta publiczna",
      transport: "Transport",
      office: "Urząd",
      health: "Zdrowie",
      shop: "Sklep",
      attraction: "Atrakcja",
      sport: "Sport",
      other: "Inne",
    },
    sourceKind: {
      official: "Dane publiczne",
      owner: "Deklaracja właściciela",
      community: "Dane społeczności (OpenStreetMap)",
      user_report: "Zgłoszenie użytkownika — niezweryfikowane",
    },
    preset: {
      wheelchair_manual: "Wózek ręczny",
      wheelchair_electric: "Wózek elektryczny",
      stroller: "Wózek dziecięcy",
      custom: "Własne ustawienia",
    },
    dateLocale: "pl-PL",
  },
  en: {
    feature: {
      entrance: "Entrance",
      step_count: "Steps at the entrance",
      step_height_cm: "Threshold / step height",
      door_width_cm: "Door width",
      elevator: "Elevator",
      toilet: "Wheelchair-accessible toilet",
      changing_table: "Baby changing table",
      surface: "Approach surface",
      rest: "Places to rest",
      parking: "Disabled parking",
      general: "General rating in source",
    },
    enums: {
      level: "step-free (ground level)",
      ramp: "ramp",
      lift: "platform lift or elevator",
      steps: "steps",
      smooth: "smooth (asphalt, slabs)",
      paving: "paving blocks",
      cobblestone: "cobblestones",
      gravel: "gravel / unpaved",
      yes: "accessible",
      limited: "partly accessible",
      no: "not accessible",
    },
    yes: "yes",
    no: "no",
    category: {
      culture: "Culture",
      food: "Food & drink",
      accommodation: "Accommodation",
      toilet: "Public toilet",
      transport: "Transport",
      office: "Public office",
      health: "Health",
      shop: "Shop",
      attraction: "Attraction",
      sport: "Sport",
      other: "Other",
    },
    sourceKind: {
      official: "Public data",
      owner: "Owner's declaration",
      community: "Community data (OpenStreetMap)",
      user_report: "User report — unverified",
    },
    preset: {
      wheelchair_manual: "Manual wheelchair",
      wheelchair_electric: "Power wheelchair",
      stroller: "Baby stroller",
      custom: "Custom settings",
    },
    dateLocale: "en-GB",
  },
};

// Polskie etykiety jako domyślne — wersja webowa i API.
export const FEATURE_LABELS = LABELS.pl.feature;
export const CATEGORY_LABELS = LABELS.pl.category;
export const SOURCE_KIND_LABELS = LABELS.pl.sourceKind;
export const PRESET_LABELS = LABELS.pl.preset;

export function formatValue(key: FeatureKey, value: FactValue, locale: Locale = "pl"): string {
  const l = LABELS[locale];
  if (typeof value === "boolean") return value ? l.yes : l.no;
  if (typeof value === "number") {
    if (key.endsWith("_cm")) return `${value} cm`;
    return String(value);
  }
  return l.enums[value] ?? value;
}

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

export const DEFAULT_PROFILE = PRESETS.wheelchair_manual;

export function formatDate(iso: string, locale: Locale = "pl"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(LABELS[locale].dateLocale, { day: "numeric", month: "long", year: "numeric" });
}
