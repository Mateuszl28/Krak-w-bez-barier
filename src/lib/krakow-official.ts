// Adapter otwartych danych Krakowa (warstwy ZTP / GMK publikowane w ArcGIS Online).
// Inne miasto = własny adapter zwracający te same typy (Place / ParkingSpot).

import type { Fact, Place, TransitStop } from "./model.ts";

export const OFFICIAL_SOURCE_ID = "krakow_open_data";

const ARCGIS = "https://services-eu1.arcgis.com/svTzSt3AvH7sK6q9/arcgis/rest/services";
export const TOILETS_URL = `${ARCGIS}/Toalety_publiczne_4/FeatureServer/0/query`;
export const PARKING_URL = `${ARCGIS}/Miejsca_postojowe_OZN/FeatureServer/0/query`;
export const STOPS_URL = `${ARCGIS}/Przystanki_Komunikacji_Miejskiej_w_Krakowie/FeatureServer/0/query`;

export interface Feature<P> {
  geometry: { type: "Point"; coordinates: [number, number] } | null;
  properties: P;
}

interface ToiletProps {
  FID: number;
  miejsce: string;
  dzielnica?: string;
  rodz_ob?: string;
  godziny?: string;
  nplnsprw?: string;
  rodz_npl?: string;
  status?: string;
  przewijak?: string;
  uwagi?: string;
  EditDate?: number;
}

interface ParkingProps {
  ID_MIEJSCA: string;
  punkt_adresowy?: string;
}

export interface ParkingSpot {
  id: string;
  lat: number;
  lon: number;
  address?: string;
}

const yes = (s?: string) => s?.trim().toLowerCase().startsWith("tak");

export function toiletToPlace(f: Feature<ToiletProps>): Place | undefined {
  if (!f.geometry) return undefined;
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const observedAt = p.EditDate ? new Date(p.EditDate).toISOString().slice(0, 10) : "2023-11-08";
  const ref = `${TOILETS_URL.replace("/query", "")}/${p.FID}`;
  const facts: Fact[] = [];
  const add = (key: Fact["key"], value: Fact["value"], note?: string) =>
    facts.push({ key, value, sourceId: OFFICIAL_SOURCE_ID, observedAt, ref, ...(note ? { note } : {}) });

  const access = p.nplnsprw?.trim();
  if (access) {
    const separate = access.toLowerCase().includes("damsk") ? "kabina po stronie damskiej" : undefined;
    add("toilet", yes(access) === true, separate);
  }
  const how = p.rodz_npl?.trim().toLowerCase();
  if (how === "wjazd z poziomu 0") add("entrance", "level");
  else if (how === "pochylnia") add("entrance", "ramp");
  else if (how === "platforma") add("entrance", "lift", "wjazd przez platformę");
  else if (how === "winda") add("entrance", "lift", "wjazd przez windę");
  else if (how === "schodołaz") add("entrance", "steps", "schodołaz — wymaga obsługi");
  if (p.przewijak) add("changing_table", yes(p.przewijak) === true);

  const closed = p.status?.trim().toLowerCase() !== "czynne";
  const extra = [p.rodz_ob, p.godziny && `godziny: ${p.godziny}`, p.uwagi?.trim()].filter(Boolean).join(" · ");
  return {
    id: `krk-wc-${p.FID}`,
    name: `Toaleta publiczna — ${p.miejsce.trim()}${closed ? " (nieczynna)" : ""}`,
    category: "toilet",
    lat,
    lon,
    address: [p.miejsce.trim(), extra].filter(Boolean).join(" · "),
    facts,
  };
}

export function parkingToSpot(f: Feature<ParkingProps>): ParkingSpot | undefined {
  if (!f.geometry) return undefined;
  const [lon, lat] = f.geometry.coordinates;
  return { id: f.properties.ID_MIEJSCA, lat, lon, address: f.properties.punkt_adresowy };
}

/** Pobiera całą warstwę ArcGIS jako GeoJSON, stronicując po 1000 rekordów. */
export async function fetchArcgis<P>(url: string): Promise<Feature<P>[]> {
  const all: Feature<P>[] = [];
  for (let offset = 0; ; offset += 1000) {
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "*",
      outSR: "4326",
      f: "geojson",
      resultOffset: String(offset),
      resultRecordCount: "1000",
    });
    const res = await fetch(`${url}?${params}`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const page = (await res.json()) as { features: Feature<P>[] };
    all.push(...page.features);
    if (page.features.length < 1000) return all;
  }
}

interface StopProps {
  OBJECTID: number;
  kod_busman?: string;
  Nazwa_przystanku_nr?: string;
  Typ_przystanku?: string;
  Nawierzchnia_peronu?: string | null;
  "Krawężnik_peronowy"?: string | null;
  Wiata_liczba?: number | null;
  "Ławki_poza_wiatą"?: number | null;
  "Ławki_inne_poza_wiatą"?: number | null;
  Inne_do_siedzenia?: number | null;
  EditDate?: number;
}

const STOP_SURFACE: Record<string, string> = {
  asfalt: "smooth",
  beton: "smooth",
  "płyty_chodnikowe": "smooth",
  kostka: "paving",
  utwardzone_inne: "paving",
  nieutwardzne_inne: "gravel",
};

/** Inwentaryzacja przystanków ZTP → przystanek z informacją o wsiadaniu i odpoczynku. */
export function stopToTransit(f: Feature<StopProps>): TransitStop | undefined {
  if (!f.geometry) return undefined;
  const p = f.properties;
  const [lon, lat] = f.geometry.coordinates;
  const type = p.Typ_przystanku ?? "";
  const kerbRaw = p["Krawężnik_peronowy"];
  const kerb = kerbRaw === "kassel-kerb" ? "kassel" : kerbRaw === "tak" ? "standard" : kerbRaw === "nie" ? "none" : undefined;
  const surface = p.Nawierzchnia_peronu ? STOP_SURFACE[p.Nawierzchnia_peronu] : undefined;
  return {
    id: p.kod_busman ?? String(p.OBJECTID),
    name: (p.Nazwa_przystanku_nr ?? "Przystanek").trim(),
    mode: type.includes("T") && type.includes("A") ? "bus_tram" : type.includes("T") ? "tram" : "bus",
    lat,
    lon,
    ...(kerb ? { kerb } : {}),
    ...(surface ? { surface } : {}),
    shelters: p.Wiata_liczba ?? 0,
    benches: (p["Ławki_poza_wiatą"] ?? 0) + (p["Ławki_inne_poza_wiatą"] ?? 0) + (p.Inne_do_siedzenia ?? 0),
    sourceId: OFFICIAL_SOURCE_ID,
    observedAt: p.EditDate ? new Date(p.EditDate).toISOString().slice(0, 10) : "",
  };
}
