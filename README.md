# Kraków bez barier

Narzędzie, które pozwala sprawdzić, czy miejsce w Krakowie odpowiada **Twoim** potrzebom — zamiast etykiety
„dostępne / niedostępne” pokazuje konkretne bariery i udogodnienia (wejście, próg, szerokość drzwi, winda, toaleta,
przewijak, nawierzchnia, parking), a przy każdej informacji **źródło, datę i poziom wiarygodności**.

Prototyp na wyzwanie hackathonowe „Kraków bez barier”.

## Problem i grupa docelowa

Prototyp jest zawężony do dwóch grup: **osób poruszających się na wózkach** (ręcznych i elektrycznych) oraz
**rodziców z wózkami dziecięcymi**. Użytkownik nie podaje informacji o niepełnosprawności — wybiera tylko, czym się
porusza, i ewentualnie dostosowuje wymagania (najwyższy pokonywany próg, potrzebna szerokość przejścia, toaleta,
przewijak, unikanie bruku). Profil zapisuje się wyłącznie w przeglądarce.

Główny scenariusz: wybierz profil → wyszukaj miejsce (nazwa, adres, kategoria, „najbliższe mnie”) → zobacz ocenę
każdego wymagania i szczegóły ze źródłami → zgłoś poprawkę, jeśli coś się nie zgadza.

## Co działa

- Wyszukiwarka miejsc z oceną dopasowania do profilu: **spełnia / bariery / niepełne dane**.
  Brak informacji **nigdy** nie jest traktowany jako potwierdzenie dostępności.
- Karta miejsca: wynik dla każdego wymagania + wszystkie informacje ze źródłem, datą i linkiem do rekordu.
- Oznaczenia: potwierdzone przez kilka źródeł, niezweryfikowane (zgłoszenia), może być nieaktualne (> 2 lata),
  sprzeczne dane (pokazujemy wszystkie wersje), dane przykładowe.
- Zgłaszanie poprawek (anonimowe, walidowane, z limitem) — widoczne od razu jako niezweryfikowane.
- Sprawdzenie obiektu na żywo w OpenStreetMap z obsługą niedostępności źródła.
- Widżet do osadzenia na stronie hotelu / wydarzenia (`/widget/<id>`, działa bez JavaScriptu).
- Publiczne API z oceną dopasowania (`/api/v1/places`).
- Mapa (Leaflet + OSM) jako **dodatek** — te same informacje są w liście i na karcie miejsca.
- PWA: instalacja na telefonie, podstawowe działanie przy słabym zasięgu.

## Źródła danych

| Źródło | Co dostarcza | Pobieranie | Licencja |
|---|---|---|---|
| OpenStreetMap (Overpass API) | ~3300 miejsc w centrum Krakowa, tagi `wheelchair`, `toilets:wheelchair`, `changing_table`, `step_count`, `door:width`, `ramp`, `surface` | `npm run ingest` (kilka serwerów zapasowych) | ODbL 1.0 |
| OSM API | aktualny stan pojedynczego obiektu | na żądanie z karty miejsca | ODbL 1.0 |
| Otwarte dane Krakowa — ZTP: [Toalety publiczne](https://services-eu1.arcgis.com/svTzSt3AvH7sK6q9/arcgis/rest/services/Toalety_publiczne_4/FeatureServer/0) | 50 toalet: dostępność, sposób wjazdu (poziom 0 / platforma / winda / schodołaz), przewijak, godziny | `npm run ingest:official` | dane publiczne GMK, z podaniem źródła |
| Otwarte dane Krakowa — ZTP: [Miejsca postojowe OzN](https://services-eu1.arcgis.com/svTzSt3AvH7sK6q9/arcgis/rest/services/Miejsca_postojowe_OZN/FeatureServer/0) | 2037 miejsc postojowych; przypisujemy je miejscom w promieniu 150 m | `npm run ingest:official` | dane publiczne GMK, z podaniem źródła |
| Deklaracje właścicieli | szczegółowe dane od zarządcy obiektu | formularz / `accessibility.json` | CC BY 4.0 |
| Zgłoszenia użytkowników | obserwacje odwiedzających | formularz na karcie miejsca | CC BY 4.0 |

Sprawdzone, ale nieużyte: GTFS ZTP (pola `wheelchair_boarding` / `wheelchair_accessible` są puste), dane.gov.pl
(brak zbiorów UMK o dostępności).

**Aktualność i wiarygodność.** Data przy informacji to: `check_date` lub data ostatniej edycji obiektu (OSM), data
ostatniej edycji rekordu u wydawcy (dane miejskie), data deklaracji lub zgłoszenia. Informacje starsze niż 2 lata są
oznaczane. Zgodność co najmniej dwóch niezależnych źródeł daje status „potwierdzone”; rozbieżność — „sprzeczne dane”.

**Niedostępność źródła.** Importy zapisują kopię z datą i przy błędzie zostawiają poprzednią. Gdy źródła nie da się
wczytać, aplikacja to komunikuje i nie pokazuje miejsc jako „bez barier”. Demo: `/?awaria=osm`,
`/miejsce/<id>?awaria=osm`.

**Dane przykładowe.** Dwa fikcyjne obiekty (`demo-hotel`, `demo-cafe`) i dwa zgłoszenia służą do pokazania
deklaracji właściciela, potwierdzenia przez kilka źródeł, konfliktu i nieaktualnych danych. Są wyraźnie oznaczone w
interfejsie i w plikach.

## Architektura

```
Źródła                   Adaptery (import)                Wspólny model             Prezentacja
OpenStreetMap ────────▶ scripts/ingest.ts  ─┐
Otwarte dane Krakowa ─▶ scripts/ingest-official.ts ─┤─▶ Fakt { cecha, wartość,  ─▶ PWA (Next.js)
Deklaracje właścicieli ─────────────────────┤      źródło, data, ref }     ─▶ widżet /widget/<id>
Zgłoszenia użytkowników ────────────────────┘    + ocena wg profilu         ─▶ API /api/v1
```

- `src/lib/model.ts` — wspólny model (miejsce, fakt, źródło, profil).
- `src/lib/osm.ts`, `src/lib/krakow-official.ts` — adaptery źródeł.
- `src/lib/repository.ts` — łączenie źródeł, status źródeł, wyszukiwanie.
- `src/lib/assess.ts` — ocena względem profilu (czysta funkcja, testy w `assess.test.ts`).
- `data/<miasto>/` — konfiguracja miasta i kopie danych.

**Nowe źródło:** adapter zwracający fakty + wpis w `src/lib/sources.ts`.
**Nowa kategoria:** reguła w `categoryOf` (OSM) lub w adapterze.
**Nowe miasto:** `data/<miasto>/city.json` (granice, lista źródeł) + `npm run ingest -- <miasto>`.

## Uruchomienie

```bash
npm install
npm run ingest:all   # opcjonalnie — w repo są kopie danych
npm run build && npm start
npm test             # testy logiki oceny
```

Hosting: dowolny serwer Node.js lub Vercel (bez dodatkowej konfiguracji). Zgłoszenia w prototypie są zapisywane w
pliku (lokalnie) / `/tmp` (Vercel); w wersji produkcyjnej — baza danych (np. PostgreSQL).

## Dostępność cyfrowa (cel: WCAG 2.2 AA)

Obsługa klawiaturą i widoczny fokus, link „Przejdź do treści”, semantyczne nagłówki i etykiety, komunikaty
`aria-live` o wynikach, kontrast ≥ 4.5:1 w trybie jasnym i ciemnym, stan nigdy nie tylko kolorem, cele dotykowe ≥ 44 px,
tekstowa alternatywa dla mapy. Znane ograniczenia: tylko język polski; opisy znaczników mapy dla czytników są
ograniczone; brak audytu z udziałem użytkowników.

## Prywatność i bezpieczeństwo

Nie zbieramy informacji o niepełnosprawności ani danych osobowych. Profil i lokalizacja zostają w przeglądarce.
Zgłoszenia są anonimowe (bez IP w zapisanym rekordzie), walidowane po stronie serwera i limitowane. Tylko HTTPS.

## Model biznesowy i rozwój

Bezpłatnie dla mieszkańców i turystów. Przychody: abonament Pro dla obiektów (panel deklaracji, widżet, wiele
lokalizacji), karty dostępności dla wydarzeń, płatne API dla systemów rezerwacyjnych i aplikacji turystycznych,
wdrożenia dla kolejnych miast. Szczegóły na stronie `/dla-firm`.

Dalsze prace: trasy dojścia (nawierzchnia, krawężniki, przejścia) na podstawie sieci chodników OSM, wejścia do budynków
(`entrance=*`), panel właściciela z weryfikacją, moderacja zgłoszeń i przekazywanie poprawek do OSM, wersja angielska,
audyt dostępności z użytkownikami.

## Licencja

Kod: MIT. Dane: zgodnie z licencjami źródeł (patrz tabela powyżej).
