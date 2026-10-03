import type { Metadata } from "next";
import { STALE_AFTER_DAYS } from "@/lib/assess";
import { SOURCE_KIND_LABELS, formatDate } from "@/lib/labels";
import { loadCity } from "@/lib/repository";
import { SOURCES } from "@/lib/sources";

export const metadata: Metadata = { title: "Źródła i metoda" };
export const dynamic = "force-dynamic";

export default async function About() {
  const city = await loadCity();
  return (
    <>
      <h1>Źródła danych i metoda oceny</h1>
      <p className="lead">
        Nie mówimy „dostępne / niedostępne”. Pokazujemy konkretne bariery i udogodnienia, a przy każdej informacji —
        skąd pochodzi, z kiedy jest i na ile jest pewna.
      </p>

      <h2 id="zrodla">Źródła</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Źródło</th>
              <th scope="col">Rodzaj</th>
              <th scope="col">Licencja</th>
              <th scope="col">Aktualizacja</th>
              <th scope="col">Stan teraz</th>
            </tr>
          </thead>
          <tbody>
            {Object.values(SOURCES).map((s) => {
              const st = city.status.find((x) => x.sourceId === s.id);
              return (
                <tr key={s.id}>
                  <td>
                    <a href={s.url}>{s.name}</a>
                    <br />
                    <span style={{ fontSize: "0.9rem", color: "var(--muted)" }}>{s.description}</span>
                  </td>
                  <td>{SOURCE_KIND_LABELS[s.kind]}</td>
                  <td>{s.license}</td>
                  <td>{s.updateFrequency}</td>
                  <td>
                    {!st ? (
                      "—"
                    ) : st.ok ? (
                      <span className="status-ok">
                        ✓ działa
                        {st.fetchedAt ? `, kopia z ${formatDate(st.fetchedAt)}` : ""}
                        {st.records !== undefined ? `, ${st.records} rekordów` : ""}
                      </span>
                    ) : (
                      <span className="status-bad">✕ niedostępne: {st.error}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        Wykorzystane zbiory miejskie: warstwy ZTP „Toalety publiczne”, „Miejsca postojowe OzN” i „Przystanki
        Komunikacji Miejskiej w Krakowie” (ArcGIS, eksport GeoJSON). Sprawdziliśmy też rozkłady GTFS ZTP — pola dostępności dla wózków są w nich puste, dlatego ich nie
        używamy.
      </p>

      <h2 id="wiarygodnosc">Poziomy wiarygodności</h2>
      <ul>
        <li>
          <span className="tag confirmed">Potwierdzone przez kilka źródeł</span> — co najmniej dwa niezależne źródła podają
          zgodną informację (pomiary różniące się o ≤ 5 cm uznajemy za zgodne i bierzemy wartość ostrożniejszą).
        </li>
        <li>
          <strong>Jedno źródło</strong> — pokazujemy jego rodzaj: dane publiczne, deklaracja właściciela, dane
          społeczności OSM.
        </li>
        <li>
          <span className="tag unverified">Niezweryfikowane</span> — informacja tylko ze zgłoszeń użytkowników.
        </li>
        <li>
          <span className="tag stale">Może być nieaktualne</span> — najnowsza informacja ma ponad{" "}
          {Math.round(STALE_AFTER_DAYS / 365)} lata.
        </li>
        <li>
          <span className="tag conflict">Sprzeczne dane</span> — źródła się różnią; pokazujemy wszystkie wersje i nie
          wybieramy za użytkownika.
        </li>
        <li>
          <span className="tag sample">Dane przykładowe</span> — dane przygotowane do demonstracji, nieopisujące
          rzeczywistego stanu.
        </li>
      </ul>

      <h2 id="ocena">Jak powstaje ocena</h2>
      <p>
        Użytkownik wybiera potrzeby (najwyższy pokonywany próg, szerokość przejścia, toaleta, przewijak, nawierzchnia).
        Każde wymaganie dostaje wynik: spełnione, bariera, brak danych lub sprzeczne dane. Ocena całości:
      </p>
      <ul>
        <li>
          <strong>Bariery dla Twoich potrzeb</strong> — choć jedno wymaganie nie jest spełnione.
        </li>
        <li>
          <strong>Spełnia Twoje wymagania</strong> — wszystkie spełnione według dostępnych danych (z adnotacją, jeśli
          opiera się tylko na ogólnej ocenie).
        </li>
        <li>
          <strong>Niepełne dane</strong> — w każdym innym przypadku.{" "}
          <strong>Brak informacji nigdy nie jest traktowany jako potwierdzenie dostępności.</strong>
        </li>
      </ul>

      <h2 id="awarie">Gdy źródło jest niedostępne</h2>
      <p>
        Importy zapisują kopię danych z datą. Gdy źródło nie odpowiada, zostaje ostatnia udana kopia, a aplikacja
        pokazuje jej datę. Gdy źródła nie da się wczytać wcale, użytkownik widzi komunikat, że część informacji jest
        niedostępna — miejsca nie są wtedy pokazywane jako „bez barier”. Demonstracja:{" "}
        <a href="/?awaria=osm">wyszukiwarka bez OpenStreetMap</a>,{" "}
        <a href="/miejsce/demo-cafe">sprzeczne dane i nieaktualna deklaracja</a>,{" "}
        <a href="/miejsce/krk-wc-2">dane miejskie starsze niż 2 lata</a>.
      </p>

      <h2 id="zgloszenia">Poprawianie danych</h2>
      <p>
        Każdy może zgłosić korektę z karty miejsca. Zgłoszenie od razu pojawia się jako niezweryfikowane, obok danych z
        innych źródeł. Status „potwierdzone” uzyskuje, gdy zgodzi się z nim inne źródło (deklaracja właściciela, dane
        publiczne, OSM). W kolejnym etapie potwierdzone poprawki będą przekazywane do OpenStreetMap, żeby korzystali z
        nich wszyscy.
      </p>

      <h2 id="architektura">Architektura</h2>
      <pre>
        {`Źródła                  Adaptery (import)          Wspólny model          Prezentacja
OpenStreetMap ───────▶ scripts/ingest.ts ─┐
Otwarte dane Krakowa ▶ ingest-official.ts ├─▶ fakty: cecha, wartość,  ─▶ aplikacja (PWA)
Deklaracje właścicieli ──────────────────┤    źródło, data, ref         widżet do osadzenia
Zgłoszenia użytkowników ─────────────────┘    + ocena wg profilu      ─▶ API /api/v1`}
      </pre>
      <p>
        Nowe źródło = adapter zwracający fakty. Nowa kategoria miejsc = reguła w adapterze. Nowe miasto = katalog{" "}
        <code>data/&lt;miasto&gt;</code> z plikiem <code>city.json</code>.
      </p>

      <h2 id="prywatnosc">Prywatność i bezpieczeństwo</h2>
      <ul>
        <li>Nie pytamy o niepełnosprawność — wystarczą preferencje dotyczące barier.</li>
        <li>Profil potrzeb zapisuje się tylko w przeglądarce użytkownika (localStorage), nie na serwerze.</li>
        <li>Zgłoszenia są anonimowe: bez imienia, e-maila i adresu IP w zapisanym rekordzie; obowiązuje limit zgłoszeń.</li>
        <li>Lokalizacja jest używana tylko w przeglądarce do sortowania wyników i nie jest zapisywana.</li>
        <li>
          Asystent AI w aplikacji wysyła treść pytania (i lokalizację — tylko po jej włączeniu) do Google Gemini; rozmowy
          nie są zapisywane na naszym serwerze.
        </li>
        <li>Połączenia wyłącznie przez HTTPS.</li>
      </ul>

      <h2 id="dostepnosc">Deklaracja dostępności aplikacji</h2>
      <p>Celem jest zgodność z WCAG 2.2 na poziomie AA. W prototypie:</p>
      <ul>
        <li>pełna obsługa klawiaturą, widoczny fokus, link „Przejdź do treści”;</li>
        <li>semantyczne nagłówki, etykiety pól, komunikaty o wynikach odczytywane przez czytniki ekranu;</li>
        <li>kontrast tekstu co najmniej 4.5:1 w trybie jasnym i ciemnym;</li>
        <li>stan nigdy nie jest przekazywany samym kolorem — zawsze z ikoną i tekstem;</li>
        <li>mapa jest dodatkiem: wszystkie informacje są dostępne w liście i na karcie miejsca;</li>
        <li>pola i przyciski mają co najmniej 44 px wysokości.</li>
      </ul>
      <p>
        Znane ograniczenia: aplikacja jest tylko po polsku; znaczniki na mapie OSM mają ograniczony opis dla czytników
        (dlatego mapa jest opcjonalna); brak audytu z udziałem użytkowników — planujemy go przed wdrożeniem.
      </p>
    </>
  );
}
