"use client";

import { useState } from "react";
import { FEATURE_LABELS, formatDate, formatValue } from "@/lib/labels";
import type { Fact } from "@/lib/model";

type Result =
  | { ok: true; lastEdit?: string; changed: boolean; facts: Fact[]; snapshotAt?: string }
  | { ok: false; error: string; snapshotAt?: string };

export function LiveCheck({ placeId }: { placeId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [result, setResult] = useState<Result | null>(null);

  const check = async () => {
    setState("loading");
    const awaria = new URLSearchParams(window.location.search).get("awaria");
    try {
      const r = await fetch(`/api/places/${placeId}/live${awaria ? `?awaria=${awaria}` : ""}`);
      setResult(await r.json());
    } catch {
      setResult({ ok: false, error: "brak połączenia" });
    }
    setState("done");
  };

  return (
    <section aria-labelledby="live-h">
      <h2 id="live-h">Aktualność danych z OpenStreetMap</h2>
      <p className="lead">Dane OSM są importowane codziennie. Możesz sprawdzić ten obiekt w OSM teraz.</p>
      <button type="button" className="secondary" onClick={check} disabled={state === "loading"}>
        {state === "loading" ? "Sprawdzam…" : "Sprawdź teraz w OpenStreetMap"}
      </button>
      <div role="status" aria-live="polite" style={{ marginTop: 10 }}>
        {result && result.ok && (
          <div className="banner info">
            <strong>
              {result.changed
                ? "W OpenStreetMap są zmiany od ostatniego importu"
                : "Dane w OpenStreetMap nie zmieniły się od ostatniego importu"}
            </strong>
            {result.lastEdit && <>Ostatnia edycja obiektu w OSM: {formatDate(result.lastEdit)}. </>}
            {result.changed && (
              <>
                Aktualne informacje w OSM:{" "}
                {result.facts.length
                  ? result.facts.map((f) => `${FEATURE_LABELS[f.key]}: ${formatValue(f.key, f.value)}`).join("; ")
                  : "brak informacji o dostępności"}
                . Zostaną uwzględnione przy najbliższym imporcie.
              </>
            )}
          </div>
        )}
        {result && !result.ok && (
          <div className="banner" role="alert">
            <strong>Nie udało się połączyć z OpenStreetMap</strong>
            Pokazujemy kopię danych z dnia {result.snapshotAt ? formatDate(result.snapshotAt) : "ostatniego importu"}.
            Nie traktuj jej jako potwierdzenia bieżącego stanu.
          </div>
        )}
      </div>
    </section>
  );
}
