// Pobiera sieć pieszą (chodniki, schody, nawierzchnie, krawężniki) z OSM dla
// obszaru tras z data/<miasto>/city.json (pole pathsBbox) → data/<miasto>/paths.json.
//
//   npm run ingest:paths [-- miasto]

import { readFile, writeFile } from "node:fs/promises";
import { overpass } from "../src/lib/overpass.ts";
import { normalizeKerb, normalizeSurface, parseIncline, type PathsFile, type PathWay } from "../src/lib/paths.ts";

const city = process.argv[2] ?? "krakow";
const dir = new URL(`../data/${city}/`, import.meta.url);
const config = JSON.parse(await readFile(new URL("city.json", dir), "utf8"));
const [s, w, n, e] = (config.pathsBbox ?? config.bbox) as [number, number, number, number];
const bbox = `${s},${w},${n},${e}`;

const query = `[out:json][timeout:180];
(
  way["highway"~"^(footway|pedestrian|path|steps|living_street|residential|service|unclassified|tertiary|secondary|primary|cycleway|track)$"](${bbox});
);
out tags geom;
node["kerb"](${bbox});
out;`;

type El = {
  type: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
};

try {
  const { data, endpoint } = await overpass<{ elements: El[] }>(query);
  const r5 = (x: number) => Math.round(x * 1e5) / 1e5;
  const ways: PathWay[] = [];
  const kerbs: PathsFile["kerbs"] = [];
  for (const el of data.elements) {
    const t = el.tags ?? {};
    if (el.type === "way" && el.geometry) {
      const way: PathWay = { h: t.highway, g: el.geometry.map((p) => [r5(p.lat), r5(p.lon)]) };
      const surface = normalizeSurface(t["footway:surface"] ?? t["sidewalk:surface"] ?? t.surface);
      if (surface) way.s = surface;
      const incline = parseIncline(t.incline);
      if (incline !== undefined) way.i = incline;
      if (t.step_count && /^\d+$/.test(t.step_count)) way.sc = Number(t.step_count);
      ways.push(way);
    } else if (el.type === "node" && el.lat !== undefined && el.lon !== undefined) {
      const k = normalizeKerb(t.kerb);
      if (k) kerbs.push({ k, lat: r5(el.lat), lon: r5(el.lon) });
    }
  }
  const out: PathsFile = { fetchedAt: new Date().toISOString(), bbox: [s, w, n, e], ways, kerbs };
  await writeFile(new URL("paths.json", dir), JSON.stringify(out));
  const withSurface = ways.filter((x) => x.s).length;
  console.log(`Zapisano ${ways.length} odcinków (${withSurface} z nawierzchnią), ${kerbs.length} krawężników. Źródło: ${endpoint}`);
} catch (err) {
  console.error(`Overpass niedostępny (${(err as Error).message}). Zostawiam poprzednie dane.`);
  process.exit(1);
}
