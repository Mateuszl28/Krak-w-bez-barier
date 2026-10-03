// Adapter OpenStreetMap: tłumaczy tagi OSM na fakty wspólnego modelu.
// Opis tagów: https://wiki.openstreetmap.org/wiki/Key:wheelchair

import type { Category, Fact, Place } from "./model.ts";

export const OSM_SOURCE_ID = "osm";

export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  timestamp?: string;
  tags?: Record<string, string>;
}

/** "0.9", "90 cm", "0,85 m" → centymetry. */
export function parseLengthCm(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const m = raw.trim().replace(",", ".").match(/^(\d+(?:\.\d+)?)\s*(cm|m)?$/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  const unit = m[2]?.toLowerCase();
  // Bez jednostki OSM zakłada metry; wartości > 10 to w praktyce centymetry.
  const cm = unit === "cm" || (!unit && n > 10) ? n : n * 100;
  return Math.round(cm);
}

function yesNo(raw: string | undefined): boolean | undefined {
  if (raw === "yes" || raw === "designated") return true;
  if (raw === "no") return false;
  return undefined;
}

export function categoryOf(t: Record<string, string>): Category {
  const a = t.amenity;
  if (a === "toilets") return "toilet";
  if (["restaurant", "cafe", "fast_food", "bar", "pub", "ice_cream", "food_court"].includes(a)) return "food";
  if (["theatre", "cinema", "arts_centre", "library", "community_centre"].includes(a)) return "culture";
  if (["townhall", "post_office", "police", "courthouse"].includes(a) || t.office === "government") return "office";
  if (["pharmacy", "hospital", "clinic", "doctors", "dentist"].includes(a)) return "health";
  if (["museum", "gallery"].includes(t.tourism)) return "culture";
  if (["hotel", "hostel", "guest_house", "apartment", "motel"].includes(t.tourism)) return "accommodation";
  // Pomniki, rzeźby i kapliczki to nie cele wizyty — nie mieszamy ich z atrakcjami.
  const minorHistoric = ["memorial", "monument", "wayside_shrine", "wayside_cross", "boundary_stone", "milestone", "tomb"];
  if (t.tourism === "artwork" || minorHistoric.includes(t.historic)) return "other";
  if (["attraction", "viewpoint", "zoo", "theme_park"].includes(t.tourism) || t.historic) return "attraction";
  if (t.public_transport === "station" || t.railway === "station" || a === "bus_station") return "transport";
  if (t.shop) return "shop";
  return "other";
}

export function osmToPlace(el: OsmElement): Place | undefined {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  // Toalety publiczne w OSM zwykle nie mają nazwy.
  const name = t.name ?? (t.amenity === "toilets" ? "Toaleta publiczna" : undefined);
  if (!name || lat === undefined || lon === undefined) return undefined;

  const observedAt = (
    t["check_date:wheelchair"] ??
    t.check_date ??
    t["survey:date"] ??
    el.timestamp ??
    ""
  ).slice(0, 10);
  const ref = `https://www.openstreetmap.org/${el.type}/${el.id}`;
  const facts: Fact[] = [];
  const add = (key: Fact["key"], value: Fact["value"] | undefined, note?: string) => {
    if (value === undefined) return;
    facts.push({ key, value, sourceId: OSM_SOURCE_ID, observedAt, ref, ...(note ? { note } : {}) });
  };

  const wheelchair = t.wheelchair;
  if (wheelchair === "yes" || wheelchair === "limited" || wheelchair === "no") {
    add("general", wheelchair, t["wheelchair:description:pl"] ?? t["wheelchair:description"]);
  } else if (wheelchair === "designated") {
    add("general", "yes", t["wheelchair:description"]);
  }

  const steps = t["entrance:step_count"] ?? t.step_count;
  if (steps !== undefined && /^\d+$/.test(steps)) add("step_count", Number(steps));
  if (t["ramp:wheelchair"] === "yes" || t.ramp === "yes") add("entrance", "ramp");
  else if (steps === "0") add("entrance", "level");
  add("step_height_cm", parseLengthCm(t["kerb:height"] ?? t["step:height"]));
  add("door_width_cm", parseLengthCm(t["door:width"] ?? t["entrance:width"]));

  if (t.amenity === "toilets") add("toilet", yesNo(t.wheelchair));
  else add("toilet", yesNo(t["toilets:wheelchair"]));
  add("changing_table", yesNo(t.changing_table));
  add("elevator", yesNo(t.elevator));

  const surface = t.surface;
  if (surface) {
    const map: Record<string, string> = {
      asphalt: "smooth",
      concrete: "smooth",
      "concrete:plates": "smooth",
      paving_stones: "paving",
      sett: "cobblestone",
      cobblestone: "cobblestone",
      unhewn_cobblestone: "cobblestone",
      gravel: "gravel",
      fine_gravel: "gravel",
      unpaved: "gravel",
    };
    add("surface", map[surface]);
  }

  const street = [t["addr:street"] ?? t["addr:place"], t["addr:housenumber"]].filter(Boolean).join(" ");
  // Skróty i inne nazwy ("MOCAK", "Cricoteka") — do wyszukiwania.
  const altNames = [t.short_name, t.alt_name, t.official_name, t["name:en"]]
    .flatMap((n) => (n ? n.split(";") : []))
    .map((n) => n.trim())
    .filter((n) => n && n !== name);
  return {
    id: `osm-${el.type[0]}${el.id}`,
    name,
    category: categoryOf(t),
    lat,
    lon,
    ...(street ? { address: street } : {}),
    ...(altNames.length ? { altNames: [...new Set(altNames)] } : {}),
    facts,
  };
}
