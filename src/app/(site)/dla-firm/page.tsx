import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dla firm i instytucji" };

export default function ForBusiness() {
  return (
    <>
      <h1>Dla hoteli, organizatorów i aplikacji</h1>
      <p className="lead">
        Jedna, wiarygodna informacja o dostępności — wpisana raz, pokazywana wszędzie: na Twojej stronie, w systemie
        rezerwacyjnym i w aplikacjach turystycznych.
      </p>

      <h2>1. Widżet na stronę obiektu</h2>
      <p>
        Wklej jedną linię kodu na stronie hotelu, muzeum czy wydarzenia. Karta pokazuje bariery i udogodnienia ze
        źródłem i datą, działa bez JavaScriptu i jest zgodna z czytnikami ekranu.
      </p>
      <pre>
        {`<iframe src="https://<adres-aplikacji>/widget/demo-hotel"
        title="Dostępność obiektu" width="100%" height="520"
        style="border:0"></iframe>`}
      </pre>
      <p>
        <a href="/widget/demo-hotel">Zobacz przykładowy widżet</a> (obiekt fikcyjny, dane przykładowe).
      </p>

      <h2>2. Deklaracja właściciela</h2>
      <p>
        Właściciel opisuje obiekt w prostym formularzu albo publikuje plik <code>accessibility.json</code> na swojej
        stronie. Deklaracja pojawia się jako osobne źródło z datą i wygasa po 12 miesiącach bez potwierdzenia, więc dane
        nie „starzeją się” po cichu. Zgłoszenia odwiedzających, które jej przeczą, są widoczne obok niej.
      </p>
      <pre>
        {`{
  "placeId": "osm-n123456",
  "declaredAt": "2026-09-12",
  "facts": {
    "entrance": "level", "step_height_cm": 1, "door_width_cm": 95,
    "elevator": true, "toilet": true, "changing_table": true
  }
}`}
      </pre>

      <h2>3. Otwarte API</h2>
      <p>Wyszukiwanie i ocena dopasowania dla systemów rezerwacyjnych i aplikacji:</p>
      <pre>
        {`GET /api/v1/places?q=muzeum&preset=wheelchair_manual
GET /api/v1/places?lat=50.06&lon=19.94&maxStep=2&minDoor=90&toilet=1
GET /api/v1/places/{id}?preset=stroller`}
      </pre>
      <p>
        <a href="/api/v1/places?q=toaleta&preset=wheelchair_manual&limit=3">Przykładowa odpowiedź</a>
      </p>

      <h2>Model biznesowy</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Dla kogo</th>
              <th scope="col">Co dostaje</th>
              <th scope="col">Cena (propozycja)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Mieszkańcy i turyści</td>
              <td>Wyszukiwarka, profil potrzeb, zgłoszenia</td>
              <td>Bezpłatnie, zawsze</td>
            </tr>
            <tr>
              <td>Hotele, muzea, restauracje</td>
              <td>Panel deklaracji, widżet, oznaczenie „deklaracja właściciela”, statystyki wyświetleń</td>
              <td>Podstawowy bezpłatnie; Pro 29–49 zł / mies. (wiele obiektów, wersje językowe, raport)</td>
            </tr>
            <tr>
              <td>Organizatorzy wydarzeń</td>
              <td>Karta dostępności wydarzenia i trasy dojścia, widżet do biletów</td>
              <td>Od 199 zł za wydarzenie</td>
            </tr>
            <tr>
              <td>Systemy rezerwacyjne, aplikacje turystyczne, dostawcy map</td>
              <td>API z oceną dopasowania do potrzeb, dane z historią źródeł</td>
              <td>Darmowy limit; powyżej — abonament wg liczby zapytań</td>
            </tr>
            <tr>
              <td>Miasta i zarządcy nieruchomości</td>
              <td>Wdrożenie dla kolejnego miasta, audyt terenowy, raport luk w danych</td>
              <td>Licencja wdrożeniowa + utrzymanie roczne</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Nowe miasto w kilka dni</h2>
      <ol>
        <li>
          Plik <code>data/&lt;miasto&gt;/city.json</code> z granicami obszaru — dane OSM pobierają się automatycznie.
        </li>
        <li>Opcjonalny adapter lokalnych otwartych danych (toalety, parkingi, przystanki) — ten sam model faktów.</li>
        <li>Zaproszenie lokalnych obiektów do deklaracji; zgłoszenia mieszkańców działają od pierwszego dnia.</li>
      </ol>
    </>
  );
}
