import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, assessStop, viewFeature } from "./assess.ts";
import { PRESETS } from "./labels.ts";
import type { Fact, Place } from "./model.ts";
import { SOURCES } from "./sources.ts";
import { osmToPlace, parseLengthCm } from "./osm.ts";

const NOW = new Date("2026-10-01");
const fact = (f: Partial<Fact> & Pick<Fact, "key" | "value">): Fact => ({
  sourceId: "osm",
  observedAt: "2026-01-01",
  ...f,
});
const place = (facts: Fact[]): Place => ({ id: "x", name: "X", category: "other", lat: 0, lon: 0, facts });

test("brak danych nie jest potwierdzeniem dostępności", () => {
  const a = assess(place([]), PRESETS.wheelchair_manual, SOURCES, NOW);
  assert.equal(a.verdict, "incomplete");
  assert.ok(a.requirements.every((r) => r.outcome === "unknown"));
});

test("sprzeczne źródła dają konflikt, a nie wybraną wartość", () => {
  const facts = [
    fact({ key: "entrance", value: "ramp", sourceId: "owner_declarations", observedAt: "2022-04-03" }),
    fact({ key: "entrance", value: "steps", sourceId: "user_reports", observedAt: "2026-09-20" }),
  ];
  const v = viewFeature("entrance", facts, SOURCES, NOW);
  assert.equal(v.status, "conflict");
  assert.equal(v.value, undefined);
  const a = assess(place(facts), PRESETS.wheelchair_manual, SOURCES, NOW);
  assert.equal(a.requirements[0].outcome, "conflict");
  assert.equal(a.verdict, "incomplete");
});

test("zgodne źródła są potwierdzeniem, pomiar bierzemy ostrożniejszy", () => {
  const facts = [
    fact({ key: "door_width_cm", value: 95, sourceId: "owner_declarations" }),
    fact({ key: "door_width_cm", value: 92, sourceId: "user_reports" }),
  ];
  const v = viewFeature("door_width_cm", facts, SOURCES, NOW);
  assert.equal(v.status, "confirmed");
  assert.equal(v.value, 92);
});

test("stopnie są barierą dla wózka inwalidzkiego, ale nie przesądzają dla dziecięcego", () => {
  const p = place([fact({ key: "entrance", value: "steps" })]);
  assert.equal(assess(p, PRESETS.wheelchair_manual, SOURCES, NOW).verdict, "barrier");
  assert.equal(assess(p, PRESETS.stroller, SOURCES, NOW).requirements[0].outcome, "unknown");
});

test("szerokość drzwi względem profilu", () => {
  const p = place([fact({ key: "entrance", value: "level" }), fact({ key: "door_width_cm", value: 85 })]);
  assert.equal(assess(p, PRESETS.wheelchair_manual, SOURCES, NOW).verdict, "meets");
  assert.equal(assess(p, PRESETS.wheelchair_electric, SOURCES, NOW).verdict, "barrier");
});

test("stare dane są oznaczane", () => {
  const p = place([fact({ key: "entrance", value: "level", observedAt: "2019-05-01" })]);
  assert.equal(assess(p, PRESETS.wheelchair_manual, SOURCES, NOW).stale, true);
});

test("ogólna ocena OSM jest oznaczona jako ogólna", () => {
  const a = assess(place([fact({ key: "general", value: "yes" })]), PRESETS.wheelchair_manual, SOURCES, NOW);
  assert.equal(a.verdict, "meets");
  assert.equal(a.generalOnly, true);
});

test("zgłoszenia użytkowników są oznaczone jako niezweryfikowane", () => {
  const p = place([fact({ key: "entrance", value: "steps", sourceId: "user_reports" })]);
  assert.equal(assess(p, PRESETS.wheelchair_manual, SOURCES, NOW).usesUnverified, true);
});

test("parsowanie szerokości z OSM", () => {
  assert.equal(parseLengthCm("0.9"), 90);
  assert.equal(parseLengthCm("85 cm"), 85);
  assert.equal(parseLengthCm("0,8 m"), 80);
  assert.equal(parseLengthCm("szerokie"), undefined);
});

test("tagi OSM → fakty", () => {
  const p = osmToPlace({
    type: "node",
    id: 1,
    lat: 50,
    lon: 19,
    timestamp: "2024-03-01T10:00:00Z",
    tags: { name: "Muzeum", tourism: "museum", wheelchair: "limited", "toilets:wheelchair": "yes", check_date: "2025-06-01" },
  })!;
  assert.equal(p.category, "culture");
  assert.deepEqual(
    p.facts.map((f) => [f.key, f.value, f.observedAt]),
    [
      ["general", "limited", "2025-06-01"],
      ["toilet", true, "2025-06-01"],
    ],
  );
});

test("przystanek: peron Kassel, brak peronu, brak danych", () => {
  const stop = { id: "1", name: "X 01", mode: "tram" as const, lat: 0, lon: 0, shelters: 1, benches: 0, sourceId: "krakow_open_data", observedAt: "2026-01-01" };
  const kassel = assessStop({ ...stop, kerb: "kassel", surface: "smooth" }, PRESETS.wheelchair_manual);
  assert.equal(kassel.verdict, "meets");
  assert.equal(kassel.rest, true);
  assert.equal(assessStop({ ...stop, kerb: "none", surface: "paving" }, PRESETS.wheelchair_manual).verdict, "barrier");
  assert.equal(assessStop({ ...stop, kerb: "none", surface: "paving" }, PRESETS.stroller).verdict, "incomplete");
  assert.equal(assessStop(stop, PRESETS.wheelchair_manual).verdict, "incomplete");
});

test("ocena po angielsku dla turystów", () => {
  const p = place([fact({ key: "entrance", value: "steps" })]);
  const a = assess(p, PRESETS.wheelchair_manual, SOURCES, NOW, "en");
  assert.equal(a.requirements[0].label, "Entrance with a threshold of at most 2 cm");
  assert.equal(a.requirements[0].detail, "Steps at the entrance (height unknown).");
  assert.equal(assess(p, PRESETS.wheelchair_manual, SOURCES, NOW).requirements[0].detail, "Przy wejściu stopnie (wysokość nieznana).");
});

test("trasa: schody to bariera dla wózka, odcinki bez danych nie są 'bez barier'", async () => {
  const { PathIndex, assessRoute } = await import("./route.ts");
  const index = new PathIndex({
    fetchedAt: "2026-10-01T00:00:00Z",
    bbox: [50, 19, 50.01, 19.01],
    ways: [
      { h: "footway", s: "smooth", g: [[50.001, 19.001], [50.001, 19.003]] },
      { h: "steps", sc: 12, g: [[50.001, 19.003], [50.001, 19.004]] },
    ],
    kerbs: [{ k: "lowered", lat: 50.001, lon: 19.002 }],
    benches: [[50.00105, 19.0015]],
  });
  const line: [number, number][] = [[50.001, 19.001], [50.001, 19.004], [50.005, 19.004]];
  const wheel = assessRoute(line, index, PRESETS.wheelchair_manual);
  assert.equal(wheel.verdict, "barrier");
  assert.equal(wheel.steps.flights, 1);
  assert.ok((wheel.surfaces.unknown ?? 0) > 300);
  assert.equal(wheel.rest?.benches, 1);
  assert.ok((wheel.rest?.longestGapM ?? 0) > 400);
  const stroller = assessRoute(line, index, PRESETS.stroller);
  assert.notEqual(stroller.verdict, "barrier");
});

test("asystent awaryjny: rozpoznanie potrzeb, startu i celu", async () => {
  const { parseRequest } = await import("./assistant-fallback.ts");
  const a = parseRequest("Jadę wózkiem z przystanku Teatr Bagatela do Sukiennic. Którędy bez schodów?");
  assert.equal(a.mobility, "wheelchair_manual");
  assert.equal(a.from, "przystanku Teatr Bagatela");
  assert.equal(a.to, "Sukiennic");
  const b = parseRequest("Z wózkiem dziecięcym na Wawel — gdzie po drodze jest toaleta z przewijakiem?");
  assert.equal(b.mobility, "stroller");
  assert.equal(b.needToilet, true);
  assert.equal(b.needChangingTable, true);
  assert.equal(b.to, "Wawel");
  assert.equal(b.from, undefined);
  const d = parseRequest("Z wózkiem dziecięcym na Wawel. Startuję z Placu Wszystkich Świętych.");
  assert.equal(d.from, "Placu Wszystkich Świętych");
  assert.equal(d.to, "Wawel");
  const e = parseRequest("Jadę wózkiem do Sukiennic z przystanku Filharmonia");
  assert.equal(e.to, "Sukiennic");
  assert.equal(e.from, "przystanku Filharmonia");
  assert.equal(parseRequest("Muzeum Narodowe — czy wejdę wózkiem elektrycznym?").to, "Muzeum Narodowe");
  const c = parseRequest("I use a power wheelchair, from Teatr Bagatela to Sukiennice, avoid cobbles");
  assert.equal(c.mobility, "wheelchair_electric");
  assert.equal(c.avoidCobbles, true);
  assert.equal(c.from, "Teatr Bagatela");
  assert.equal(c.to, "Sukiennice");
});

test("ten sam obiekt z danych miasta i OSM łączy się w jeden — sprzeczność widoczna", async () => {
  const { mergeDuplicates } = await import("./repository.ts");
  const city: Place = {
    id: "krk-wc-1", name: "Toaleta", category: "toilet", lat: 50.06, lon: 19.94,
    facts: [fact({ key: "toilet", value: true, sourceId: "krakow_open_data" })],
  };
  const osm: Place = {
    id: "osm-n1", name: "Toaleta publiczna", category: "toilet", lat: 50.06005, lon: 19.94005,
    facts: [fact({ key: "toilet", value: false, sourceId: "osm" })],
  };
  const far: Place = { id: "osm-n2", name: "Toaleta publiczna", category: "toilet", lat: 50.07, lon: 19.94, facts: [] };
  const byId = new Map([city, osm, far].map((p) => [p.id, p]));
  assert.equal(mergeDuplicates(byId), 1);
  assert.equal(byId.get("osm-n1"), city);
  assert.notEqual(byId.get("osm-n2"), city);
  assert.equal(viewFeature("toilet", city.facts, SOURCES, NOW).status, "conflict");
});
