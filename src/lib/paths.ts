// Sieć piesza z OSM w zwartej postaci — do oceny tras dojścia.

export interface PathWay {
  /** highway=* */
  h: string;
  /** nawierzchnia znormalizowana: smooth | paving | cobblestone | gravel */
  s?: string;
  /** nachylenie w % (wartość bezwzględna), jeśli podane */
  i?: number;
  /** liczba stopni (dla highway=steps) */
  sc?: number;
  /** geometria: [lat, lon][] */
  g: [number, number][];
}

export interface KerbNode {
  /** raised | lowered | flush */
  k: string;
  lat: number;
  lon: number;
}

export interface PathsFile {
  fetchedAt: string;
  bbox: [number, number, number, number];
  ways: PathWay[];
  kerbs: KerbNode[];
}

const SURFACE: Record<string, string> = {
  asphalt: "smooth",
  concrete: "smooth",
  "concrete:plates": "smooth",
  paved: "smooth",
  paving_stones: "paving",
  "paving_stones:30": "paving",
  sett: "cobblestone",
  cobblestone: "cobblestone",
  unhewn_cobblestone: "cobblestone",
  gravel: "gravel",
  fine_gravel: "gravel",
  compacted: "gravel",
  unpaved: "gravel",
  dirt: "gravel",
  ground: "gravel",
  grass: "gravel",
  sand: "gravel",
};

export function normalizeSurface(raw?: string): string | undefined {
  return raw ? SURFACE[raw] : undefined;
}

export function parseIncline(raw?: string): number | undefined {
  if (!raw) return undefined;
  const m = raw.match(/^-?(\d+(?:\.\d+)?)\s*%$/);
  return m ? Number(m[1]) : undefined;
}

export function normalizeKerb(raw?: string): string | undefined {
  if (raw === "raised" || raw === "regular" || raw === "yes") return "raised";
  if (raw === "lowered" || raw === "rolled") return "lowered";
  if (raw === "flush" || raw === "no") return "flush";
  return undefined;
}
