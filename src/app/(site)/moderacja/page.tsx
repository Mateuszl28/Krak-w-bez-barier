import type { Metadata } from "next";
import { ModerationActions } from "@/components/ModerationActions";
import { FEATURE_LABELS, formatDate, formatValue } from "@/lib/labels";
import type { FactValue, FeatureKey, Place } from "@/lib/model";
import { listCities, loadCity, readPendingDeclarations, readStoredReports } from "@/lib/repository";

export const metadata: Metadata = { title: "Moderacja", robots: { index: false } };
export const dynamic = "force-dynamic";

function factsList(facts: Partial<Record<FeatureKey, FactValue>>) {
  return Object.entries(facts)
    .map(([k, v]) => `${FEATURE_LABELS[k as FeatureKey]}: ${formatValue(k as FeatureKey, v as FactValue)}`)
    .join("; ");
}

// Panel operatora: weryfikacja deklaracji właścicieli i przegląd zgłoszeń.
export default async function Moderation() {
  const cities = await Promise.all((await listCities()).map((c) => loadCity(c.id)));
  const find = (id: string): Place | undefined => cities.map((c) => c.byId.get(id)).find(Boolean);
  const declarations = (await readPendingDeclarations()).sort((a, b) =>
    (a.verifiedAt ? 1 : 0) - (b.verifiedAt ? 1 : 0) || b.declaredAt.localeCompare(a.declaredAt),
  );
  const reports = (await readStoredReports()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);

  return (
    <>
      <h1>Moderacja</h1>
      <p className="lead">
        Deklaracje właścicieli są widoczne od razu jako „oczekujące na weryfikację”. Po weryfikacji (kontakt z obiektem,
        zdjęcia, potwierdzenie odwiedzających) stają się deklaracją właściciela. Zgłoszenia użytkowników pozostają
        niezweryfikowane, dopóki nie potwierdzi ich inne źródło — tu można usunąć spam lub zgłoszenia nadużyć.
      </p>

      <h2>Deklaracje właścicieli ({declarations.length})</h2>
      {declarations.length === 0 && <p>Brak deklaracji.</p>}
      <ul className="reqs">
        {declarations.map((d) => {
          const place = find(d.placeId);
          return (
            <li key={d.id} style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <div className="label">
                  {place ? <a href={`/miejsce/${d.placeId}`}>{place.name}</a> : d.placeId} — {d.organization}
                </div>
                <div className="detail">
                  {d.verifiedAt ? (
                    <span className="tag confirmed">Zweryfikowana {formatDate(d.verifiedAt)}</span>
                  ) : (
                    <span className="tag unverified">Oczekuje na weryfikację</span>
                  )}{" "}
                  złożona {formatDate(d.declaredAt)}
                </div>
                <div className="detail">{factsList(d.facts)}</div>
                {d.notes && <div className="detail">Uwagi: {d.notes}</div>}
                <ModerationActions id={d.id} kind="declaration" verified={!!d.verifiedAt} />
              </div>
            </li>
          );
        })}
      </ul>

      <h2>Zgłoszenia użytkowników ({reports.length})</h2>
      {reports.length === 0 && <p>Brak zgłoszeń.</p>}
      <ul className="reqs">
        {reports.map((r) => {
          const place = find(r.placeId);
          return (
            <li key={r.id} style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <div className="label">
                  {place ? <a href={`/miejsce/${r.placeId}`}>{place.name}</a> : r.placeId} · {formatDate(r.createdAt)}
                </div>
                <div className="detail">{factsList(r.facts)}</div>
                {r.comment && <div className="detail">„{r.comment}”</div>}
                <ModerationActions id={r.id} kind="report" />
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
