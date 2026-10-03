import { NextResponse } from "next/server";
import { osmToPlace, type OsmElement } from "@/lib/osm";
import { loadCity } from "@/lib/repository";
import { cityFrom } from "@/lib/request";

// Sprawdza aktualny stan obiektu bezpośrednio w OSM API (bez czekania na import).
const TYPES: Record<string, OsmElement["type"]> = { n: "node", w: "way", r: "relation" };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const city = await loadCity(cityFrom(new URL(req.url).searchParams)).catch(() => null);
  if (!city) return NextResponse.json({ error: "Nieznane miasto" }, { status: 404 });
  const stored = city.byId.get(id);
  const osm = city.status.find((s) => s.sourceId === "osm");
  const m = id.match(/^osm-([nwr])(\d+)$/);
  if (!stored || !m) return NextResponse.json({ error: "To miejsce nie pochodzi z OSM." }, { status: 404 });

  const simulateOutage = new URL(req.url).searchParams.get("awaria")?.includes("osm");
  try {
    if (simulateOutage) throw new Error("symulacja awarii");
    const type = TYPES[m[1]];
    const res = await fetch(`https://api.openstreetmap.org/api/0.6/${type}/${m[2]}.json`, {
      headers: { "user-agent": "krakow-bez-barier/0.1 (hackathon prototype)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const el = ((await res.json()) as { elements: OsmElement[] }).elements[0];
    const fresh = osmToPlace({ ...el, center: { lat: stored.lat, lon: stored.lon } });
    const key = (f: { key: string; value: unknown }) => `${f.key}=${f.value}`;
    const before = new Set(stored.facts.filter((f) => f.sourceId === "osm").map(key));
    const after = new Set((fresh?.facts ?? []).map(key));
    const changed = before.size !== after.size || [...after].some((k) => !before.has(k));
    return NextResponse.json({
      ok: true,
      lastEdit: el.timestamp,
      changed,
      facts: fresh?.facts ?? [],
      snapshotAt: osm?.fetchedAt,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message, snapshotAt: osm?.fetchedAt });
  }
}
