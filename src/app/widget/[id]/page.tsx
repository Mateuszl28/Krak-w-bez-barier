import { notFound } from "next/navigation";
import { assess, VERDICT_TEXT } from "@/lib/assess";
import { FEATURE_LABELS, PRESETS, PRESET_LABELS, SOURCE_KIND_LABELS, formatDate, formatValue } from "@/lib/labels";
import type { FeatureKey } from "@/lib/model";
import { loadCity } from "@/lib/repository";
import { SOURCES } from "@/lib/sources";
import { VERDICT_ICON } from "@/components/Verdict";

// Karta do osadzenia (iframe) na stronie hotelu, organizatora wydarzenia itp.
// Renderowana w całości po stronie serwera — działa bez JavaScriptu.

export const dynamic = "force-dynamic";

const KEYS: FeatureKey[] = ["entrance", "step_height_cm", "door_width_cm", "elevator", "toilet", "changing_table", "parking"];

export default async function Widget({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const city = await loadCity();
  const place = city.byId.get(id);
  if (!place) notFound();

  const presets = Object.values(PRESETS);
  const results = presets.map((p) => ({ preset: p.preset, a: assess(place, p, SOURCES) }));
  const features = results[0].a.features;
  const sample = place.sample || results.some((r) => r.a.usesSample);

  return (
    <main style={{ padding: 12, maxWidth: 520 }} lang="pl">
      <section className="card" aria-labelledby="w-title">
        <h1 id="w-title" style={{ fontSize: "1.2rem" }}>
          Dostępność: {place.name}
        </h1>
        {sample && (
          <p>
            <span className="tag sample">Dane przykładowe</span>
          </p>
        )}
        <ul className="reqs" aria-label="Ocena dla różnych potrzeb">
          {results.map(({ preset, a }) => (
            <li key={preset}>
              <span className={`mark v-${a.verdict}`} aria-hidden="true" style={{ background: "transparent" }}>
                {VERDICT_ICON[a.verdict]}
              </span>
              <div>
                <div className="label">{PRESET_LABELS[preset]}</div>
                <div className="detail">{VERDICT_TEXT[a.verdict].title}</div>
              </div>
            </li>
          ))}
        </ul>
        <h2 style={{ fontSize: "1rem", marginTop: 14 }}>Szczegóły</h2>
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {KEYS.map((k) => {
            const v = features[k];
            if (!v)
              return (
                <li key={k}>
                  <strong>{FEATURE_LABELS[k]}:</strong> brak informacji
                </li>
              );
            const f = v.facts[0];
            return (
              <li key={k}>
                <strong>{FEATURE_LABELS[k]}:</strong>{" "}
                {v.status === "conflict" ? "sprzeczne dane" : formatValue(k, v.value!)}{" "}
                <span style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
                  ({SOURCE_KIND_LABELS[SOURCES[f.sourceId].kind]}, {formatDate(f.observedAt)})
                </span>
              </li>
            );
          })}
        </ul>
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          <a href={`/miejsce/${place.id}`} target="_top">
            Pełna karta, źródła i dopasowanie do Twoich potrzeb →
          </a>
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 8, marginBottom: 0 }}>
          Kraków bez barier · informacje z wielu źródeł, nie stanowią formalnego zapewnienia dostępności.
        </p>
      </section>
    </main>
  );
}
