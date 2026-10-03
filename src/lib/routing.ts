// Wyznaczanie i ocena tras dojścia (serwer). Używane przez /api/v1/route i asystenta AI.
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Locale } from "./i18n.ts";
import type { Profile } from "./model.ts";
import type { PathsFile } from "./paths.ts";
import { PathIndex, assessRoute, decodePolyline6, routeScore, type RouteAssessment } from "./route.ts";

// OSRM (profil pieszy) i Valhalla (tryb wózka, omija schody) — publiczne instancje FOSSGIS.
const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
const VALHALLA = "https://valhalla1.openstreetmap.de/route";
const UA = { "user-agent": "dostepnik/0.1 (hackathon prototype)" };

type LatLon = [number, number];

const indexes = new Map<string, Promise<PathIndex | null>>();
export function pathIndex(city: string): Promise<PathIndex | null> {
  if (!indexes.has(city)) {
    indexes.set(
      city,
      readFile(path.join(process.cwd(), "data", city, "paths.json"), "utf8")
        .then((raw) => new PathIndex(JSON.parse(raw) as PathsFile))
        .catch(() => null),
    );
  }
  return indexes.get(city)!;
}

async function osrmRoutes(from: LatLon, to: LatLon): Promise<LatLon[][]> {
  const url = `${OSRM}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&alternatives=3`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const json = (await res.json()) as { routes?: { geometry: { coordinates: [number, number][] } }[] };
  return (json.routes ?? []).map((r) => r.geometry.coordinates.map(([lon, lat]) => [lat, lon] as LatLon));
}

async function valhallaWheelchair(from: LatLon, to: LatLon): Promise<LatLon[][]> {
  const res = await fetch(VALHALLA, {
    method: "POST",
    headers: { ...UA, "content-type": "application/json" },
    body: JSON.stringify({
      locations: [
        { lat: from[0], lon: from[1] },
        { lat: to[0], lon: to[1] },
      ],
      costing: "pedestrian",
      costing_options: { pedestrian: { type: "wheelchair" } },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Valhalla HTTP ${res.status}`);
  const json = (await res.json()) as { trip?: { legs: { shape: string }[] } };
  return json.trip ? [json.trip.legs.flatMap((l) => decodePolyline6(l.shape))] : [];
}

export type RoutePlan =
  | {
      ok: true;
      route: RouteAssessment;
      alternatives: number;
      insideDataArea: boolean;
      sources: { routing: string; paths: string };
    }
  | { ok: false; status: number; error: string; detail?: string };

export async function planRoute(
  from: LatLon,
  to: LatLon,
  profile: Profile,
  opts: { city: string; locale: Locale; simulateOutage?: boolean },
): Promise<RoutePlan> {
  const index = await pathIndex(opts.city);
  if (!index) return { ok: false, status: 404, error: "Brak danych o chodnikach dla tego miasta." };

  // Oba serwisy równolegle; wystarczy, że odpowie jeden.
  const results = opts.simulateOutage
    ? []
    : await Promise.allSettled([osrmRoutes(from, to), valhallaWheelchair(from, to)]);
  const lines = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (lines.length === 0) {
    return {
      ok: false,
      status: 503,
      error: "Usługa wyznaczania tras jest teraz niedostępna. Ocena miejsca i przystanków działa nadal.",
      detail: opts.simulateOutage
        ? "symulacja awarii"
        : results.map((r) => (r.status === "rejected" ? String(r.reason) : "")).join("; "),
    };
  }
  const assessed = lines.map((line) => assessRoute(line, index, profile, opts.locale));
  const best = assessed.reduce((a, b) => (routeScore(b) < routeScore(a) ? b : a));
  return {
    ok: true,
    route: best,
    alternatives: assessed.length,
    insideDataArea: index.covers(from) && index.covers(to),
    sources: {
      routing:
        "OSRM (routing.openstreetmap.de, profil pieszy) i Valhalla (valhalla1.openstreetmap.de, tryb wózka) — © współtwórcy OpenStreetMap",
      paths: `OpenStreetMap — chodniki, schody, nawierzchnie, krawężniki; import ${best.dataDate.slice(0, 10)}`,
    },
  };
}
