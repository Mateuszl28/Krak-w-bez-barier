// Ocena miejsca względem potrzeb użytkownika. Zasada nadrzędna: brak informacji
// nigdy nie jest traktowany jako potwierdzenie dostępności, a sprzeczne dane
// pokazujemy obok siebie zamiast wybierać jedną wersję.

import type { Fact, FactValue, FeatureKey, Place, Profile, Source, TransitStop } from "./model.ts";
import { MESSAGES, type Locale, type Messages } from "./i18n.ts";
import { formatValue } from "./labels.ts";

/** Dane starsze niż 2 lata oznaczamy jako potencjalnie nieaktualne. */
export const STALE_AFTER_DAYS = 730;

export type FeatureStatus = "confirmed" | "single" | "conflict" | "missing";

export interface FeatureView {
  key: FeatureKey;
  facts: Fact[];
  /** Wartość przyjęta do oceny; brak przy konflikcie lub braku danych. */
  value?: FactValue;
  status: FeatureStatus;
  stale: boolean;
  /** Wszystkie fakty pochodzą ze zgłoszeń użytkowników. */
  unverifiedOnly: boolean;
}

export type Outcome = "ok" | "barrier" | "unknown" | "conflict";

export interface RequirementResult {
  id: string;
  label: string;
  outcome: Outcome;
  detail: string;
  keys: FeatureKey[];
  /** Wynik oparty wyłącznie na ogólnej ocenie źródła, bez szczegółowych pomiarów. */
  generalOnly?: boolean;
}

export type Verdict = "meets" | "barrier" | "incomplete";

export interface Assessment {
  verdict: Verdict;
  requirements: RequirementResult[];
  features: Partial<Record<FeatureKey, FeatureView>>;
  stale: boolean;
  usesUnverified: boolean;
  usesSample: boolean;
  /** Pozytywna ocena opiera się na ogólnej deklaracji, nie na pomiarach. */
  generalOnly: boolean;
}

function daysBetween(a: string, b: Date): number {
  return (b.getTime() - new Date(a).getTime()) / 86_400_000;
}

/** Czy dwie wartości z różnych źródeł mówią to samo. */
function agrees(key: FeatureKey, a: FactValue, b: FactValue): boolean {
  if (typeof a === "number" && typeof b === "number") {
    // Pomiary szerokości/wysokości różnią się o centymetry między źródłami.
    const tolerance = key.endsWith("_cm") ? 5 : 0;
    return Math.abs(a - b) <= tolerance;
  }
  return a === b;
}

/** Przy zgodnych pomiarach bierzemy wartość ostrożniejszą dla użytkownika. */
function conservative(key: FeatureKey, values: FactValue[]): FactValue {
  if (values.every((v) => typeof v === "number")) {
    const nums = values as number[];
    return key === "door_width_cm" ? Math.min(...nums) : Math.max(...nums);
  }
  return values[0];
}

export function viewFeature(
  key: FeatureKey,
  facts: Fact[],
  sources: Record<string, Source>,
  now = new Date(),
): FeatureView {
  const own = facts
    .filter((f) => f.key === key)
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  if (own.length === 0) {
    return { key, facts: [], status: "missing", stale: false, unverifiedOnly: false };
  }
  const stale = daysBetween(own[0].observedAt, now) > STALE_AFTER_DAYS;
  const unverifiedOnly = own.every((f) => sources[f.sourceId]?.kind === "user_report");

  // Najnowsza informacja z każdego źródła reprezentuje to źródło.
  const latestPerSource = new Map<string, Fact>();
  for (const f of own) if (!latestPerSource.has(f.sourceId)) latestPerSource.set(f.sourceId, f);
  const reps = [...latestPerSource.values()];

  const conflict = reps.some((a) => reps.some((b) => !agrees(key, a.value, b.value)));
  if (conflict) return { key, facts: own, status: "conflict", stale, unverifiedOnly };

  return {
    key,
    facts: own,
    value: conservative(
      key,
      reps.map((f) => f.value),
    ),
    status: reps.length >= 2 ? "confirmed" : "single",
    stale,
    unverifiedOnly,
  };
}

const TYPICAL_STEP_CM = 15;
const GENERAL_YES_DOOR_CM = 80;

function entranceRequirement(
  v: Partial<Record<FeatureKey, FeatureView>>,
  p: Profile,
  m: Messages,
  locale: Locale,
): RequirementResult {
  const base = {
    id: "entrance",
    label: m.entranceLabel(p.maxStepCm),
    keys: ["entrance", "step_count", "step_height_cm", "general"] as FeatureKey[],
  };
  const entrance = v.entrance;
  const count = v.step_count;
  const height = v.step_height_cm;
  const general = v.general;

  const detailed = [entrance, count, height].filter((x) => x && x.status !== "missing");
  if (detailed.some((x) => x!.status === "conflict")) {
    return { ...base, outcome: "conflict", detail: m.entranceConflict };
  }

  const h = typeof height?.value === "number" ? height.value : undefined;
  const n = typeof count?.value === "number" ? count.value : undefined;
  if (entrance?.value === "level" && n !== undefined && n > 0) {
    return { ...base, outcome: "conflict", detail: m.levelVsSteps };
  }
  if (h !== undefined && h > p.maxStepCm) {
    return { ...base, outcome: "barrier", detail: m.stepTooHigh(h) };
  }
  if (entrance?.value === "level" || entrance?.value === "ramp" || entrance?.value === "lift" || n === 0) {
    const how =
      entrance?.value === "ramp" ? m.viaRamp : entrance?.value === "lift" ? m.viaLift : m.stepFree;
    return { ...base, outcome: "ok", detail: h !== undefined ? m.withThreshold(how, h) : m.plain(how) };
  }
  if (entrance?.value === "steps" || (n !== undefined && n > 0)) {
    const steps = m.steps(n);
    if (h !== undefined) {
      return n !== undefined && n > 1
        ? { ...base, outcome: "barrier", detail: m.stepsEach(steps, h) }
        : { ...base, outcome: "ok", detail: m.stepsHigh(steps, h) };
    }
    // Wysokość nieznana: typowy stopień to ok. 15 cm. Dla wózka inwalidzkiego to
    // przeszkoda niezależnie od dokładnej wartości, dla wózka dziecięcego — nie wiadomo.
    return p.maxStepCm < TYPICAL_STEP_CM
      ? { ...base, outcome: "barrier", detail: m.stepsUnknownHeightBarrier(steps) }
      : { ...base, outcome: "unknown", detail: m.stepsUnknownHeight(steps) };
  }
  if (h !== undefined) {
    return { ...base, outcome: "ok", detail: m.threshold(h) };
  }

  if (general && general.status !== "missing") {
    if (general.status === "conflict") {
      return { ...base, outcome: "conflict", detail: m.generalConflict };
    }
    if (general.value === "yes") {
      return {
        ...base,
        outcome: "ok",
        generalOnly: true,
        detail: m.generalYes,
      };
    }
    if (general.value === "no" && p.maxStepCm < TYPICAL_STEP_CM) {
      return { ...base, outcome: "barrier", detail: m.generalNo };
    }
    return {
      ...base,
      outcome: "unknown",
      detail: m.generalOnly(formatValue("general", general.value!, locale)),
    };
  }
  return { ...base, outcome: "unknown", detail: m.noEntranceInfo };
}

function thresholdRequirement(
  view: FeatureView | undefined,
  base: Omit<RequirementResult, "outcome" | "detail">,
  test: (value: FactValue) => boolean,
  describe: (value: FactValue) => string,
  missing: string,
  conflict: string,
): RequirementResult {
  if (!view || view.status === "missing") return { ...base, outcome: "unknown", detail: missing };
  if (view.status === "conflict") {
    return { ...base, outcome: "conflict", detail: conflict };
  }
  return { ...base, outcome: test(view.value!) ? "ok" : "barrier", detail: describe(view.value!) };
}

export function assess(
  place: Place,
  profile: Profile,
  sources: Record<string, Source>,
  now = new Date(),
  locale: Locale = "pl",
): Assessment {
  const m = MESSAGES[locale];
  const features: Partial<Record<FeatureKey, FeatureView>> = {};
  const keys = new Set(place.facts.map((f) => f.key));
  for (const key of keys) features[key] = viewFeature(key, place.facts, sources, now);

  const requirements: RequirementResult[] = [entranceRequirement(features, profile, m, locale)];

  const door = features.door_width_cm;
  const generalYes = features.general?.status !== "conflict" && features.general?.value === "yes";
  if (!door && generalYes) {
    // Wg definicji OSM wheelchair=yes oznacza m.in. drzwi przejezdne dla
    // standardowego wózka (ok. 80 cm). Większych wymagań to nie gwarantuje.
    const standard = profile.minDoorCm <= GENERAL_YES_DOOR_CM;
    requirements.push({
      id: "door",
      label: m.doorLabel(profile.minDoorCm),
      keys: ["door_width_cm", "general"],
      outcome: standard ? "ok" : "unknown",
      generalOnly: true,
      detail: standard ? m.doorGeneralOk : m.doorGeneralUnknown,
    });
  } else {
    requirements.push(
      thresholdRequirement(
        door,
        { id: "door", label: m.doorLabel(profile.minDoorCm), keys: ["door_width_cm"] },
        (w) => typeof w === "number" && w >= profile.minDoorCm,
        (w) => m.doorWidth(w as number),
        m.noDoor,
        m.conflict,
      ),
    );
  }

  if (profile.needToilet) {
    requirements.push(
      thresholdRequirement(
        features.toilet,
        { id: "toilet", label: m.toiletLabel, keys: ["toilet"] },
        (x) => x === true,
        (x) => (x ? m.toiletYes : m.toiletNo),
        m.noToilet,
        m.conflict,
      ),
    );
  }
  if (profile.needChangingTable) {
    requirements.push(
      thresholdRequirement(
        features.changing_table,
        { id: "changing_table", label: m.changingLabel, keys: ["changing_table"] },
        (x) => x === true,
        (x) => (x ? m.changingYes : m.changingNo),
        m.noChanging,
        m.conflict,
      ),
    );
  }
  if (profile.avoidCobbles) {
    requirements.push(
      thresholdRequirement(
        features.surface,
        { id: "surface", label: m.surfaceLabel, keys: ["surface"] },
        (s) => s === "smooth" || s === "paving",
        (s) => m.surface(formatValue("surface", s, locale)),
        m.noSurface,
        m.conflict,
      ),
    );
  }

  const verdict: Verdict = requirements.some((r) => r.outcome === "barrier")
    ? "barrier"
    : requirements.every((r) => r.outcome === "ok")
      ? "meets"
      : "incomplete";

  const used = requirements
    .filter((r) => r.outcome !== "unknown")
    .flatMap((r) => r.keys.map((k) => features[k]).filter((x): x is FeatureView => !!x));

  return {
    verdict,
    requirements,
    features,
    stale: used.some((f) => f.stale),
    usesUnverified: used.some((f) => f.unverifiedOnly),
    usesSample: place.sample === true || used.some((f) => f.facts.some((x) => x.sample)),
    generalOnly: requirements.some((r) => r.generalOnly && r.outcome === "ok"),
  };
}

export const VERDICT_TEXTS: Record<Locale, Record<Verdict, { title: string; body: string }>> = {
  pl: {
    meets: { title: "Spełnia Twoje wymagania", body: "Według dostępnych danych. Sprawdź źródła i daty poniżej." },
    barrier: {
      title: "Bariery dla Twoich potrzeb",
      body: "Co najmniej jedno wymaganie nie jest spełnione według dostępnych danych.",
    },
    incomplete: {
      title: "Niepełne dane",
      body: "Nie możemy potwierdzić dostępności. Brak informacji nie oznacza, że miejsce jest dostępne.",
    },
  },
  en: {
    meets: { title: "Meets your needs", body: "According to available data. Check the sources and dates below." },
    barrier: { title: "Barriers for your needs", body: "At least one requirement is not met according to available data." },
    incomplete: {
      title: "Incomplete data",
      body: "We can't confirm accessibility. Missing information does not mean the place is accessible.",
    },
  },
};

export const VERDICT_TEXT = VERDICT_TEXTS.pl;

export interface StopAssessment {
  verdict: Verdict;
  boarding: RequirementResult;
  platform: RequirementResult;
  /** Wiata lub ławka na przystanku — miejsce odpoczynku. */
  rest?: boolean;
}

/** Ocena przystanku jako początku dojścia: wsiadanie/wysiadanie i peron. */
export function assessStop(stop: TransitStop, p: Profile, locale: Locale = "pl"): StopAssessment {
  const m = MESSAGES[locale];
  const wheelchair = p.maxStepCm < TYPICAL_STEP_CM;
  const base = { id: "boarding", label: m.boardingLabel, keys: [] as FeatureKey[] };
  const boarding: RequirementResult =
    stop.kerb === "kassel"
      ? { ...base, outcome: "ok", detail: m.kassel }
      : stop.kerb === "standard"
        ? wheelchair
          ? { ...base, outcome: "unknown", detail: m.standardKerbWheelchair }
          : { ...base, outcome: "ok", detail: m.standardKerb }
        : stop.kerb === "none"
          ? wheelchair
            ? { ...base, outcome: "barrier", detail: m.noPlatformWheelchair }
            : { ...base, outcome: "unknown", detail: m.noPlatform }
          : { ...base, outcome: "unknown", detail: m.noPlatformInfo };

  const pbase = { id: "platform", label: m.platformLabel, keys: [] as FeatureKey[] };
  const platform: RequirementResult =
    stop.surface === "gravel"
      ? { ...pbase, outcome: wheelchair || p.avoidCobbles ? "barrier" : "unknown", detail: m.platformGravel }
      : stop.surface
        ? { ...pbase, outcome: "ok", detail: m.platform(formatValue("surface", stop.surface, locale)) }
        : { ...pbase, outcome: "unknown", detail: m.noPlatformSurface };

  const reqs = [boarding, platform];
  const verdict: Verdict = reqs.some((r) => r.outcome === "barrier")
    ? "barrier"
    : reqs.every((r) => r.outcome === "ok")
      ? "meets"
      : "incomplete";
  return { verdict, boarding, platform, rest: stop.shelters + stop.benches > 0 };
}
