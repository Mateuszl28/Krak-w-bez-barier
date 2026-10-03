// Asystent AI (Gemini): rozumie potrzeby opisane własnymi słowami, a fakty bierze
// wyłącznie z naszych narzędzi — wyszukiwarki miejsc, przystanków i oceny tras.
// Model nie ma własnej wiedzy o dostępności; wszystko, co mówi, pochodzi z danych.

import {
  ApiError,
  GoogleGenAI,
  createPartFromFunctionResponse,
  type Content,
  type FunctionDeclaration,
  type GenerateContentResponse,
} from "@google/genai";
import { assess, assessStop } from "./assess.ts";
import type { Locale } from "./i18n.ts";
import { LABELS, PRESETS } from "./labels.ts";
import type { Category, Place, Profile } from "./model.ts";
import { distanceM, loadCity, nearbyStops, normalize, search, type CityData } from "./repository.ts";
import { planRoute } from "./routing.ts";
import { SOURCES } from "./sources.ts";

export const ASSISTANT_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// Zapasowe modele z osobnymi limitami darmowego planu (przełączenie przy 429 na starcie pytania).
const FALLBACK_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];
const MAX_WAIT_S = 22;
const MAX_STEPS = 8;

type LatLon = [number, number];

export interface AssistantTurn {
  role: "user" | "model";
  text: string;
}

export interface AssistantRequest {
  message: string;
  history: AssistantTurn[];
  city: string;
  locale: Locale;
  profile: Profile;
  /** Lokalizacja tylko, jeśli użytkownik ją udostępnił. */
  location?: LatLon;
}

export interface AssistantResult {
  reply: string;
  /** Ostatnia trasa wyznaczona przez asystenta — aplikacja pokazuje ją na mapie. */
  route?: { from: LatLon; to: LatLon; fromName: string; toName: string };
  /** Wymagania ustalone z rozmowy — aplikacja może je zastosować w profilu. */
  profile?: Profile;
  places: { id: string; name: string }[];
  toolCalls: string[];
  /** Model, który udzielił odpowiedzi. */
  model?: string;
}

const CATEGORIES: Category[] = [
  "culture",
  "food",
  "accommodation",
  "toilet",
  "transport",
  "office",
  "health",
  "shop",
  "attraction",
  "other",
];

const DECLARATIONS: FunctionDeclaration[] = [
  {
    name: "set_requirements",
    description:
      "Ustaw wymagania użytkownika na podstawie tego, co napisał (czym się porusza, potrzeby). Wywołaj, gdy użytkownik poda lub zmieni potrzeby. Nie pytaj o niepełnosprawność.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        mobility: {
          type: "string",
          enum: ["wheelchair_manual", "wheelchair_electric", "stroller"],
          description: "wózek ręczny, elektryczny lub dziecięcy",
        },
        max_step_cm: { type: "number", description: "najwyższy próg/stopień do pokonania (cm)" },
        min_door_cm: { type: "number", description: "potrzebna szerokość przejścia (cm)" },
        need_toilet: { type: "boolean" },
        need_changing_table: { type: "boolean" },
        avoid_cobbles: { type: "boolean", description: "unikanie bruku i żwiru" },
      },
    },
  },
  {
    name: "search_places",
    description:
      "Wyszukaj miejsca po nazwie lub adresie (muzea, kawiarnie, hotele, toalety, dworce…). Zwraca ocenę dostępności dla bieżących wymagań.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string", enum: CATEGORIES },
      },
      required: ["query"],
    },
  },
  {
    name: "search_stops",
    description: "Wyszukaj przystanek komunikacji miejskiej po nazwie. Zwraca współrzędne i ocenę wsiadania.",
    parametersJsonSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "find_nearby",
    description:
      "Znajdź miejsca danej kategorii w pobliżu punktu (np. toalety po drodze, kawiarnie obok celu) z oceną dostępności.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        lat: { type: "number" },
        lon: { type: "number" },
        category: { type: "string", enum: CATEGORIES },
        radius_m: { type: "number", description: "promień w metrach, domyślnie 500" },
      },
      required: ["lat", "lon", "category"],
    },
  },
  {
    name: "get_place_details",
    description:
      "Szczegóły miejsca: wynik każdego wymagania, bariery i udogodnienia ze źródłem i datą, najbliższe przystanki.",
    parametersJsonSchema: {
      type: "object",
      properties: { place_id: { type: "string" } },
      required: ["place_id"],
    },
  },
  {
    name: "plan_route",
    description:
      "Wyznacz i oceń pieszą trasę dojścia pod bieżące wymagania (schody, krawężniki, nawierzchnia, nachylenie). Start: współrzędne (np. przystanku lub miejsca) albo lokalizacja użytkownika. Cel: współrzędne.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        from_lat: { type: "number" },
        from_lon: { type: "number" },
        from_user_location: { type: "boolean", description: "start z lokalizacji użytkownika" },
        from_name: { type: "string" },
        to_lat: { type: "number" },
        to_lon: { type: "number" },
        to_name: { type: "string" },
      },
      required: ["to_lat", "to_lon", "to_name"],
    },
  },
];

function systemInstruction(req: AssistantRequest, cityName: string): string {
  const lang = req.locale === "en" ? "English" : "Polish";
  return [
    `You are the trip assistant of "Kraków bez barier" for ${cityName}. You help wheelchair users and parents with strollers check whether a place or a walking route fits their needs.`,
    `Answer in ${lang}, briefly and concretely (max ~120 words), in plain text: no Markdown (no **, #, tables); use "•" for lists.`,
    "Rules:",
    "- Every fact must come from a tool result in this conversation. Do not add anything from your own knowledge: no street names, route descriptions, landmarks, opening hours, prices or physical details that the tools did not return.",
    "- A general rating like 'accessible' from OpenStreetMap is only a general rating — say so, and do not turn it into specific claims (e.g. about the entrance level).",
    "- Missing data is never a confirmation of accessibility. Say clearly what is unknown or unverified, and when sources conflict.",
    "- Mention the key barriers and facilities (steps, kerbs, surface, door width, toilet) and the source with its date for the most important facts.",
    "- If the user describes their needs, call set_requirements first. Never ask about disability or diagnoses — only practical needs.",
    "- To plan a route: find the destination (search_places), find the start (search_stops / search_places, or the user's location if shared), then call plan_route.",
    "- If something is ambiguous (e.g. several places with the same name), ask one short clarifying question.",
    "- Call independent tools together in the same turn (e.g. set_requirements, search_stops and search_places at once) to answer quickly.",
    "- Data marked as sample (demo) must be described as sample data.",
    `Current requirements: ${JSON.stringify(req.profile)}. User location shared: ${req.location ? "yes" : "no"}.`,
  ].join("\n");
}

class Tools {
  profile: Profile;
  route?: AssistantResult["route"];
  profileChanged = false;
  places = new Map<string, string>();
  constructor(
    private city: CityData,
    private req: AssistantRequest,
  ) {
    this.profile = req.profile;
  }

  private placeSummary(p: Place, extra?: object) {
    const a = assess(p, this.profile, SOURCES, new Date(), this.req.locale);
    this.places.set(p.id, p.name);
    return {
      id: p.id,
      name: p.name,
      category: LABELS[this.req.locale].category[p.category],
      address: p.address,
      lat: p.lat,
      lon: p.lon,
      verdict: a.verdict,
      issues: a.requirements.filter((r) => r.outcome !== "ok").map((r) => r.detail),
      sample_data: a.usesSample || undefined,
      unverified: a.usesUnverified || undefined,
      possibly_outdated: a.stale || undefined,
      ...extra,
    };
  }

  async run(name: string, args: Record<string, unknown>): Promise<unknown> {
    const num = (k: string) => (typeof args[k] === "number" ? (args[k] as number) : undefined);
    const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : undefined);
    switch (name) {
      case "set_requirements": {
        const preset = str("mobility") as keyof typeof PRESETS | undefined;
        const base = preset && PRESETS[preset] ? PRESETS[preset] : this.profile;
        const bool = (k: string, d: boolean) => (typeof args[k] === "boolean" ? (args[k] as boolean) : d);
        this.profile = {
          preset: preset && !["max_step_cm", "min_door_cm"].some((k) => k in args) ? base.preset : "custom",
          maxStepCm: num("max_step_cm") ?? base.maxStepCm,
          minDoorCm: num("min_door_cm") ?? base.minDoorCm,
          needToilet: bool("need_toilet", base.needToilet),
          needChangingTable: bool("need_changing_table", base.needChangingTable),
          avoidCobbles: bool("avoid_cobbles", base.avoidCobbles),
        };
        this.profileChanged = true;
        return { requirements: this.profile };
      }
      case "search_places": {
        const category = CATEGORIES.find((c) => c === str("category"));
        const found = search(this.city.places, { q: str("query") ?? "", category, limit: 6 });
        return { places: found.map((p) => this.placeSummary(p)) };
      }
      case "search_stops": {
        const q = normalize(str("query") ?? "");
        const seen = new Set<string>();
        const stops = this.city.stops
          .filter((s) => normalize(s.name).includes(q))
          .filter((s) => (seen.has(s.name) ? false : (seen.add(s.name), true)))
          .slice(0, 6)
          .map((s) => {
            const a = assessStop(s, this.profile, this.req.locale);
            return {
              name: s.name,
              lat: s.lat,
              lon: s.lon,
              boarding: a.boarding.detail,
              platform: a.platform.detail,
              shelter_or_bench: a.rest,
            };
          });
        return { stops, source: SOURCES.krakow_open_data.name };
      }
      case "find_nearby": {
        const lat = num("lat"), lon = num("lon");
        if (lat === undefined || lon === undefined) return { error: "lat/lon required" };
        const category = CATEGORIES.find((c) => c === str("category"));
        const radius = Math.min(num("radius_m") ?? 500, 2000);
        const found = this.city.places
          .filter((p) => !category || p.category === category)
          .map((p) => ({ p, d: distanceM([lat, lon], [p.lat, p.lon]) }))
          .filter((x) => x.d <= radius)
          .sort((a, b) => a.d - b.d)
          .slice(0, 6)
          .map((x) => this.placeSummary(x.p, { distance_m: Math.round(x.d) }));
        return { places: found };
      }
      case "get_place_details": {
        const p = this.city.byId.get(str("place_id") ?? "");
        if (!p) return { error: "unknown place_id" };
        const a = assess(p, this.profile, SOURCES, new Date(), this.req.locale);
        this.places.set(p.id, p.name);
        return {
          ...this.placeSummary(p),
          requirements: a.requirements.map((r) => ({ label: r.label, outcome: r.outcome, detail: r.detail })),
          facts: p.facts.map((f) => ({
            feature: f.key,
            value: f.value,
            source: SOURCES[f.sourceId]?.name ?? f.sourceId,
            source_kind: SOURCES[f.sourceId]?.kind,
            date: f.observedAt,
            note: f.note,
            sample: f.sample,
          })),
          nearby_stops: nearbyStops(this.city.stops, p, 3).map((s) => ({
            name: s.name,
            distance_m: s.distanceM,
            boarding: assessStop(s, this.profile, this.req.locale).boarding.detail,
          })),
        };
      }
      case "plan_route": {
        const toLat = num("to_lat"), toLon = num("to_lon");
        let from: LatLon | undefined;
        if (args.from_user_location === true) {
          if (!this.req.location) return { error: "The user has not shared their location. Ask for a starting point." };
          from = this.req.location;
        } else if (num("from_lat") !== undefined && num("from_lon") !== undefined) {
          from = [num("from_lat")!, num("from_lon")!];
        }
        if (!from || toLat === undefined || toLon === undefined) return { error: "start and destination required" };
        const to: LatLon = [toLat, toLon];
        const plan = await planRoute(from, to, this.profile, { city: this.req.city, locale: this.req.locale });
        if (!plan.ok) return { error: plan.error };
        this.route = {
          from,
          to,
          fromName: str("from_name") ?? (args.from_user_location ? "📍" : ""),
          toName: str("to_name") ?? "",
        };
        const r = plan.route;
        return {
          verdict: r.verdict,
          distance_m: r.distanceM,
          requirements: r.requirements.map((x) => ({ label: x.label, outcome: x.outcome, detail: x.detail })),
          surfaces_m: r.surfaces,
          surface_data_coverage: r.coverage,
          inside_sidewalk_data_area: plan.insideDataArea,
          variants_checked: plan.alternatives,
          sources: plan.sources,
        };
      }
      default:
        return { error: `unknown tool ${name}` };
    }
  }
}

export class AssistantUnavailable extends Error {}

/** Limit zapytań dostawcy AI (np. darmowy plan Gemini). */
export class AssistantRateLimited extends Error {
  constructor(readonly retryAfterS: number) {
    super("rate limited");
  }
}

function retryDelayS(err: ApiError): number {
  const m = err.message.match(/retry in (\d+(?:\.\d+)?)s/i) ?? err.message.match(/"retryDelay":"(\d+)s"/);
  return m ? Math.ceil(Number(m[1])) : 30;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function askAssistant(req: AssistantRequest): Promise<AssistantResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AssistantUnavailable("GEMINI_API_KEY nie jest ustawiony");
  const city = await loadCity(req.city);
  const ai = new GoogleGenAI({ apiKey });
  const tools = new Tools(city, req);

  const contents: Content[] = [
    ...req.history.slice(-10).map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
    { role: "user", parts: [{ text: req.message }] },
  ];
  const toolCalls: string[] = [];

  const models = [ASSISTANT_MODEL, ...FALLBACK_MODELS.filter((m) => m !== ASSISTANT_MODEL)];
  let model = models[0];
  const generate = async (step: number): Promise<GenerateContentResponse> => {
    const call = () =>
      ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemInstruction(req, city.config.name),
          tools: [{ functionDeclarations: DECLARATIONS }],
        },
      });
    for (let attempt = 0; ; attempt++) {
      try {
        return await call();
      } catch (err) {
        // 429 = limit zapytań, 503 = chwilowe przeciążenie modelu u dostawcy.
        if (!(err instanceof ApiError) || (err.status !== 429 && err.status !== 503)) throw err;
        // Na starcie pytania przełączamy model; w trakcie (historia ma sygnatury
        // rozumowania danego modelu) czekamy na zwolnienie limitu.
        const next = step === 0 ? models[models.indexOf(model) + 1] : undefined;
        if (next) {
          model = next;
          continue;
        }
        const wait = err.status === 503 ? 3 : retryDelayS(err);
        if (attempt > 0 || wait > MAX_WAIT_S) throw new AssistantRateLimited(wait);
        await sleep(wait * 1000);
      }
    }
  };

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await generate(step);
    const calls = response.functionCalls ?? [];
    if (calls.length === 0) {
      return {
        // Aplikacja wyświetla zwykły tekst — usuwamy ewentualne znaczniki Markdown.
        reply: (response.text ?? "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, ""),
        route: tools.route,
        profile: tools.profileChanged ? tools.profile : undefined,
        places: [...tools.places].map(([id, name]) => ({ id, name })),
        toolCalls,
        model,
      };
    }
    // Pełna treść modelu (z sygnaturami rozumowania) wraca do historii bez zmian.
    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) contents.push(modelContent);
    const parts = [];
    for (const call of calls) {
      const name = call.name ?? "";
      toolCalls.push(name);
      let output: unknown;
      try {
        output = await tools.run(name, (call.args ?? {}) as Record<string, unknown>);
      } catch (err) {
        output = { error: (err as Error).message };
      }
      parts.push(createPartFromFunctionResponse(call.id ?? "", name, { output }));
    }
    contents.push({ role: "user", parts });
  }
  return {
    reply:
      req.locale === "en"
        ? "I couldn't finish planning within the step limit. Please narrow down the question."
        : "Nie udało się ukończyć planowania w limicie kroków. Spróbuj zawęzić pytanie.",
    places: [...tools.places].map(([id, name]) => ({ id, name })),
    toolCalls,
  };
}
