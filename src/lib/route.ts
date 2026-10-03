// Ocena trasy dojścia: trasa piesza dopasowana do odcinków OSM (nawierzchnia,
// schody, nachylenie) i krawężników. Odcinki bez danych liczymy osobno — nie
// traktujemy ich jako "bez barier".

import type { RequirementResult, Verdict } from "./assess.ts";
import type { Locale } from "./i18n.ts";
import type { Profile } from "./model.ts";
import type { KerbNode, PathWay, PathsFile } from "./paths.ts";

const SAMPLE_M = 8;
const MATCH_M = 12;
const KERB_M = 7;
const STEPS_MATCH_M = 5;
const BENCH_M = 20;
const TYPICAL_STEP_CM = 15;
const MAX_INCLINE = 8;

type LatLon = [number, number];

function meters(a: LatLon, b: LatLon): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Odległość punktu od odcinka (przybliżenie płaskie — wystarczające na kilkanaście metrów). */
function distToSegment(p: LatLon, a: LatLon, b: LatLon): number {
  const k = Math.cos((p[0] * Math.PI) / 180);
  const ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0], px = p[1] * k, py = p[0];
  const dx = bx - ax, dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return meters(p, [ay + t * dy, (ax + t * dx) / k]);
}

/** Indeks przestrzenny sieci pieszej (siatka ~110 m). */
export class PathIndex {
  private cells = new Map<string, { way: PathWay; a: LatLon; b: LatLon }[]>();
  private kerbCells = new Map<string, KerbNode[]>();
  private benchCells = new Map<string, LatLon[]>();
  readonly data: PathsFile;
  constructor(data: PathsFile) {
    this.data = data;
    for (const way of data.ways) {
      for (let i = 1; i < way.g.length; i++) {
        const a = way.g[i - 1], b = way.g[i];
        const keys = new Set([this.key(a), this.key(b), this.key([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2])]);
        for (const key of keys) this.push(this.cells, key, { way, a, b });
      }
    }
    for (const k of data.kerbs) this.push(this.kerbCells, this.key([k.lat, k.lon]), k);
    for (const b of data.benches ?? []) this.push(this.benchCells, this.key(b), b);
  }
  private key(p: LatLon) {
    return `${Math.floor(p[0] * 1000)}:${Math.floor(p[1] * 650)}`;
  }
  private push<T>(m: Map<string, T[]>, k: string, v: T) {
    const arr = m.get(k);
    if (arr) arr.push(v);
    else m.set(k, [v]);
  }
  private near<T>(m: Map<string, T[]>, p: LatLon): T[] {
    const cy = Math.floor(p[0] * 1000), cx = Math.floor(p[1] * 650);
    const out: T[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(...(m.get(`${cy + dy}:${cx + dx}`) ?? []));
    return out;
  }
  covers(p: LatLon) {
    const [s, w, n, e] = this.data.bbox;
    return p[0] >= s && p[0] <= n && p[1] >= w && p[1] <= e;
  }
  nearestWay(p: LatLon): PathWay | undefined {
    // Schody często biegną tuż obok podjazdu lub chodnika — przypisujemy punkt do
    // schodów tylko, gdy leży na nich, a w pobliżu nie ma zwykłego odcinka.
    let path: { way: PathWay; d: number } | undefined;
    let steps: { way: PathWay; d: number } | undefined;
    for (const seg of this.near(this.cells, p)) {
      const d = distToSegment(p, seg.a, seg.b);
      if (d > MATCH_M) continue;
      if (seg.way.h === "steps") {
        if (!steps || d < steps.d) steps = { way: seg.way, d };
      } else {
        // Przy podobnej odległości wolimy chodnik niż jezdnię.
        const bias = seg.way.h === "footway" || seg.way.h === "pedestrian" ? -2 : 0;
        if (!path || d + bias < path.d) path = { way: seg.way, d: d + bias };
      }
    }
    if (steps && steps.d <= STEPS_MATCH_M && (!path || steps.d + 4 < path.d)) return steps.way;
    return path?.way;
  }
  get hasBenchData(): boolean {
    return (this.data.benches?.length ?? 0) > 0;
  }
  benchesNear(p: LatLon): LatLon[] {
    return this.near(this.benchCells, p).filter((b) => meters(p, b) <= BENCH_M);
  }
  kerbsNear(p: LatLon): KerbNode[] {
    return this.near(this.kerbCells, p).filter((k) => meters(p, [k.lat, k.lon]) <= KERB_M);
  }
}

export type SegmentKind = "ok" | "warn" | "barrier" | "unknown";

export interface RouteSegment {
  kind: SegmentKind;
  coords: LatLon[];
}

export interface RouteAssessment {
  verdict: Verdict;
  distanceM: number;
  requirements: RequirementResult[];
  surfaces: Record<string, number>; // metry wg nawierzchni (+ "unknown")
  steps: { flights: number; count?: number };
  kerbs: { raised: number; lowered: number; flush: number };
  maxIncline?: number;
  /** Miejsca odpoczynku: ławki przy trasie i najdłuższy odcinek bez ławki (informacyjnie). */
  rest?: { benches: number; longestGapM: number };
  /** Udział trasy dopasowanej do odcinków OSM z danymi o nawierzchni (0–1). */
  coverage: number;
  segments: RouteSegment[];
  dataDate: string;
}

const T = {
  pl: {
    stepsLabel: "Bez schodów na trasie",
    stepsBarrier: (f: number, c?: number) => `Schody na trasie: ${f} ${f === 1 ? "odcinek" : "odcinki"}${c ? ` (${c} stopni)` : ""}.`,
    stepsStroller: (f: number) => `Schody na trasie (${f}) — może być potrzebne wniesienie wózka.`,
    stepsNone: "Brak schodów na odcinkach z danymi.",
    kerbsLabel: "Krawężniki na przejściach",
    kerbsRaised: (r: number, l: number) => `Wysokie krawężniki: ${r}; obniżone: ${l}.`,
    kerbsOk: (l: number, f: number) => `Krawężniki obniżone lub zrównane: ${l + f}; brak wysokich w danych.`,
    kerbsUnknown: "Brak danych o krawężnikach na tej trasie.",
    surfaceLabel: "Nawierzchnia",
    surfaceDetail: (cobble: number, gravel: number, unknown: number) =>
      `Bruk: ${cobble} m, żwir/nieutwardzona: ${gravel} m, bez danych: ${unknown} m.`,
    inclineLabel: `Nachylenie do ${MAX_INCLINE}%`,
    inclineMax: (i: number) => `Największe oznaczone nachylenie: ${i}%.`,
    inclineUnknown: "Brak danych o nachyleniu.",
  },
  en: {
    stepsLabel: "No steps on the route",
    stepsBarrier: (f: number, c?: number) => `Steps on the route: ${f} ${f === 1 ? "flight" : "flights"}${c ? ` (${c} steps)` : ""}.`,
    stepsStroller: (f: number) => `Steps on the route (${f}) — you may need to carry the stroller.`,
    stepsNone: "No steps on segments with data.",
    kerbsLabel: "Kerbs at crossings",
    kerbsRaised: (r: number, l: number) => `Raised kerbs: ${r}; lowered: ${l}.`,
    kerbsOk: (l: number, f: number) => `Lowered or flush kerbs: ${l + f}; no raised kerbs in the data.`,
    kerbsUnknown: "No kerb data along this route.",
    surfaceLabel: "Surface",
    surfaceDetail: (cobble: number, gravel: number, unknown: number) =>
      `Cobbles: ${cobble} m, gravel/unpaved: ${gravel} m, no data: ${unknown} m.`,
    inclineLabel: `Slope up to ${MAX_INCLINE}%`,
    inclineMax: (i: number) => `Steepest tagged slope: ${i}%.`,
    inclineUnknown: "No slope data.",
  },
};

/** Próbkowanie geometrii co SAMPLE_M metrów. */
function sample(line: LatLon[]): { p: LatLon; len: number }[] {
  const out: { p: LatLon; len: number }[] = [];
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const d = meters(a, b);
    const n = Math.max(1, Math.ceil(d / SAMPLE_M));
    for (let j = 0; j < n; j++) {
      const t = (j + 0.5) / n;
      out.push({ p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], len: d / n });
    }
  }
  return out;
}

export function assessRoute(line: LatLon[], index: PathIndex, p: Profile, locale: Locale = "pl"): RouteAssessment {
  const m = T[locale];
  const wheelchair = p.maxStepCm < TYPICAL_STEP_CM;
  const surfaces: Record<string, number> = {};
  const seenSteps = new Set<PathWay>();
  const seenKerbs = new Set<KerbNode>();
  const seenBenches = new Set<LatLon>();
  let lastRestAt = 0;
  let longestGap = 0;
  let maxIncline: number | undefined;
  let matchedWithSurface = 0;
  let total = 0;
  const segments: RouteSegment[] = [];

  for (const { p: pt, len } of sample(line)) {
    total += len;
    const benches = index.benchesNear(pt);
    if (benches.length) {
      longestGap = Math.max(longestGap, total - lastRestAt);
      lastRestAt = total;
      for (const b of benches) seenBenches.add(b);
    }
    const way = index.nearestWay(pt);
    let kind: SegmentKind = "unknown";
    if (way?.h === "steps") {
      seenSteps.add(way);
      kind = wheelchair ? "barrier" : "warn";
    } else if (way?.s) {
      surfaces[way.s] = (surfaces[way.s] ?? 0) + len;
      matchedWithSurface += len;
      kind = way.s === "cobblestone" || way.s === "gravel" ? (p.avoidCobbles ? "barrier" : "warn") : "ok";
    } else {
      surfaces.unknown = (surfaces.unknown ?? 0) + len;
    }
    if (way?.i !== undefined) {
      maxIncline = Math.max(maxIncline ?? 0, way.i);
      if (way.i > MAX_INCLINE && wheelchair) kind = "barrier";
    }
    for (const k of index.kerbsNear(pt)) {
      seenKerbs.add(k);
      if (k.k === "raised" && p.maxStepCm < 10) kind = "barrier";
    }
    const last = segments.at(-1);
    if (last && last.kind === kind) last.coords.push(pt);
    else segments.push({ kind, coords: last ? [last.coords.at(-1)!, pt] : [line[0], pt] });
  }

  const flights = seenSteps.size;
  const stepCount = [...seenSteps].reduce((n, w) => n + (w.sc ?? 0), 0) || undefined;
  const kerbs = { raised: 0, lowered: 0, flush: 0 };
  for (const k of seenKerbs) kerbs[k.k as keyof typeof kerbs]++;
  const r = (x: number) => Math.round(x);

  const requirements: RequirementResult[] = [
    flights > 0
      ? {
          id: "steps",
          label: m.stepsLabel,
          keys: [],
          outcome: wheelchair ? "barrier" : "unknown",
          detail: wheelchair ? m.stepsBarrier(flights, stepCount) : m.stepsStroller(flights),
        }
      : { id: "steps", label: m.stepsLabel, keys: [], outcome: "ok", detail: m.stepsNone },
    kerbs.raised > 0
      ? {
          id: "kerbs",
          label: m.kerbsLabel,
          keys: [],
          outcome: p.maxStepCm < 10 ? "barrier" : "ok",
          detail: m.kerbsRaised(kerbs.raised, kerbs.lowered),
        }
      : kerbs.lowered + kerbs.flush > 0
        ? { id: "kerbs", label: m.kerbsLabel, keys: [], outcome: "ok", detail: m.kerbsOk(kerbs.lowered, kerbs.flush) }
        : { id: "kerbs", label: m.kerbsLabel, keys: [], outcome: "unknown", detail: m.kerbsUnknown },
  ];

  const cobble = r(surfaces.cobblestone ?? 0);
  const gravel = r(surfaces.gravel ?? 0);
  const unknown = r(surfaces.unknown ?? 0);
  requirements.push({
    id: "surface",
    label: m.surfaceLabel,
    keys: [],
    outcome: p.avoidCobbles && cobble + gravel > 20 ? "barrier" : unknown > total * 0.4 ? "unknown" : "ok",
    detail: m.surfaceDetail(cobble, gravel, unknown),
  });
  requirements.push(
    maxIncline !== undefined
      ? {
          id: "incline",
          label: m.inclineLabel,
          keys: [],
          outcome: maxIncline > MAX_INCLINE && wheelchair ? "barrier" : "ok",
          detail: m.inclineMax(maxIncline),
        }
      : { id: "incline", label: m.inclineLabel, keys: [], outcome: "unknown", detail: m.inclineUnknown },
  );

  const verdict: Verdict = requirements.some((x) => x.outcome === "barrier")
    ? "barrier"
    : requirements.every((x) => x.outcome === "ok")
      ? "meets"
      : "incomplete";

  return {
    verdict,
    distanceM: r(total),
    requirements,
    surfaces: Object.fromEntries(Object.entries(surfaces).map(([k, v]) => [k, r(v)])),
    steps: { flights, count: stepCount },
    kerbs,
    maxIncline,
    rest: index.hasBenchData
      ? { benches: seenBenches.size, longestGapM: r(Math.max(longestGap, total - lastRestAt)) }
      : undefined,
    coverage: total ? Math.round((matchedWithSurface / total) * 100) / 100 : 0,
    segments,
    dataDate: index.data.fetchedAt,
  };
}

/** Wynik do porównania wariantów trasy: najpierw najmniej barier, potem najkrótsza. */
export function routeScore(a: RouteAssessment): number {
  const barriers = a.requirements.filter((x) => x.outcome === "barrier").length;
  return barriers * 100_000 + a.distanceM;
}

/** Dekodowanie polilinii Valhalla (precyzja 6) → [lat, lon][]. */
export function decodePolyline6(str: string): LatLon[] {
  const out: LatLon[] = [];
  let i = 0, lat = 0, lon = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d;
      else lon += d;
    }
    out.push([lat / 1e6, lon / 1e6]);
  }
  return out;
}
