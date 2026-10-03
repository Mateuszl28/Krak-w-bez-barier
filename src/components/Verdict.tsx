import { VERDICT_TEXT, type Outcome, type Verdict } from "@/lib/assess";

export const VERDICT_ICON: Record<Verdict, string> = { meets: "✓", barrier: "✕", incomplete: "?" };
export const OUTCOME_ICON: Record<Outcome, string> = { ok: "✓", barrier: "✕", unknown: "?", conflict: "!" };
export const OUTCOME_LABEL: Record<Outcome, string> = {
  ok: "spełnione",
  barrier: "bariera",
  unknown: "brak danych",
  conflict: "sprzeczne dane",
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={`verdict v-${verdict}`}>
      <span className="icon" aria-hidden="true">
        {VERDICT_ICON[verdict]}
      </span>
      {VERDICT_TEXT[verdict].title}
    </span>
  );
}
