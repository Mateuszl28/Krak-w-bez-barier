// Łączy źródła danych w jedną listę miejsc. Prezentacja (strony, widżet, API)
// korzysta tylko z tego modułu — nie zna formatów poszczególnych źródeł.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ParkingSpot } from "./krakow-official.ts";
import type { Category, Fact, FactValue, FeatureKey, NearbyStop, Place, SourceStatus, TransitStop } from "./model.ts";

const DATA_DIR = path.join(process.cwd(), "data");
const PARKING_RADIUS_M = 150;

export interface CityConfig {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bbox: [number, number, number, number];
  sources: string[];
}

export interface Report {
  id: string;
  placeId: string;
  createdAt: string;
  facts: Partial<Record<FeatureKey, FactValue>>;
  comment?: string;
  sample?: boolean;
}

interface Declaration {
  placeId: string;
  declaredBy: string;
  declaredAt: string;
  place?: { name: string; category: Category; lat: number; lon: number; address?: string };
  facts: Partial<Record<FeatureKey, FactValue>>;
  notes?: string;
  sample?: boolean;
}

export interface CityData {
  config: CityConfig;
  places: Place[];
  byId: Map<string, Place>;
  stops: TransitStop[];
  status: SourceStatus[];
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

// Zgłoszenia w prototypie trzymamy w pliku (lokalnie) lub w /tmp (Vercel).
// W wersji produkcyjnej: baza danych — zob. README, sekcja "Utrzymanie".
const REPORTS_FILE = process.env.VERCEL
  ? "/tmp/kbb-reports.json"
  : path.join(DATA_DIR, "cache", "reports.json");

export async function readStoredReports(): Promise<Report[]> {
  try {
    return await readJson<Report[]>(REPORTS_FILE);
  } catch {
    return [];
  }
}

export async function addReport(report: Report): Promise<void> {
  const all = await readStoredReports();
  all.push(report);
  await mkdir(path.dirname(REPORTS_FILE), { recursive: true });
  await writeFile(REPORTS_FILE, JSON.stringify(all, null, 2));
  cache.clear();
}

// Deklaracje właścicieli przysłane formularzem — do czasu weryfikacji osobne,
// niezweryfikowane źródło.
const DECLARATIONS_FILE = process.env.VERCEL
  ? "/tmp/kbb-declarations.json"
  : path.join(DATA_DIR, "cache", "declarations.json");

export interface PendingDeclaration {
  id: string;
  placeId: string;
  organization: string;
  declaredAt: string;
  facts: Partial<Record<FeatureKey, FactValue>>;
  notes?: string;
  /** Ustawiane przez moderatora po weryfikacji (kontakt z obiektem, zdjęcia, wizyta). */
  verifiedAt?: string;
}

export async function readPendingDeclarations(): Promise<PendingDeclaration[]> {
  try {
    return await readJson<PendingDeclaration[]>(DECLARATIONS_FILE);
  } catch {
    return [];
  }
}

export async function addDeclaration(d: PendingDeclaration): Promise<void> {
  const all = await readPendingDeclarations();
  all.push(d);
  await mkdir(path.dirname(DECLARATIONS_FILE), { recursive: true });
  await writeFile(DECLARATIONS_FILE, JSON.stringify(all, null, 2));
  cache.clear();
}

/** Moderacja: weryfikacja lub odrzucenie deklaracji, usunięcie zgłoszenia (np. spam). */
export async function moderate(
  action: "verify-declaration" | "reject-declaration" | "reject-report",
  id: string,
): Promise<boolean> {
  if (action === "reject-report") {
    const all = await readStoredReports();
    const rest = all.filter((r) => r.id !== id);
    if (rest.length === all.length) return false;
    await writeFile(REPORTS_FILE, JSON.stringify(rest, null, 2));
  } else {
    const all = await readPendingDeclarations();
    const d = all.find((x) => x.id === id);
    if (!d) return false;
    const next =
      action === "reject-declaration"
        ? all.filter((x) => x.id !== id)
        : all.map((x) => (x.id === id ? { ...x, verifiedAt: new Date().toISOString().slice(0, 10) } : x));
    await writeFile(DECLARATIONS_FILE, JSON.stringify(next, null, 2));
  }
  cache.clear();
  return true;
}

function toFacts(
  facts: Partial<Record<FeatureKey, FactValue>>,
  sourceId: string,
  observedAt: string,
  extra: Partial<Fact>,
): Fact[] {
  return Object.entries(facts).map(([key, value]) => ({
    key: key as FeatureKey,
    value: value as FactValue,
    sourceId,
    observedAt,
    ...extra,
  }));
}

const cache = new Map<string, Promise<CityData>>();

/**
 * `offline` pozwala zasymulować niedostępność źródła (demo: ?awaria=osm).
 */
export function loadCity(cityId = "krakow", offline: string[] = []): Promise<CityData> {
  const key = `${cityId}|${offline.join(",")}`;
  if (!cache.has(key)) {
    // Nieudane wczytanie (np. nieznane miasto) nie zostaje w pamięci podręcznej.
    const p = buildCity(cityId, offline).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, p);
  }
  return cache.get(key)!;
}

async function buildCity(cityId: string, offline: string[]): Promise<CityData> {
  const dir = path.join(DATA_DIR, cityId);
  const config = await readJson<CityConfig>(path.join(dir, "city.json"));
  const byId = new Map<string, Place>();
  const status: SourceStatus[] = [];

  async function load(sourceId: string, fn: () => Promise<{ fetchedAt?: string; records: number }>) {
    if (!config.sources.includes(sourceId)) return;
    if (offline.includes(sourceId)) {
      status.push({ sourceId, ok: false, error: "Źródło niedostępne (symulacja awarii)" });
      return;
    }
    try {
      const r = await fn();
      status.push({ sourceId, ok: true, ...r });
    } catch (err) {
      status.push({ sourceId, ok: false, error: (err as Error).message });
    }
  }

  await load("osm", async () => {
    const osm = await readJson<{ fetchedAt: string; places: Place[] }>(path.join(dir, "osm.json"));
    for (const p of osm.places) byId.set(p.id, { ...p, facts: [...p.facts] });
    return { fetchedAt: osm.fetchedAt, records: osm.places.length };
  });

  let parking: ParkingSpot[] = [];
  let stops: TransitStop[] = [];
  let parkingDate = "";
  await load("krakow_open_data", async () => {
    const official = await readJson<{
      fetchedAt: string;
      places: Place[];
      parking: ParkingSpot[];
      stops?: TransitStop[];
    }>(
      path.join(dir, "official.json"),
    );
    for (const p of official.places) byId.set(p.id, { ...p, facts: [...p.facts] });
    parking = official.parking;
    stops = official.stops ?? [];
    parkingDate = official.fetchedAt.slice(0, 10);
    return { fetchedAt: official.fetchedAt, records: official.places.length + official.parking.length };
  });

  // Ten sam obiekt w dwóch źródłach (np. toaleta w danych miasta i w OSM) łączymy w
  // jeden — dzięki temu widać, gdzie źródła się potwierdzają, a gdzie są sprzeczne.
  mergeDuplicates(byId);

  await load("owner_declarations", async () => {
    const file = await readJson<{ declarations: Declaration[] }>(path.join(dir, "owner-declarations.json"));
    for (const d of file.declarations) {
      let place = byId.get(d.placeId);
      if (!place && d.place) {
        place = { id: d.placeId, ...d.place, facts: [], ...(d.sample ? { sample: true } : {}) };
        byId.set(place.id, place);
      }
      if (!place) continue;
      const note = [d.declaredBy, d.notes].filter(Boolean).join(" — ");
      place.facts.push(
        ...toFacts(d.facts, "owner_declarations", d.declaredAt, { note, ...(d.sample ? { sample: true } : {}) }),
      );
    }
    return { records: file.declarations.length };
  });

  await load("owner_pending", async () => {
    const pending = await readPendingDeclarations();
    for (const d of pending) {
      const place = byId.get(d.placeId);
      if (!place) continue;
      // Zweryfikowana deklaracja staje się zwykłą deklaracją właściciela.
      const note = d.verifiedAt
        ? [`${d.organization} — zweryfikowano ${d.verifiedAt}`, d.notes].filter(Boolean).join(" — ")
        : [`${d.organization} — oczekuje na weryfikację`, d.notes].filter(Boolean).join(" — ");
      const sourceId = d.verifiedAt ? "owner_declarations" : "owner_pending";
      place.facts.push(...toFacts(d.facts, sourceId, d.verifiedAt ?? d.declaredAt, { note }));
    }
    return { records: pending.length };
  });

  await load("user_reports", async () => {
    // Przykładowe zgłoszenia są opcjonalne — nowe miasto startuje bez nich.
    const seed = await readJson<{ reports: Report[] }>(path.join(dir, "reports.seed.json")).catch(() => ({
      reports: [] as Report[],
    }));
    const reports = [...seed.reports, ...(await readStoredReports())];
    for (const r of reports) {
      const place = byId.get(r.placeId);
      if (!place) continue;
      place.facts.push(
        ...toFacts(r.facts, "user_reports", r.createdAt, {
          ...(r.comment ? { note: r.comment } : {}),
          ...(r.sample ? { sample: true } : {}),
        }),
      );
    }
    return { records: reports.length };
  });

  // Fakt pochodny: miejsce postojowe OzN w pobliżu (z inwentaryzacji ZTP).
  if (parking.length) {
    const cell = (lat: number, lon: number) => `${Math.floor(lat * 200)}:${Math.floor(lon * 130)}`;
    const grid = new Map<string, ParkingSpot[]>();
    for (const s of parking) {
      const k = cell(s.lat, s.lon);
      grid.set(k, [...(grid.get(k) ?? []), s]);
    }
    for (const place of new Set(byId.values())) {
      const cy = Math.floor(place.lat * 200);
      const cx = Math.floor(place.lon * 130);
      let best: { spot: ParkingSpot; d: number } | undefined;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          for (const spot of grid.get(`${cy + dy}:${cx + dx}`) ?? []) {
            const d = distanceM([place.lat, place.lon], [spot.lat, spot.lon]);
            if (d <= PARKING_RADIUS_M && (!best || d < best.d)) best = { spot, d };
          }
      if (best) {
        place.facts.push({
          key: "parking",
          value: true,
          sourceId: "krakow_open_data",
          observedAt: parkingDate,
          note: `ok. ${Math.round(best.d / 10) * 10} m${best.spot.address ? ` (${best.spot.address})` : ""}`,
        });
      }
    }
  }

  // byId zawiera też aliasy (identyfikatory OSM połączonych obiektów) — lista bez powtórzeń.
  const places = [...new Set(byId.values())];
  return { config, places, byId, stops, status };
}

const MERGE_RADIUS_M = 25;
const MERGE_CATEGORIES = new Set<Category>(["toilet"]);

/**
 * Łączy obiekty z danych miejskich z odpowiadającymi im obiektami OSM (ta sama
 * kategoria, do 25 m). Obiekt miejski przejmuje fakty z OSM; identyfikator OSM
 * nadal wskazuje na połączony obiekt, więc stare linki działają.
 */
export function mergeDuplicates(byId: Map<string, Place>): number {
  const all = [...byId.values()];
  const official = all.filter((p) => p.id.startsWith("krk-") && MERGE_CATEGORIES.has(p.category));
  const osm = all.filter((p) => p.id.startsWith("osm-") && MERGE_CATEGORIES.has(p.category));
  const used = new Set<string>();
  let merged = 0;
  for (const o of official) {
    const match = osm
      .filter((p) => !used.has(p.id) && p.category === o.category)
      .map((p) => ({ p, d: distanceM([o.lat, o.lon], [p.lat, p.lon]) }))
      .filter((x) => x.d <= MERGE_RADIUS_M)
      .sort((a, b) => a.d - b.d)[0];
    if (!match) continue;
    used.add(match.p.id);
    o.facts.push(...match.p.facts);
    o.mergedIds = [...(o.mergedIds ?? []), match.p.id];
    byId.set(match.p.id, o);
    merged++;
  }
  return merged;
}

/** Wyszukiwanie bez polskich znaków i wielkości liter. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/ł/g, "l");
}

export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const BROWSE_ORDER: Category[] = ["attraction", "culture", "accommodation", "food", "toilet", "office", "health", "transport", "shop"];

export interface SearchOptions {
  q?: string;
  category?: Category;
  near?: [number, number];
  limit?: number;
}

export function search(places: Place[], opts: SearchOptions): Place[] {
  const q = opts.q ? normalize(opts.q.trim()) : "";
  const near = opts.near;
  let result = places.filter(
    (p) =>
      (!opts.category || p.category === opts.category) &&
      (!q || normalize(p.name).includes(q) || (p.address && normalize(p.address).includes(q))),
  );
  result = result.sort((a, b) => {
    if (q) {
      // Trafienia od początku nazwy wyżej.
      const sa = normalize(a.name).startsWith(q) ? 0 : 1;
      const sb = normalize(b.name).startsWith(q) ? 0 : 1;
      if (sa !== sb) return sa - sb;
    }
    if (near) return distanceM(near, [a.lat, a.lon]) - distanceM(near, [b.lat, b.lon]);
    // Bez zapytania: najpierw to, po co ludzie przyjeżdżają (atrakcje, kultura), potem reszta.
    if (!q && !opts.category) {
      // Miejsca z informacjami o dostępności przed tymi, o których nic nie wiemy.
      const known = (p: Place) => (p.facts.some((f) => f.key !== "parking") ? 0 : 1);
      if (known(a) !== known(b)) return known(a) - known(b);
      const rank = (p: Place) => {
        const i = BROWSE_ORDER.indexOf(p.category);
        return i === -1 ? BROWSE_ORDER.length : i;
      };
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
    }
    return b.facts.length - a.facts.length;
  });
  if (!q && !opts.category && !near) {
    // Lista startowa: jedna pozycja na nazwę (OSM często ma kilka obiektów o tej samej nazwie).
    const seen = new Set<string>();
    result = result.filter((p) => (seen.has(p.name) ? false : (seen.add(p.name), true)));
  }
  return result.slice(0, opts.limit ?? 50);
}

/** Najbliższe przystanki (w linii prostej) — początek dojścia do miejsca. */
export function nearbyStops(stops: TransitStop[], place: Place, limit = 4, radiusM = 600): NearbyStop[] {
  const here: [number, number] = [place.lat, place.lon];
  return stops
    .filter((s) => Math.abs(s.lat - place.lat) < 0.01 && Math.abs(s.lon - place.lon) < 0.015)
    .map((s) => ({ ...s, distanceM: Math.round(distanceM(here, [s.lat, s.lon])) }))
    .filter((s) => s.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, limit);
}

/** Miasta z katalogu data/ — każde to osobny plik city.json. */
export async function listCities(): Promise<Pick<CityConfig, "id" | "name" | "center">[]> {
  const { readdir } = await import("node:fs/promises");
  const dirs = await readdir(DATA_DIR, { withFileTypes: true });
  const out: Pick<CityConfig, "id" | "name" | "center">[] = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    try {
      const c = await readJson<CityConfig>(path.join(DATA_DIR, d.name, "city.json"));
      out.push({ id: c.id, name: c.name, center: c.center });
    } catch {
      // katalog bez city.json (np. cache)
    }
  }
  return out;
}
