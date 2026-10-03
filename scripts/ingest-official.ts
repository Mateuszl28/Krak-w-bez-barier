// Pobiera otwarte dane Krakowa (toalety publiczne, miejsca postojowe OzN, przystanki)
// i zapisuje je w data/krakow/official.json. Przy błędzie zostawia poprzedni plik.
//
//   npm run ingest:official

import { writeFile } from "node:fs/promises";
import type { Place } from "../src/lib/model.ts";
import {
  CULTURE_LAYERS,
  DISABLED_SPORTS_URL,
  PARKING_URL,
  STOPS_URL,
  cultureToPlace,
  disabledSportsToPlaces,
  TOILETS_URL,
  fetchArcgis,
  fetchArcgisJson,
  parkingToSpot,
  stopToTransit,
  toiletToPlace,
} from "../src/lib/krakow-official.ts";

try {
  const toilets = (await fetchArcgis<never>(TOILETS_URL)).map(toiletToPlace).filter((p) => p !== undefined);
  const parking = (await fetchArcgis<never>(PARKING_URL)).map(parkingToSpot).filter((p) => p !== undefined);
  const stops = (await fetchArcgis<never>(STOPS_URL)).map(stopToTransit).filter((s) => s !== undefined);
  // MSIP — osobno: jego awaria nie blokuje danych ZTP.
  const today = new Date().toISOString().slice(0, 10);
  const msip: Place[] = [];
  try {
    for (const [i, url] of CULTURE_LAYERS.entries()) {
      for (const f of await fetchArcgis<never>(url)) {
        const p = cultureToPlace(f, i, today);
        if (p) msip.push(p);
      }
    }
    msip.push(...disabledSportsToPlaces(await fetchArcgisJson<never>(DISABLED_SPORTS_URL), today));
  } catch (err) {
    console.warn(`MSIP niedostępny (${(err as Error).message}) — pomijam.`);
  }
  const out = {
    sourceId: "krakow_open_data",
    fetchedAt: new Date().toISOString(),
    datasets: [TOILETS_URL, PARKING_URL, STOPS_URL, ...CULTURE_LAYERS, DISABLED_SPORTS_URL],
    license: "Dane publiczne Gminy Miejskiej Kraków / ZTP — wykorzystanie z podaniem źródła",
    places: [...toilets, ...msip],
    parking,
    stops,
  };
  await writeFile(new URL("../data/krakow/official.json", import.meta.url), JSON.stringify(out));
  console.log(`Zapisano ${toilets.length} toalet, ${msip.length} obiektów z MSIP, ${parking.length} miejsc postojowych OzN, ${stops.length} przystanków.`);
} catch (err) {
  console.error(`Źródło niedostępne (${(err as Error).message}). Zostawiam poprzednie dane.`);
  process.exit(1);
}
