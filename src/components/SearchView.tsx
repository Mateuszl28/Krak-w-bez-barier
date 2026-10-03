"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { assess, type Assessment } from "@/lib/assess";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { Category, Place, Source, SourceStatus } from "@/lib/model";
import { ProfilePicker } from "./ProfilePicker";
import { useProfile } from "./ProfileProvider";
import { SourceStatusBanner } from "./SourceStatusBanner";
import { VerdictBadge } from "./Verdict";

const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <p>Ładowanie mapy…</p>,
});

interface Response {
  status: SourceStatus[];
  sources: Record<string, Source>;
  places: Place[];
}

export interface Assessed {
  place: Place;
  assessment: Assessment;
}

export function SearchView({ initialQuery = "", awaria = "" }: { initialQuery?: string; awaria?: string }) {
  const { profile } = useProfile();
  const [q, setQ] = useState(initialQuery);
  const [submitted, setSubmitted] = useState(initialQuery);
  const [category, setCategory] = useState<Category | "">("");
  const [near, setNear] = useState<[number, number] | null>(null);
  const [data, setData] = useState<Response | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "map">("list");
  const [onlyMatching, setOnlyMatching] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (submitted) params.set("q", submitted);
    if (category) params.set("category", category);
    if (near) {
      params.set("lat", String(near[0]));
      params.set("lon", String(near[1]));
    }
    if (awaria) params.set("awaria", awaria);
    params.set("limit", "60");
    setError("");
    fetch(`/api/v1/places?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setData)
      .catch(() => setError("Nie udało się pobrać wyników. Sprawdź połączenie i spróbuj ponownie."));
  }, [submitted, category, near, awaria]);

  const results: Assessed[] = useMemo(() => {
    if (!data) return [];
    const all = data.places.map((place) => ({ place, assessment: assess(place, profile, data.sources) }));
    return onlyMatching ? all.filter((r) => r.assessment.verdict === "meets") : all;
  }, [data, profile, onlyMatching]);

  const locate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setNear([pos.coords.latitude, pos.coords.longitude]),
      () => setError("Nie udało się ustalić lokalizacji. Wpisz nazwę miejsca lub adres."),
      { timeout: 10_000 },
    );
  };

  return (
    <>
      <h1>Sprawdź dostępność miejsca</h1>
      <p className="lead">
        Wybierz, czym się poruszasz, i wyszukaj miejsce. Pokażemy konkretne bariery i udogodnienia — z informacją,
        skąd pochodzą i jak są aktualne.
      </p>

      {data && <SourceStatusBanner status={data.status} sources={data.sources} />}

      <ProfilePicker />

      <form
        role="search"
        className="card"
        style={{ marginTop: 12 }}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q);
        }}
      >
        <div className="search-row">
          <div>
            <label htmlFor="q">Nazwa miejsca lub adres</label>
            <input
              id="q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="np. muzeum, Floriańska, hotel"
              autoComplete="off"
            />
          </div>
          <button type="submit">Szukaj</button>
        </div>
        <div className="grid-2" style={{ marginTop: 10 }}>
          <div>
            <label htmlFor="cat">Rodzaj miejsca</label>
            <select id="cat" value={category} onChange={(e) => setCategory(e.target.value as Category | "")}>
              <option value="">Wszystkie</option>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "end" }}>
            <button type="button" className="secondary" onClick={locate} style={{ width: "100%" }}>
              {near ? "Sortuję od najbliższych ✓" : "Pokaż najbliższe mnie"}
            </button>
          </div>
        </div>
      </form>

      <div className="toolbar">
        <label className="check">
          <input type="checkbox" checked={onlyMatching} onChange={(e) => setOnlyMatching(e.target.checked)} />
          Tylko spełniające moje wymagania
        </label>
        <div className="segmented" role="group" aria-label="Sposób prezentacji wyników">
          <button
            type="button"
            className={view === "list" ? "" : "secondary"}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Lista
          </button>
          <button
            type="button"
            className={view === "map" ? "" : "secondary"}
            aria-pressed={view === "map"}
            onClick={() => setView("map")}
          >
            Mapa
          </button>
        </div>
      </div>

      <p role="status" aria-live="polite" className="lead">
        {error || (data ? `Znaleziono ${results.length} miejsc.` : "Wczytywanie…")}
      </p>

      {view === "map" && data && (
        <>
          <p className="lead" style={{ fontSize: "0.95rem" }}>
            Mapa pokazuje te same miejsca co lista. Pełne informacje w formie tekstowej są w liście i na stronie
            miejsca.
          </p>
          <MapView results={results} />
        </>
      )}

      {view === "list" && (
        <ul className="results" aria-label="Wyniki wyszukiwania">
          {results.map(({ place, assessment }) => (
            <ResultItem key={place.id} place={place} assessment={assessment} />
          ))}
        </ul>
      )}
    </>
  );
}

function ResultItem({ place, assessment }: Assessed) {
  const reasons = assessment.requirements.filter((r) => r.outcome !== "ok").slice(0, 2);
  return (
    <li className="result">
      <Link href={`/miejsce/${place.id}`}>
        <div className="top">
          <span className="name">{place.name}</span>
          <VerdictBadge verdict={assessment.verdict} />
        </div>
        <span className="meta">
          {CATEGORY_LABELS[place.category]}
          {place.address ? ` · ${place.address}` : ""}
        </span>
        {reasons.length > 0 && (
          <ul className="reasons">
            {reasons.map((r) => (
              <li key={r.id}>{r.detail}</li>
            ))}
          </ul>
        )}
        {assessment.verdict === "meets" && assessment.generalOnly && (
          <span className="meta">Na podstawie ogólnej oceny, bez szczegółowych pomiarów.</span>
        )}
        <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {assessment.usesSample && <span className="tag sample">Dane przykładowe</span>}
          {assessment.usesUnverified && <span className="tag unverified">Niezweryfikowane</span>}
          {assessment.stale && <span className="tag stale">Mogą być nieaktualne</span>}
        </span>
      </Link>
    </li>
  );
}
