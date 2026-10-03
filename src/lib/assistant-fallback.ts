// Tryb awaryjny asystenta — bez modelu AI. Gdy Gemini jest niedostępny (limit,
// awaria, brak klucza), proste reguły rozpoznają potrzeby oraz start i cel, a
// odpowiedź powstaje z tych samych narzędzi i danych co w trybie AI.

import type { AssistantRequest, AssistantResult } from "./assistant.ts";
import { Tools } from "./assistant.ts";
import type { Category } from "./model.ts";
import { loadCity, normalize, type CityData } from "./repository.ts";

type LatLon = [number, number];

interface Match {
  name: string;
  lat: number;
  lon: number;
  placeId?: string;
}

/** Rdzeń słowa: ucinamy polskie końcówki fleksyjne ("Sukiennic" ~ "Sukiennice", "Placu" ~ "Plac"). */
function stem(word: string): string {
  return word.length > 4 ? word.slice(0, Math.max(4, word.length - 2)) : word;
}

const STOP_WORDS = new Set(["przystanku", "przystanek", "przystanek", "stop", "the", "ul", "ulicy", "ulica", "placu", "pod"]);

function tokens(text: string): string[] {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP_WORDS.has(t));
}

/** Każde słowo zapytania musi być początkiem któregoś słowa nazwy (po ucięciu końcówki). */
function matches(query: string[], name: string): boolean {
  const words = tokens(name);
  return query.length > 0 && query.every((q) => words.some((w) => w.startsWith(stem(q))));
}

const CATEGORY_RANK: Category[] = [
  "attraction",
  "culture",
  "transport",
  "office",
  "sport",
  "health",
  "accommodation",
  "toilet",
  "food",
  "shop",
  "other",
];

/** 0 = to samo słowo, 1 = inna końcówka (≤ 2 znaki), 2 = dłuższe słowo, 3 = tylko rdzeń. */
function wordScore(query: string[], name: string): number {
  const words = tokens(name);
  return query.reduce((sum, q) => {
    const best = Math.min(
      ...words.map((w) => (w === q ? 0 : w.startsWith(q) ? (w.length - q.length <= 2 ? 1 : 2) : w.startsWith(stem(q)) ? 3 : 9)),
    );
    return sum + best;
  }, 0);
}

function findPoint(city: CityData, text: string, preferStops: boolean): Match | undefined {
  const raw = normalize(text);
  const q = tokens(text);
  if (q.length === 0) return undefined;
  const stopHit = city.stops.find((s) => matches(q, s.name));
  const stop = stopHit && { name: stopHit.name.replace(/\s+\d+$/, ""), lat: stopHit.lat, lon: stopHit.lon };
  const places = city.places.filter((p) => matches(q, p.name));
  // Ranking: kategoria (cel podróży przed sklepem o tej samej nazwie), dokładność
  // dopasowania słów ("Wawelu" bliżej "Wawel" niż "Wawelskiego"), dane, długość nazwy.
  places.sort(
    (a, b) =>
      CATEGORY_RANK.indexOf(a.category) - CATEGORY_RANK.indexOf(b.category) ||
      wordScore(q, a.name) - wordScore(q, b.name) ||
      b.facts.length - a.facts.length ||
      a.name.length - b.name.length,
  );
  const place = places[0] && { name: places[0].name, lat: places[0].lat, lon: places[0].lon, placeId: places[0].id };
  const mentionsStop = /przystan|stop\b/.test(raw);
  return (preferStops || mentionsStop ? stop ?? place : place ?? stop) ?? undefined;
}

export function parseRequest(text: string) {
  const t = normalize(text);
  const mobility = /elektryczn|power wheelchair|electric/.test(t)
    ? "wheelchair_electric"
    : /dziecie|stroller|pram|buggy|baby/.test(t)
      ? "stroller"
      : /wozk|wozek|wheelchair/.test(t)
        ? "wheelchair_manual"
        : undefined;
  const needToilet = /toalet|\bwc\b|toilet/.test(t);
  const needChangingTable = /przewijak|changing/.test(t);
  const avoidCobbles = /(bez|unik\w*|avoid\w*)\s+(\w+\s+)?(bruk|kocich|cobble|zwir|gravel)/.test(t);
  // Koniec nazwy: znak interpunkcyjny, myślnik albo słowo pytające.
  const end = String.raw`(?=[.?!,;]|\s+[—–-]\s|\s+(?:którędy|ktoredy|gdzie|which|where|avoid|bez)\b|$)`;
  // "z X do Y", "od X do Y", "from X to Y" — "z wózkiem …" opisuje sposób poruszania się, nie start.
  let route = text.match(new RegExp(String.raw`(?:^|\s)(?:z|ze|od|from)\s+(.+?)\s+(?:do|na|to)\s+(.+?)` + end, "i"));
  if (route && /^(wózk|wozk|wheelchair|stroller|a\s|my\s)/i.test(route[1])) route = null;
  // Odwrotna kolejność: "do Y z X", "to Y from X"
  const reverse = route
    ? null
    : text.match(new RegExp(String.raw`(?:^|\s)(?:do|na|to)\s+([^—–.?!,;]+?)\s+(?:z|ze|od|from)\s+(?!wózk|wozk|przewij)([^—–.?!,;]+?)` + end, "i"));
  // "do Y" / "na Y" / "to Y" bez startu
  const dest =
    route || reverse ? undefined : text.match(new RegExp(String.raw`(?:^|\s)(?:do|na|to)\s+(.+?)` + end, "i"));
  // "startuję z X", "starting from X"
  const start =
    route || reverse
      ? undefined
      : text.match(new RegExp(String.raw`(?:startuj\S*|ruszam|starting)\s+(?:z|ze|od|from)\s+(.+?)` + end, "i"));
  // Bez "do": samo miejsce na początku pytania ("Muzeum Narodowe — czy wejdę wózkiem?")
  const subject =
    route || reverse || dest
      ? undefined
      : text
          .split(/[—–?!.,;:]|\s-\s|\bczy\b|\bis\b|\bcan\b/i)[0]
          .replace(/\b(szukam|sprawdź|sprawdz|jadę|jade|idę|ide|chcę|chce|find|check|i'm|im|going)\b/gi, "")
          .trim();
  return {
    mobility,
    needToilet,
    needChangingTable,
    avoidCobbles,
    from: (route?.[1] ?? reverse?.[2] ?? start?.[1])?.trim(),
    to: (route?.[2] ?? reverse?.[1] ?? dest?.[1] ?? subject)?.trim() || undefined,
  };
}

const T = {
  pl: {
    intro: "Tryb awaryjny (asystent AI jest chwilowo niedostępny) — odpowiedź z danych aplikacji.",
    requirements: (p: string) => `Przyjęte wymagania: ${p}.`,
    route: (from: string, to: string, m: number, verdict: string) => `Trasa ${from} → ${to}: ok. ${m} m, ocena: ${verdict}.`,
    notFound: (what: string) => `Nie znalazłem miejsca „${what}”. Spróbuj podać pełną nazwę.`,
    place: (name: string, verdict: string) => `${name}: ${verdict}.`,
    toilets: "Toalety w pobliżu celu:",
    noToilets: "Brak toalet publicznych w promieniu 600 m od celu w danych.",
    help: "Napisz np.: „Jadę wózkiem z przystanku Teatr Bagatela do Sukiennic”.",
    rest: (n: number, gap: number) => `• Miejsca odpoczynku: ${n} ławek przy trasie, najdłuższy odcinek bez ławki ok. ${gap} m.`,
    verdict: { meets: "spełnia wymagania", barrier: "bariery", incomplete: "niepełne dane" } as Record<string, string>,
    yes: "tak",
    no: "nie",
    profile: { wheelchair_manual: "wózek ręczny", wheelchair_electric: "wózek elektryczny", stroller: "wózek dziecięcy" } as Record<string, string>,
    toiletNeed: "toaleta",
    changingNeed: "przewijak",
    cobbles: "bez bruku",
  },
  en: {
    intro: "Fallback mode (the AI assistant is temporarily unavailable) — answer built from the app's data.",
    requirements: (p: string) => `Requirements used: ${p}.`,
    route: (from: string, to: string, m: number, verdict: string) => `Route ${from} → ${to}: approx. ${m} m, rating: ${verdict}.`,
    notFound: (what: string) => `I couldn't find “${what}”. Try the full name.`,
    place: (name: string, verdict: string) => `${name}: ${verdict}.`,
    toilets: "Toilets near the destination:",
    noToilets: "No public toilets within 600 m of the destination in the data.",
    help: "Try e.g.: “I use a wheelchair, from Teatr Bagatela stop to Sukiennice”.",
    rest: (n: number, gap: number) => `• Places to rest: ${n} benches along the route, longest stretch without a bench approx. ${gap} m.`,
    verdict: { meets: "meets your needs", barrier: "barriers", incomplete: "incomplete data" } as Record<string, string>,
    yes: "yes",
    no: "no",
    profile: { wheelchair_manual: "manual wheelchair", wheelchair_electric: "power wheelchair", stroller: "baby stroller" } as Record<string, string>,
    toiletNeed: "toilet",
    changingNeed: "changing table",
    cobbles: "no cobbles",
  },
};

export async function fallbackAssistant(req: AssistantRequest): Promise<AssistantResult> {
  const m = T[req.locale];
  const city = await loadCity(req.city);
  const tools = new Tools(city, req);
  const parsed = parseRequest(req.message);
  const lines: string[] = [m.intro];
  const toolCalls: string[] = [];

  if (parsed.mobility || parsed.needToilet || parsed.needChangingTable || parsed.avoidCobbles) {
    toolCalls.push("set_requirements");
    await tools.run("set_requirements", {
      ...(parsed.mobility ? { mobility: parsed.mobility } : {}),
      ...(parsed.needToilet ? { need_toilet: true } : {}),
      ...(parsed.needChangingTable ? { need_changing_table: true } : {}),
      ...(parsed.avoidCobbles ? { avoid_cobbles: true } : {}),
    });
    const p = tools.profile;
    const needs = [
      m.profile[p.preset] ?? `${p.maxStepCm} cm / ${p.minDoorCm} cm`,
      p.needToilet ? m.toiletNeed : "",
      p.needChangingTable ? m.changingNeed : "",
      p.avoidCobbles ? m.cobbles : "",
    ].filter(Boolean);
    lines.push(m.requirements(needs.join(", ")));
  }

  const to = parsed.to ? findPoint(city, parsed.to, false) : undefined;
  const from = parsed.from ? findPoint(city, parsed.from, true) : undefined;
  if (parsed.to && !to) lines.push(m.notFound(parsed.to));
  if (parsed.from && !from) lines.push(m.notFound(parsed.from));

  if (to?.placeId) {
    toolCalls.push("get_place_details");
    const d = (await tools.run("get_place_details", { place_id: to.placeId })) as {
      verdict: string;
      issues: string[];
    };
    lines.push(m.place(to.name, m.verdict[d.verdict] ?? d.verdict));
    for (const issue of d.issues.slice(0, 3)) lines.push(`• ${issue}`);
  }

  const start: LatLon | undefined = from ? [from.lat, from.lon] : undefined;
  if (to && (start || /moj\w* lokaliz|my location|stad|here/.test(normalize(req.message)))) {
    toolCalls.push("plan_route");
    const r = (await tools.run("plan_route", {
      ...(start ? { from_lat: start[0], from_lon: start[1], from_name: from!.name } : { from_user_location: true }),
      to_lat: to.lat,
      to_lon: to.lon,
      to_name: to.name,
    })) as {
      error?: string;
      verdict?: string;
      distance_m?: number;
      requirements?: { detail: string }[];
      rest_benches_along_route?: number;
      longest_stretch_without_bench_m?: number;
    };
    if (r.error) lines.push(r.error);
    else {
      lines.push(m.route(from?.name ?? "📍", to.name, r.distance_m ?? 0, m.verdict[r.verdict ?? ""] ?? ""));
      for (const q of r.requirements ?? []) lines.push(`• ${q.detail}`);
      if (r.rest_benches_along_route !== undefined) {
        lines.push(m.rest(r.rest_benches_along_route, r.longest_stretch_without_bench_m ?? 0));
      }
    }
  }

  if (to && (tools.profile.needToilet || tools.profile.needChangingTable)) {
    toolCalls.push("find_nearby");
    const near = (await tools.run("find_nearby", { lat: to.lat, lon: to.lon, category: "toilet", radius_m: 600 })) as {
      places: { name: string; distance_m: number; verdict: string; issues: string[] }[];
    };
    if (near.places.length === 0) lines.push(m.noToilets);
    else {
      lines.push(m.toilets);
      for (const p of near.places.slice(0, 3)) {
        lines.push(`• ${p.name} (${p.distance_m} m): ${m.verdict[p.verdict] ?? p.verdict}${p.issues[0] ? ` — ${p.issues[0]}` : ""}`);
      }
    }
  }

  if (!to) lines.push(m.help);

  return {
    reply: lines.join("\n"),
    route: tools.route,
    profile: tools.profileChanged ? tools.profile : undefined,
    places: [...tools.places].map(([id, name]) => ({ id, name })),
    toolCalls,
    model: "fallback",
    fallback: true,
  };
}
