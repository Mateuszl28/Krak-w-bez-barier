import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { PRESETS } from "@/lib/labels";
import type { PathsFile } from "@/lib/paths";
import { cityFrom, profileFrom } from "@/lib/request";
import { PathIndex, assessRoute, decodePolyline6, routeScore } from "@/lib/route";

// Trasa dojścia: warianty z routingu pieszego OSRM (FOSSGIS, dane OSM), każdy
// oceniony na danych o chodnikach; zwracamy wariant z najmniejszą liczbą barier.
const ROUTER = "https://routing.openstreetmap.de/routed-foot/route/v1/driving";
// Valhalla (FOSSGIS) z trybem "wheelchair" — omija schody i wysokie krawężniki.
const VALHALLA = "https://valhalla1.openstreetmap.de/route";
const UA = { "user-agent": "krakow-bez-barier/0.1 (hackathon prototype)" };

type Line = [number, number][];

async function osrmRoutes(from: [number, number], to: [number, number]): Promise<Line[]> {
  const url = `${ROUTER}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&alternatives=3`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const json = (await res.json()) as { routes?: { geometry: { coordinates: [number, number][] } }[] };
  return (json.routes ?? []).map((r) => r.geometry.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]));
}

async function valhallaWheelchair(from: [number, number], to: [number, number]): Promise<Line[]> {
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

const indexes = new Map<string, Promise<PathIndex | null>>();
function pathIndex(city: string) {
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

function point(raw: string | null): [number, number] | null {
  const m = raw?.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const from = point(params.get("from"));
  const to = point(params.get("to"));
  if (!from || !to) return NextResponse.json({ error: "Podaj from=lat,lon i to=lat,lon." }, { status: 400 });
  const profile = profileFrom(params) ?? PRESETS.wheelchair_manual;
  const locale = params.get("lang") === "en" ? "en" : "pl";
  const city = cityFrom(params);

  const index = await pathIndex(city);
  if (!index) {
    return NextResponse.json({ error: "Brak danych o chodnikach dla tego miasta." }, { status: 404 });
  }

  // Oba serwisy równolegle; wystarczy, że odpowie jeden.
  const simulated = params.get("awaria")?.includes("routing");
  const results = simulated
    ? []
    : await Promise.allSettled([osrmRoutes(from, to), valhallaWheelchair(from, to)]);
  const lines = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (lines.length === 0) {
    return NextResponse.json(
      {
        error: "Usługa wyznaczania tras jest teraz niedostępna. Ocena miejsca i przystanków działa nadal.",
        detail: simulated ? "symulacja awarii" : results.map((r) => (r.status === "rejected" ? String(r.reason) : "")).join("; "),
      },
      { status: 503 },
    );
  }

  const assessed = lines.map((line) => assessRoute(line, index, profile, locale));
  const best = assessed.reduce((a, b) => (routeScore(b) < routeScore(a) ? b : a));
  return NextResponse.json({
    route: best,
    alternatives: assessed.length,
    insideDataArea: index.covers(from) && index.covers(to),
    sources: {
      routing:
        "OSRM (routing.openstreetmap.de, profil pieszy) i Valhalla (valhalla1.openstreetmap.de, tryb wózka) — © współtwórcy OpenStreetMap",
      paths: `OpenStreetMap — chodniki, schody, nawierzchnie, krawężniki; import ${best.dataDate.slice(0, 10)}`,
    },
  });
}
