"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { assess, VERDICT_TEXT, type FeatureView } from "@/lib/assess";
import {
  CATEGORY_LABELS,
  FEATURE_LABELS,
  FEATURE_ORDER,
  formatDate,
  formatValue,
} from "@/lib/labels";
import type { NearbyStop, Place, Source, SourceStatus } from "@/lib/model";
import { LiveCheck } from "./LiveCheck";
import { ProfilePicker } from "./ProfilePicker";
import { useProfile } from "./ProfileProvider";
import { ReportForm } from "./ReportForm";
import { SourceStatusBanner } from "./SourceStatusBanner";
import { StopsSection } from "./StopsSection";
import { OUTCOME_ICON, OUTCOME_LABEL, VERDICT_ICON } from "./Verdict";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

export function PlaceDetail({
  place,
  sources,
  status,
  stops,
}: {
  place: Place;
  sources: Record<string, Source>;
  status: SourceStatus[];
  stops: NearbyStop[];
}) {
  const { profile } = useProfile();
  const a = useMemo(() => assess(place, profile, sources), [place, profile, sources]);
  const v = VERDICT_TEXT[a.verdict];
  const isOsm = place.id.startsWith("osm-");

  return (
    <>
      <p>
        <a href="/">← Wróć do wyszukiwania</a>
      </p>
      <h1>{place.name}</h1>
      <p className="lead">
        {CATEGORY_LABELS[place.category]}
        {place.address ? ` · ${place.address}` : ""}
      </p>
      {(place.sample || a.usesSample) && (
        <div className="banner" style={{ borderColor: "#5b2a86" }}>
          <strong>
            <span className="tag sample">Dane przykładowe</span> Ten wpis zawiera dane przygotowane na potrzeby
            demonstracji
          </strong>
          Nie opisują rzeczywistego stanu obiektu.
        </div>
      )}

      <SourceStatusBanner status={status.filter((s) => !s.ok)} sources={sources} />

      <section aria-labelledby="ocena-h" className={`verdict-card v-${a.verdict}`}>
        <h2 id="ocena-h">
          <span aria-hidden="true">{VERDICT_ICON[a.verdict]} </span>
          {v.title}
        </h2>
        <p>{v.body}</p>
        <div className="flags">
          {a.verdict === "meets" && a.generalOnly && (
            <p>
              ⓘ Ocena opiera się na ogólnej deklaracji „dostępne” ze źródła, bez szczegółowych pomiarów wejścia i drzwi.
            </p>
          )}
          {a.usesUnverified && <p>⚠ Część informacji pochodzi wyłącznie z niezweryfikowanych zgłoszeń.</p>}
          {a.stale && <p>⚠ Część informacji ma ponad 2 lata i może być nieaktualna.</p>}
        </div>
      </section>

      <h2>Twoje wymagania</h2>
      <ul className="reqs">
        {a.requirements.map((r) => (
          <li key={r.id}>
            <span className={`mark o-${r.outcome}`} aria-hidden="true">
              {OUTCOME_ICON[r.outcome]}
            </span>
            <div>
              <div className="label">
                {r.label}: <span className={`o-${r.outcome}`}>{OUTCOME_LABEL[r.outcome]}</span>
              </div>
              <div className="detail">{r.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      <details className="panel">
        <summary>Zmień swoje wymagania</summary>
        <ProfilePicker />
      </details>

      <h2>Bariery i udogodnienia — skąd to wiemy</h2>
      <p className="lead">
        Każda informacja ma źródło, datę pozyskania lub ostatniego potwierdzenia i poziom wiarygodności. Gdy źródła się
        różnią, pokazujemy wszystkie wersje.
      </p>
      <div className="facts">
        {FEATURE_ORDER.map((key) => (
          <FeatureBlock key={key} view={a.features[key]} featureKey={key} sources={sources} />
        ))}
      </div>

      <StopsSection stops={stops} profile={profile} sources={sources} />

      <h2>Na mapie</h2>
      <MapView results={[{ place, assessment: a }]} height={260} />

      {isOsm && <LiveCheck placeId={place.id} />}

      <h2 id="popraw">Coś się nie zgadza?</h2>
      <ReportForm placeId={place.id} />

      <h2>Dla właściciela obiektu</h2>
      <p>
        Prowadzisz to miejsce? Opisz jego dostępność — deklaracja pojawi się na karcie z datą, a kartę możesz osadzić
        na swojej stronie.
      </p>
      <p>
        <a className="button" href={`/dla-firm/deklaracja/${place.id}`}>
          Wypełnij deklarację dostępności
        </a>{" "}
        <a className="button secondary" href={`/widget/${place.id}`}>
          Podgląd widżetu
        </a>
      </p>
    </>
  );
}

function FeatureBlock({
  view,
  featureKey,
  sources,
}: {
  view?: FeatureView;
  featureKey: (typeof FEATURE_ORDER)[number];
  sources: Record<string, Source>;
}) {
  const label = FEATURE_LABELS[featureKey];
  if (!view) {
    return (
      <div className="fact missing">
        <strong>{label}:</strong> brak informacji w żadnym źródle.
      </div>
    );
  }
  return (
    <section className="fact" aria-label={label}>
      <h3>
        {label}
        {view.status === "confirmed" && <span className="tag confirmed">Potwierdzone przez kilka źródeł</span>}
        {view.status === "conflict" && <span className="tag conflict">Sprzeczne dane</span>}
        {view.stale && <span className="tag stale">Może być nieaktualne</span>}
        {view.unverifiedOnly && <span className="tag unverified">Niezweryfikowane</span>}
      </h3>
      <ul>
        {view.facts.map((f, i) => {
          const src = sources[f.sourceId];
          return (
            <li key={i}>
              <span className="value">{formatValue(f.key, f.value)}</span>
              {f.note ? ` — ${f.note}` : ""}
              {f.sample && (
                <>
                  {" "}
                  <span className="tag sample">Dane przykładowe</span>
                </>
              )}
              <div className="src">
                Źródło: {src?.name ?? f.sourceId} · stan na{" "}
                {f.observedAt ? formatDate(f.observedAt) : "datę nieznaną"}
                {f.ref && (
                  <>
                    {" "}
                    · <a href={f.ref}>rekord w źródle</a>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
