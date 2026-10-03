// Ocena miejsca względem potrzeb użytkownika. Zasada nadrzędna: brak informacji
// nigdy nie jest traktowany jako potwierdzenie dostępności, a sprzeczne dane
// pokazujemy obok siebie zamiast wybierać jedną wersję.

import type { Fact, FactValue, FeatureKey, Place, Profile, Source } from "./model.ts";
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
): RequirementResult {
  const base = {
    id: "entrance",
    label: p.maxStepCm > 0 ? `Wejście z progiem najwyżej ${p.maxStepCm} cm` : "Wejście bez progów",
    keys: ["entrance", "step_count", "step_height_cm", "general"] as FeatureKey[],
  };
  const entrance = v.entrance;
  const count = v.step_count;
  const height = v.step_height_cm;
  const general = v.general;

  const detailed = [entrance, count, height].filter((x) => x && x.status !== "missing");
  if (detailed.some((x) => x!.status === "conflict")) {
    return { ...base, outcome: "conflict", detail: "Źródła podają sprzeczne informacje o wejściu." };
  }

  const h = typeof height?.value === "number" ? height.value : undefined;
  const n = typeof count?.value === "number" ? count.value : undefined;
  if (entrance?.value === "level" && n !== undefined && n > 0) {
    return { ...base, outcome: "conflict", detail: "Jedno źródło podaje wejście bez stopni, inne — stopnie." };
  }
  if (h !== undefined && h > p.maxStepCm) {
    return { ...base, outcome: "barrier", detail: `Próg lub stopień ma ${h} cm.` };
  }
  if (entrance?.value === "level" || entrance?.value === "ramp" || entrance?.value === "lift" || n === 0) {
    const how =
      entrance?.value === "ramp"
        ? "Wejście przez podjazd"
        : entrance?.value === "lift"
          ? "Wjazd przez platformę lub windę (może wymagać obsługi)"
          : "Wejście bez stopni";
    return { ...base, outcome: "ok", detail: h !== undefined ? `${how}, próg ${h} cm.` : `${how}.` };
  }
  if (entrance?.value === "steps" || (n !== undefined && n > 0)) {
    const steps = n !== undefined ? `${n} ${n === 1 ? "stopień" : "stopnie"}` : "stopnie";
    if (h !== undefined) {
      return n !== undefined && n > 1
        ? { ...base, outcome: "barrier", detail: `Przy wejściu ${steps} po ${h} cm.` }
        : { ...base, outcome: "ok", detail: `Przy wejściu ${steps} o wysokości ${h} cm.` };
    }
    // Wysokość nieznana: typowy stopień to ok. 15 cm. Dla wózka inwalidzkiego to
    // przeszkoda niezależnie od dokładnej wartości, dla wózka dziecięcego — nie wiadomo.
    return p.maxStepCm < TYPICAL_STEP_CM
      ? { ...base, outcome: "barrier", detail: `Przy wejściu ${steps} (wysokość nieznana).` }
      : { ...base, outcome: "unknown", detail: `Przy wejściu ${steps}, brak informacji o wysokości.` };
  }
  if (h !== undefined) {
    return { ...base, outcome: "ok", detail: `Próg ${h} cm.` };
  }

  if (general && general.status !== "missing") {
    if (general.status === "conflict") {
      return { ...base, outcome: "conflict", detail: "Źródła różnie oceniają dostępność miejsca." };
    }
    if (general.value === "yes") {
      return {
        ...base,
        outcome: "ok",
        generalOnly: true,
        detail: "Źródło ocenia miejsce jako dostępne dla wózka, bez szczegółów o wejściu.",
      };
    }
    if (general.value === "no" && p.maxStepCm < TYPICAL_STEP_CM) {
      return { ...base, outcome: "barrier", detail: "Źródło ocenia miejsce jako niedostępne dla wózka." };
    }
    return {
      ...base,
      outcome: "unknown",
      detail: `Źródło podaje tylko ogólną ocenę: ${formatValue("general", general.value!)}.`,
    };
  }
  return { ...base, outcome: "unknown", detail: "Brak informacji o wejściu." };
}

function thresholdRequirement(
  view: FeatureView | undefined,
  base: Omit<RequirementResult, "outcome" | "detail">,
  test: (value: FactValue) => boolean,
  describe: (value: FactValue) => string,
  missing: string,
): RequirementResult {
  if (!view || view.status === "missing") return { ...base, outcome: "unknown", detail: missing };
  if (view.status === "conflict") {
    return { ...base, outcome: "conflict", detail: "Źródła podają sprzeczne informacje." };
  }
  return { ...base, outcome: test(view.value!) ? "ok" : "barrier", detail: describe(view.value!) };
}

export function assess(
  place: Place,
  profile: Profile,
  sources: Record<string, Source>,
  now = new Date(),
): Assessment {
  const features: Partial<Record<FeatureKey, FeatureView>> = {};
  const keys = new Set(place.facts.map((f) => f.key));
  for (const key of keys) features[key] = viewFeature(key, place.facts, sources, now);

  const requirements: RequirementResult[] = [entranceRequirement(features, profile)];

  const door = features.door_width_cm;
  const generalYes = features.general?.status !== "conflict" && features.general?.value === "yes";
  if (!door && generalYes) {
    // Wg definicji OSM wheelchair=yes oznacza m.in. drzwi przejezdne dla
    // standardowego wózka (ok. 80 cm). Większych wymagań to nie gwarantuje.
    const standard = profile.minDoorCm <= GENERAL_YES_DOOR_CM;
    requirements.push({
      id: "door",
      label: `Przejście szerokie na co najmniej ${profile.minDoorCm} cm`,
      keys: ["door_width_cm", "general"],
      outcome: standard ? "ok" : "unknown",
      generalOnly: true,
      detail: standard
        ? "Brak pomiaru; ogólna ocena „dostępne” obejmuje drzwi przejezdne dla standardowego wózka."
        : "Brak pomiaru szerokości drzwi (jest tylko ogólna ocena dostępności).",
    });
  } else {
    requirements.push(
      thresholdRequirement(
        door,
        { id: "door", label: `Przejście szerokie na co najmniej ${profile.minDoorCm} cm`, keys: ["door_width_cm"] },
        (w) => typeof w === "number" && w >= profile.minDoorCm,
        (w) => `Szerokość drzwi: ${w} cm.`,
        "Brak pomiaru szerokości drzwi.",
      ),
    );
  }

  if (profile.needToilet) {
    requirements.push(
      thresholdRequirement(
        features.toilet,
        { id: "toilet", label: "Toaleta dostępna dla wózka", keys: ["toilet"] },
        (x) => x === true,
        (x) => (x ? "Jest toaleta dostępna dla wózka." : "Brak toalety dostępnej dla wózka."),
        "Brak informacji o toalecie.",
      ),
    );
  }
  if (profile.needChangingTable) {
    requirements.push(
      thresholdRequirement(
        features.changing_table,
        { id: "changing_table", label: "Przewijak", keys: ["changing_table"] },
        (x) => x === true,
        (x) => (x ? "Jest przewijak." : "Brak przewijaka."),
        "Brak informacji o przewijaku.",
      ),
    );
  }
  if (profile.avoidCobbles) {
    requirements.push(
      thresholdRequirement(
        features.surface,
        { id: "surface", label: "Dojście bez bruku i żwiru", keys: ["surface"] },
        (s) => s === "smooth" || s === "paving",
        (s) => `Nawierzchnia: ${formatValue("surface", s)}.`,
        "Brak informacji o nawierzchni dojścia.",
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

export const VERDICT_TEXT: Record<Verdict, { title: string; body: string }> = {
  meets: {
    title: "Spełnia Twoje wymagania",
    body: "Według dostępnych danych. Sprawdź źródła i daty poniżej.",
  },
  barrier: {
    title: "Bariery dla Twoich potrzeb",
    body: "Co najmniej jedno wymaganie nie jest spełnione według dostępnych danych.",
  },
  incomplete: {
    title: "Niepełne dane",
    body: "Nie możemy potwierdzić dostępności. Brak informacji nie oznacza, że miejsce jest dostępne.",
  },
};
