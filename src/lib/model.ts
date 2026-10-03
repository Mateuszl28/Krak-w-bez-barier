// Wspólny model danych. Każde źródło (OSM, dane miejskie, deklaracje właścicieli,
// zgłoszenia) jest sprowadzane do listy "faktów" o miejscu — warstwa prezentacji
// nie wie nic o formacie źródeł.

export type FeatureKey =
  | "entrance" // "level" | "ramp" | "lift" | "steps"
  | "step_count" // liczba stopni przy wejściu
  | "step_height_cm" // wysokość najwyższego progu/stopnia
  | "door_width_cm" // szerokość światła drzwi
  | "elevator" // winda do innych kondygnacji
  | "toilet" // toaleta dostępna dla wózka
  | "changing_table" // przewijak
  | "surface" // nawierzchnia dojścia: "smooth" | "paving" | "cobblestone" | "gravel"
  | "rest" // miejsca do odpoczynku (siedziska, ławki)
  | "parking" // miejsce postojowe dla osób z niepełnosprawnościami w pobliżu
  | "general"; // ogólna deklaracja: "yes" | "limited" | "no"

export type FactValue = string | number | boolean;

export type SourceKind = "official" | "owner" | "community" | "user_report";

export interface Source {
  id: string;
  name: string;
  kind: SourceKind;
  url: string;
  license: string;
  updateFrequency: string;
  description: string;
}

export interface Fact {
  key: FeatureKey;
  value: FactValue;
  sourceId: string;
  /** Data pozyskania lub ostatniego potwierdzenia (YYYY-MM-DD). */
  observedAt: string;
  /** Link do rekordu w źródle, jeśli istnieje. */
  ref?: string;
  note?: string;
  /** Dane przykładowe przygotowane na potrzeby demonstracji. */
  sample?: boolean;
}

export type Category =
  | "culture"
  | "food"
  | "accommodation"
  | "toilet"
  | "transport"
  | "office"
  | "health"
  | "shop"
  | "attraction"
  | "other";

export interface Place {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lon: number;
  address?: string;
  facts: Fact[];
  /** Miejsce wymyślone/uzupełnione na potrzeby demo. */
  sample?: boolean;
}

export interface SourceStatus {
  sourceId: string;
  ok: boolean;
  fetchedAt?: string;
  records?: number;
  error?: string;
}

export interface Profile {
  preset: "wheelchair_manual" | "wheelchair_electric" | "stroller" | "custom";
  /** Najwyższy próg/stopień, który pokonam samodzielnie (cm). */
  maxStepCm: number;
  /** Minimalna szerokość przejścia (cm). */
  minDoorCm: number;
  needToilet: boolean;
  needChangingTable: boolean;
  avoidCobbles: boolean;
}

/** Przystanek komunikacji miejskiej — punkt startowy dojścia do miejsca. */
export interface TransitStop {
  id: string;
  name: string;
  mode: "bus" | "tram" | "bus_tram";
  lat: number;
  lon: number;
  /** "kassel" — peron podwyższony (wsiadanie niemal bez progu), "standard", "none" — z poziomu jezdni. */
  kerb?: "kassel" | "standard" | "none";
  /** Nawierzchnia peronu: "smooth" | "paving" | "gravel". */
  surface?: string;
  shelters: number;
  benches: number;
  sourceId: string;
  observedAt: string;
}

export interface NearbyStop extends TransitStop {
  distanceM: number;
}
