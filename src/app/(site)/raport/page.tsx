import type { Metadata } from "next";
import { CATEGORY_LABELS, FEATURE_LABELS, formatDate } from "@/lib/labels";
import { listCities, loadCity } from "@/lib/repository";
import { SOURCES } from "@/lib/sources";
import { qualityReport } from "@/lib/stats";

export const metadata: Metadata = { title: "Raport jakości danych" };
export const dynamic = "force-dynamic";

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

function Bar({ value, total, label }: { value: number; total: number; label: string }) {
  const p = pct(value, total);
  return (
    <div aria-hidden="true" title={label} style={{ background: "var(--line)", borderRadius: 4, height: 10, minWidth: 80 }}>
      <div style={{ width: `${p}%`, height: 10, borderRadius: 4, background: "var(--accent)" }} />
    </div>
  );
}

// Raport dla miasta, moderatorów i partnerów: gdzie danych brakuje, co jest
// nieaktualne i gdzie źródła sobie przeczą — lista zadań do weryfikacji w terenie.
export default async function ReportPage({ searchParams }: { searchParams: Promise<{ miasto?: string }> }) {
  const { miasto } = await searchParams;
  const cities = await listCities();
  const cityId = cities.some((c) => c.id === miasto) ? miasto! : "krakow";
  const city = await loadCity(cityId);
  const r = qualityReport(city.places, SOURCES);
  const t = r.totals;

  return (
    <>
      <h1>Raport jakości danych — {city.config.name}</h1>
      <p className="lead">
        Liczone na żywo z danych aplikacji ({formatDate(r.generatedAt)}). Pokazuje, gdzie informacji o dostępności
        brakuje, gdzie są nieaktualne i gdzie źródła sobie przeczą — to lista zadań dla właścicieli obiektów, mapujących
        i weryfikacji w terenie.
      </p>
      <nav aria-label="Miasto" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {cities.map((c) => (
          <a
            key={c.id}
            className={c.id === cityId ? "button" : "button secondary"}
            href={`/raport?miasto=${c.id}`}
            aria-current={c.id === cityId ? "page" : undefined}
          >
            {c.name}
          </a>
        ))}
      </nav>

      <div className="grid-2">
        {[
          ["Miejsc w bazie", t.places, ""],
          ["Z jakąkolwiek informacją", t.withInfo, `${pct(t.withInfo, t.places)}%`],
          ["Ze szczegółami (wejście, progi, drzwi, toaleta)", t.detailed, `${pct(t.detailed, t.places)}%`],
          ["Tylko ogólna ocena „dostępne/niedostępne”", t.generalOnly, `${pct(t.generalOnly, t.places)}%`],
          ["Dane starsze niż 2 lata", t.stale, `${pct(t.stale, t.withInfo)}% miejsc z informacją`],
          ["Potwierdzone przez kilka źródeł", t.multiSource, `${t.confirmedFacts} zgodnych informacji`],
          ["Sprzeczne dane", t.conflicts, "do weryfikacji"],
        ].map(([label, value, note]) => (
          <div key={label as string} className="card">
            <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{value}</div>
            <div style={{ fontWeight: 600 }}>{label}</div>
            {note && <div className="lead" style={{ margin: 0, fontSize: "0.9rem" }}>{note}</div>}
          </div>
        ))}
      </div>

      <h2>Pokrycie według kategorii</h2>
      <div className="table-wrap">
        <table>
          <caption className="visually-hidden">Liczba miejsc i udział miejsc z informacją o dostępności według kategorii</caption>
          <thead>
            <tr>
              <th scope="col">Kategoria</th>
              <th scope="col">Miejsc</th>
              <th scope="col">Z informacją</th>
              <th scope="col">Ze szczegółami</th>
              <th scope="col">Nieaktualne</th>
              <th scope="col">Sprzeczne</th>
            </tr>
          </thead>
          <tbody>
            {r.byCategory.map((c) => (
              <tr key={c.category}>
                <th scope="row">{CATEGORY_LABELS[c.category]}</th>
                <td>{c.places}</td>
                <td>
                  {c.withInfo} ({pct(c.withInfo, c.places)}%)
                  <Bar value={c.withInfo} total={c.places} label="" />
                </td>
                <td>
                  {c.detailed} ({pct(c.detailed, c.places)}%)
                  <Bar value={c.detailed} total={c.places} label="" />
                </td>
                <td>{c.stale}</td>
                <td>{c.conflicts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Źródła</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Źródło</th>
              <th scope="col">Informacji</th>
              <th scope="col">Miejsc</th>
            </tr>
          </thead>
          <tbody>
            {r.bySource.map((s) => (
              <tr key={s.sourceId}>
                <th scope="row">{SOURCES[s.sourceId]?.name ?? s.sourceId}</th>
                <td>{s.facts}</td>
                <td>{s.places}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lead">Parking w pobliżu jest wyliczany z inwentaryzacji ZTP i nie liczy się jako informacja o samym miejscu.</p>

      <h2>Sprzeczne dane — do weryfikacji ({r.conflicts.length})</h2>
      {r.conflicts.length === 0 ? (
        <p>Brak sprzeczności między źródłami.</p>
      ) : (
        <ul>
          {r.conflicts.map((c, i) => (
            <li key={i}>
              <a href={`/miejsce/${c.id}`}>{c.name}</a> — {FEATURE_LABELS[c.feature]}: {c.values.join(" vs ")}
            </li>
          ))}
        </ul>
      )}

      <h2>Najstarsze dane ({r.stale.length} miejsc z danymi starszymi niż 2 lata)</h2>
      <ul>
        {r.stale.slice(0, 15).map((s) => (
          <li key={s.id}>
            <a href={`/miejsce/${s.id}`}>{s.name}</a> — ostatnia informacja: {formatDate(s.newest)}
          </li>
        ))}
      </ul>
      <p>
        Dane w formacie JSON: <a href={`/api/v1/stats?city=${cityId}`}>/api/v1/stats?city={cityId}</a>
      </p>
    </>
  );
}
