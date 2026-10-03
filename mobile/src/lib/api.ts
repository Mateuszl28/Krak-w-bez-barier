import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { Category, Fact, Locale, NearbyStop, Place, Profile, RequirementResult, Source, SourceStatus, Verdict } from "./shared";

// Backend (Next.js) z importem danych i API. W trybie deweloperskim bierzemy
// adres komputera, z którego Expo serwuje aplikację; w produkcji — EXPO_PUBLIC_API_URL.
const devHost = Constants.expoConfig?.hostUri?.split(":")[0];
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? (devHost ? `http://${devHost}:3100` : "http://localhost:3100");

export interface PlacesResponse {
  status: SourceStatus[];
  sources: Record<string, Source>;
  places: Place[];
}

export interface PlaceResponse {
  status: SourceStatus[];
  sources: Record<string, Source>;
  place: Place;
  stops?: NearbyStop[];
}

/** Wynik z informacją, czy pochodzi z kopii zapisanej na telefonie. */
export type Loaded<T> = { data: T; cachedAt?: string };

async function getJson<T>(path: string): Promise<Loaded<T>> {
  const key = `kbb-cache:${path}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(`${API_URL}${path}`, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as T;
    AsyncStorage.setItem(key, JSON.stringify({ at: new Date().toISOString(), data })).catch(() => {});
    return { data };
  } catch (err) {
    // Brak połączenia: pokazujemy ostatnią kopię z datą, jeśli istnieje.
    const raw = await AsyncStorage.getItem(key).catch(() => null);
    if (raw) {
      const { at, data } = JSON.parse(raw) as { at: string; data: T };
      return { data, cachedAt: at };
    }
    throw err;
  }
}

export interface SearchParams {
  q?: string;
  category?: Category;
  near?: [number, number];
  awaria?: string;
  city?: string;
}

export function searchPlaces(p: SearchParams) {
  const params = new URLSearchParams({ limit: "60" });
  if (p.q) params.set("q", p.q);
  if (p.category) params.set("category", p.category);
  if (p.near) {
    params.set("lat", String(p.near[0]));
    params.set("lon", String(p.near[1]));
  }
  if (p.awaria) params.set("awaria", p.awaria);
  if (p.city) params.set("city", p.city);
  return getJson<PlacesResponse>(`/api/v1/places?${params}`);
}

function query(awaria?: string, city?: string) {
  const p = new URLSearchParams();
  if (awaria) p.set("awaria", awaria);
  if (city) p.set("city", city);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function getPlace(id: string, awaria?: string, city?: string) {
  return getJson<PlaceResponse>(`/api/v1/places/${encodeURIComponent(id)}${query(awaria, city)}`);
}

export interface City {
  id: string;
  name: string;
}

export async function listCities(): Promise<City[]> {
  return (await getJson<{ cities: City[] }>("/api/v1/cities")).data.cities;
}

export type LiveResult =
  | { ok: true; lastEdit?: string; changed: boolean; facts: Fact[]; snapshotAt?: string }
  | { ok: false; error: string; snapshotAt?: string };

export async function liveCheck(id: string, awaria?: string, city?: string): Promise<LiveResult> {
  try {
    const res = await fetch(`${API_URL}/api/places/${id}/live${query(awaria, city)}`);
    return (await res.json()) as LiveResult;
  } catch {
    return { ok: false, error: "brak połączenia" };
  }
}

export async function sendReport(placeId: string, facts: Record<string, unknown>, comment: string, city?: string) {
  const res = await fetch(`${API_URL}/api/reports`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ placeId, facts, comment, city }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Nie udało się wysłać zgłoszenia.");
}

export interface RouteResult {
  route: {
    verdict: Verdict;
    distanceM: number;
    requirements: RequirementResult[];
    surfaces: Record<string, number>;
    steps: { flights: number; count?: number };
    kerbs: { raised: number; lowered: number; flush: number };
    maxIncline?: number;
    coverage: number;
    segments: { kind: "ok" | "warn" | "barrier" | "unknown"; coords: [number, number][] }[];
    dataDate: string;
  };
  alternatives: number;
  insideDataArea: boolean;
  sources: { routing: string; paths: string };
}

/** Trasa dojścia oceniona pod profil (warianty z kilku serwisów routingu). */
export async function getRoute(
  from: [number, number],
  to: [number, number],
  profile: Profile,
  opts: { city?: string; locale?: Locale; awaria?: string },
): Promise<RouteResult> {
  const p = new URLSearchParams({
    from: `${from[0]},${from[1]}`,
    to: `${to[0]},${to[1]}`,
    maxStep: String(profile.maxStepCm),
    minDoor: String(profile.minDoorCm),
    avoidCobbles: profile.avoidCobbles ? "1" : "0",
    toilet: profile.needToilet ? "1" : "0",
    changingTable: profile.needChangingTable ? "1" : "0",
  });
  if (opts.city) p.set("city", opts.city);
  if (opts.locale) p.set("lang", opts.locale);
  if (opts.awaria) p.set("awaria", opts.awaria);
  const res = await fetch(`${API_URL}/api/v1/route?${p}`);
  const body = (await res.json()) as RouteResult & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}

export interface AssistantReply {
  reply: string;
  route?: { from: [number, number]; to: [number, number]; fromName: string; toName: string };
  profile?: Profile;
  places: { id: string; name: string }[];
}

/** Asystent AI (Gemini po stronie serwera). Treść pytania trafia do Google; serwer jej nie zapisuje. */
export async function askAssistant(input: {
  message: string;
  history: { role: "user" | "model"; text: string }[];
  profile: Profile;
  city: string;
  locale: Locale;
  location?: [number, number];
}): Promise<AssistantReply> {
  const res = await fetch(`${API_URL}/api/v1/assistant`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...input, lang: input.locale }),
  });
  const body = (await res.json().catch(() => ({}))) as AssistantReply & { error?: string };
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body;
}
