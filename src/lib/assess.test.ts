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
