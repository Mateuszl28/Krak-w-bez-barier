import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { Category, Fact, NearbyStop, Place, Source, SourceStatus } from "./shared";

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
  return getJson<PlacesResponse>(`/api/v1/places?${params}`);
}

export function getPlace(id: string, awaria?: string) {
  return getJson<PlaceResponse>(`/api/v1/places/${encodeURIComponent(id)}${awaria ? `?awaria=${awaria}` : ""}`);
}

export type LiveResult =
  | { ok: true; lastEdit?: string; changed: boolean; facts: Fact[]; snapshotAt?: string }
  | { ok: false; error: string; snapshotAt?: string };

export async function liveCheck(id: string, awaria?: string): Promise<LiveResult> {
  try {
    const res = await fetch(`${API_URL}/api/places/${id}/live${awaria ? `?awaria=${awaria}` : ""}`);
    return (await res.json()) as LiveResult;
  } catch {
    return { ok: false, error: "brak połączenia" };
  }
}

export async function sendReport(placeId: string, facts: Record<string, unknown>, comment: string) {
  const res = await fetch(`${API_URL}/api/reports`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ placeId, facts, comment }),
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(body.error ?? "Nie udało się wysłać zgłoszenia.");
}
