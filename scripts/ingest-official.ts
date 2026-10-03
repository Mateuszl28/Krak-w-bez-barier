// Pobiera otwarte dane Krakowa (toalety publiczne, miejsca postojowe OzN, przystanki)
// i zapisuje je w data/krakow/official.json. Przy błędzie zostawia poprzedni plik.
//
//   npm run ingest:official

import { writeFile } from "node:fs/promises";
import {
  PARKING_URL,
  STOPS_URL,
  TOILETS_URL,
  fetchArcgis,
  parkingToSpot,
  stopToTransit,
  toiletToPlace,
} from "../src/lib/krakow-official.ts";

try {
  const toilets = (await fetchArcgis<never>(TOILETS_URL)).map(toiletToPlace).filter((p) => p !== undefined);
  const parking = (await fetchArcgis<never>(PARKING_URL)).map(parkingToSpot).filter((p) => p !== undefined);
  const stops = (await fetchArcgis<never>(STOPS_URL)).map(stopToTransit).filter((s) => s !== undefined);
  const out = {
    sourceId: "krakow_open_data",
    fetchedAt: new Date().toISOString(),
    datasets: [TOILETS_URL, PARKING_URL, STOPS_URL],
    license: "Dane publiczne Gminy Miejskiej Kraków / ZTP — wykorzystanie z podaniem źródła",
    places: toilets,
    parking,
    stops,
  };
  await writeFile(new URL("../data/krakow/official.json", import.meta.url), JSON.stringify(out));
  console.log(`Zapisano ${toilets.length} toalet, ${parking.length} miejsc postojowych OzN, ${stops.length} przystanków.`);
} catch (err) {
  console.error(`Źródło niedostępne (${(err as Error).message}). Zostawiam poprzednie dane.`);
  process.exit(1);
}
