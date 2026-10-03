// Pobiera dane o miejscach z OpenStreetMap (Overpass API) dla wskazanego miasta
// i zapisuje je w ujednoliconym formacie w data/<miasto>/osm.json.
//
//   npm run ingest            # Kraków
//   npm run ingest -- warszawa
//
// Gdy żaden serwer Overpass nie odpowiada, poprzedni plik zostaje bez zmian —
// aplikacja dalej działa na ostatniej udanej kopii i pokazuje jej datę.

import { readFile, writeFile } from "node:fs/promises";
import { osmToPlace, type OsmElement } from "../src/lib/osm.ts";

const city = process.argv[2] ?? "krakow";
const cityDir = new URL(`../data/${city}/`, import.meta.url);
const config = JSON.parse(await readFile(new URL("city.json", cityDir), "utf8"));

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const [s, w, n, e] = config.bbox as [number, number, number, number];
const bbox = `${s},${w},${n},${e}`;
// Miejsca, które ludzie odwiedzają, także bez tagu wheelchair — żeby aplikacja
// pokazywała "brak danych" zamiast udawać, że miejsca nie istnieją.
const query = `[out:json][timeout:180];
(
  nwr["wheelchair"]["name"](${bbox});
  nwr["amenity"="toilets"](${bbox});
  nwr["tourism"~"^(museum|gallery|attraction|hotel|hostel)$"]["name"](${bbox});
  nwr["amenity"~"^(theatre|cinema|arts_centre|library|townhall|restaurant|cafe)$"]["name"](${bbox});
);
out center tags meta;`;

async function fetchFrom(url: string): Promise<OsmElement[]> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent": "dostepnik/0.1 (hackathon prototype)",
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(200_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { elements: OsmElement[] };
  return json.elements;
}

let elements: OsmElement[] | undefined;
let usedMirror = "";
for (const url of MIRRORS) {
  try {
    console.log(`Overpass: ${url}`);
    elements = await fetchFrom(url);
    usedMirror = url;
    break;
  } catch (err) {
    console.warn(`  niedostępny (${(err as Error).message})`);
  }
}
if (!elements) {
  console.error("Żaden serwer Overpass nie odpowiedział. Zostawiam poprzednie dane.");
  process.exit(1);
}

const places = elements.map(osmToPlace).filter((p) => p !== undefined);
const out = {
  sourceId: "osm",
  city,
  fetchedAt: new Date().toISOString(),
  endpoint: usedMirror,
  license: "ODbL 1.0 — © OpenStreetMap contributors",
  places,
};
await writeFile(new URL("osm.json", cityDir), JSON.stringify(out));
const withFacts = places.filter((p) => p.facts.length > 0).length;
console.log(`Zapisano ${places.length} miejsc (${withFacts} z informacjami o dostępności).`);
