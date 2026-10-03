// Raport jakości danych: pokrycie, aktualność, sprzeczności i luki — dla miasta,
// moderatorów i właścicieli obiektów ("co trzeba sprawdzić w terenie").

import { STALE_AFTER_DAYS, viewFeature } from "./assess.ts";
import type { Category, FeatureKey, Place, Source } from "./model.ts";

export interface CategoryStats {
  category: Category;
  places: number;
  withInfo: number;
  detailed: number;
  generalOnly: number;
  stale: number;
  conflicts: number;
}

export interface QualityReport {
  generatedAt: string;
  totals: CategoryStats & { multiSource: number; confirmedFacts: number };
  byCategory: CategoryStats[];
  bySource: { sourceId: string; facts: number; places: number }[];
  conflicts: { id: string; name: string; feature: FeatureKey; values: string[] }[];
  stale: { id: string; name: string; newest: string }[];
}

const DETAIL_KEYS: FeatureKey[] = ["entrance", "step_count", "step_height_cm", "door_width_cm", "toilet", "changing_table"];

export function qualityReport(places: Place[], sources: Record<string, Source>, now = new Date()): QualityReport {
  const empty = (category: Category): CategoryStats => ({
    category,
    places: 0,
    withInfo: 0,
    detailed: 0,
    generalOnly: 0,
    stale: 0,
    conflicts: 0,
  });
  const byCat = new Map<Category, CategoryStats>();
  const bySource = new Map<string, { facts: number; places: Set<string> }>();
  const conflicts: QualityReport["conflicts"] = [];
  const stale: QualityReport["stale"] = [];
  let multiSource = 0;
  let confirmedFacts = 0;

  for (const p of places) {
    const c = byCat.get(p.category) ?? empty(p.category);
    byCat.set(p.category, c);
    c.places++;
    // Parking w pobliżu jest faktem pochodnym — nie liczymy go jako informacji o samym miejscu.
    const own = p.facts.filter((f) => f.key !== "parking");
    for (const f of p.facts) {
      const s = bySource.get(f.sourceId) ?? { facts: 0, places: new Set<string>() };
      s.facts++;
      s.places.add(p.id);
      bySource.set(f.sourceId, s);
    }
    if (own.length === 0) continue;
    c.withInfo++;
    if (own.some((f) => DETAIL_KEYS.includes(f.key))) c.detailed++;
    else c.generalOnly++;
    if (new Set(own.map((f) => f.sourceId)).size > 1) multiSource++;

    const keys = [...new Set(own.map((f) => f.key))];
    let hasConflict = false;
    for (const key of keys) {
      const v = viewFeature(key, own, sources, now);
      if (v.status === "confirmed") confirmedFacts++;
      if (v.status === "conflict") {
        hasConflict = true;
        conflicts.push({
          id: p.id,
          name: p.name,
          feature: key,
          values: v.facts.map((f) => `${String(f.value)} (${sources[f.sourceId]?.name ?? f.sourceId}, ${f.observedAt})`),
        });
      }
    }
    if (hasConflict) c.conflicts++;

    const newest = own.map((f) => f.observedAt).sort().at(-1) ?? "";
    if (newest && (now.getTime() - new Date(newest).getTime()) / 86_400_000 > STALE_AFTER_DAYS) {
      c.stale++;
      stale.push({ id: p.id, name: p.name, newest });
    }
  }

  const byCategory = [...byCat.values()].sort((a, b) => b.places - a.places);
  const sum = (k: keyof Omit<CategoryStats, "category">) => byCategory.reduce((n, c) => n + c[k], 0);
  return {
    generatedAt: now.toISOString(),
    totals: {
      category: "other",
      places: sum("places"),
      withInfo: sum("withInfo"),
      detailed: sum("detailed"),
      generalOnly: sum("generalOnly"),
      stale: sum("stale"),
      conflicts: sum("conflicts"),
      multiSource,
      confirmedFacts,
    },
    byCategory,
    bySource: [...bySource].map(([sourceId, s]) => ({ sourceId, facts: s.facts, places: s.places.size })),
    conflicts,
    stale: stale.sort((a, b) => a.newest.localeCompare(b.newest)),
  };
}
