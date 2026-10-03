import type { FactValue, FeatureKey } from "./model.ts";

// Walidacja faktów przysyłanych z zewnątrz (zgłoszenia, deklaracje właścicieli).
const ALLOWED: Record<FeatureKey, (v: unknown) => boolean> = {
  entrance: (v) => v === "level" || v === "ramp" || v === "lift" || v === "steps",
  step_count: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 50,
  step_height_cm: (v) => typeof v === "number" && v >= 0 && v <= 60,
  door_width_cm: (v) => typeof v === "number" && v >= 30 && v <= 400,
  elevator: (v) => typeof v === "boolean",
  toilet: (v) => typeof v === "boolean",
  changing_table: (v) => typeof v === "boolean",
  surface: (v) => ["smooth", "paving", "cobblestone", "gravel"].includes(v as string),
  rest: (v) => typeof v === "boolean",
  parking: (v) => typeof v === "boolean",
  general: () => false, // ogólnej oceny nie przyjmujemy — tylko konkretne cechy
};

export function validFacts(input: unknown): Partial<Record<FeatureKey, FactValue>> {
  const facts: Partial<Record<FeatureKey, FactValue>> = {};
  if (!input || typeof input !== "object") return facts;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const ok = ALLOWED[key as FeatureKey];
    if (ok && ok(value)) facts[key as FeatureKey] = value as FactValue;
  }
  return facts;
}

export function validCity(input: unknown): string {
  return typeof input === "string" && /^[a-z-]{2,40}$/.test(input) ? input : "krakow";
}

/** Prosty limit w pamięci procesu (bez zapisywania adresów IP). */
export function rateLimiter(perHour: number) {
  const recent = new Map<string, number[]>();
  return (who: string): boolean => {
    const now = Date.now();
    const times = (recent.get(who) ?? []).filter((t) => now - t < 3_600_000);
    if (times.length >= perHour) return false;
    times.push(now);
    recent.set(who, times);
    return true;
  };
}
