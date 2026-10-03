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

## Aplikacja mobilna

Główną formą rozwiązania jest **aplikacja mobilna na Androida i iOS** (`mobile/`, Expo + React Native). Korzysta z tego
samego modelu danych i tej samej logiki oceny co serwer (`src/lib` jest współdzielone), a dane pobiera z API backendu.

- Profil potrzeb zapisywany tylko na telefonie, wyszukiwanie, „najbliższe mnie” (GPS), lista i mapa OSM.
- Karta miejsca z oceną wymagań, źródłami i datami, przycisk „Prowadź do miejsca” (otwiera nawigację w telefonie).
- Zgłaszanie poprawek, sprawdzenie obiektu na żywo w OSM.
- Offline: ostatnio pobrane wyniki są zapisywane na telefonie i pokazywane z datą i ostrzeżeniem.
- Tryb demonstracyjny awarii źródła (ekran „Źródła i metoda”).
- Dostępność: role i etykiety dla TalkBack/VoiceOver, skalowanie tekstu systemowego, cele dotykowe ≥ 48 dp, tryb ciemny.
- **Polski i angielski** (dla turystów): język według ustawień telefonu, przełącznik w zakładce „Potrzeby”.
  Komunikaty oceny są we wspólnym module `src/lib/i18n.ts` — web, aplikacja i API mówią tak samo.

Uruchomienie na telefonie z Androidem podłączonym przez USB:

```bash
npm run build && npx next start -p 3100     # backend (API + dane)
adb reverse tcp:3100 tcp:3100               # telefon widzi backend pod localhost:3100
cd mobile && npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
adb install -r app/build/outputs/apk/release/app-release.apk
```

Adres backendu w buildzie produkcyjnym ustawia się zmienną `EXPO_PUBLIC_API_URL`.

Backend (Next.js) importuje dane, udostępnia API, przyjmuje zgłoszenia i serwuje widżet dla firm oraz wersję webową.

## Co działa

- Wyszukiwarka miejsc z oceną dopasowania do profilu: **spełnia / bariery / niepełne dane**.
  Brak informacji **nigdy** nie jest traktowany jako potwierdzenie dostępności.
- Karta miejsca: wynik dla każdego wymagania + wszystkie informacje ze źródłem, datą i linkiem do rekordu.
- Oznaczenia: potwierdzone przez kilka źródeł, niezweryfikowane (zgłoszenia), może być nieaktualne (> 2 lata),
  sprzeczne dane (pokazujemy wszystkie wersje).
- Zgłaszanie poprawek (anonimowe, walidowane, z limitem) — widoczne od razu jako niezweryfikowane.
- **„Czy to nadal aktualne?”** przy każdej informacji: odwiedzający potwierdza jednym dotknięciem albo — przy
  sprzecznych danych — wskazuje prawdziwą wersję. Potwierdzenie z niezależnego źródła daje status „potwierdzone”.
- **Deklaracja właściciela obiektu** (`/dla-firm/deklaracja/<id>`): formularz dla hotelu, muzeum, organizatora.
  Do czasu weryfikacji pokazywana jako „oczekująca na weryfikację” (niezweryfikowana), po wysłaniu — gotowy kod
  widżetu do osadzenia.
- **Panel moderacji** (`/moderacja`, hasło w zmiennej `ADMIN_PASSWORD`, bez niej panel jest wyłączony):
  weryfikacja i odrzucanie deklaracji właścicieli, usuwanie spamu ze zgłoszeń. Zweryfikowana deklaracja przechodzi
  ze źródła „oczekujące na weryfikację” do „deklaracje właścicieli” z datą weryfikacji.
- **Wiele miast:** Kraków (OSM + dane ZTP) i Warszawa (OSM: 7258 miejsc, sieć piesza centrum — 13 260 odcinków, 1559 krawężników) — drugie miasto dodane wyłącznie plikiem
  `data/warszawa/city.json` i importem, bez zmian w kodzie. Wybór miasta w aplikacji, `GET /api/v1/cities`.
- Sprawdzenie obiektu na żywo w OpenStreetMap z obsługą niedostępności źródła.
- Widżet do osadzenia na stronie hotelu / wydarzenia (`/widget/<id>`, działa bez JavaScriptu).
- Publiczne API z oceną dopasowania (`/api/v1/places`).
- Mapa (Leaflet + OSM) jako **dodatek** — te same informacje są w liście i na karcie miejsca.
- **Asystent AI (Google Gemini)** — zakładka „Asystent” w aplikacji, `POST /api/v1/assistant`. Użytkownik pisze
  własnymi słowami („jadę wózkiem z przystanku Teatr Bagatela do Sukiennic, potrzebuję toalety”), a model ustala
  wymagania i wywołuje nasze narzędzia: wyszukiwanie miejsc i przystanków, udogodnienia w pobliżu, szczegóły miejsca
  ze źródłami, ocenę trasy. **Wszystkie fakty pochodzą z narzędzi** — model nie ma własnej wiedzy o dostępności i ma
  zakaz traktowania braku danych jako dostępności. Odpowiedź ma przyciski „Pokaż trasę” i „Zastosuj te wymagania”.
  Klucz `GEMINI_API_KEY` tylko na serwerze. Przy limicie lub przeciążeniu Gemini — zapasowe modele Flash-Lite.
  **Tryb awaryjny bez AI** (`src/lib/assistant-fallback.ts`): gdy AI jest niedostępne (brak klucza, limit, awaria),
  reguły rozpoznają profil, potrzeby oraz start i cel („z X do Y”, „do Y z X”, „startuję z X”, samo miejsce), a
  odpowiedź powstaje z tych samych narzędzi — z wyraźną informacją, że to tryb awaryjny.
- **Ocena trasy dojścia** (`GET /api/v1/route`, ekran „Trasa dojścia” w aplikacji): od przystanku albo z lokalizacji
  użytkownika do miejsca. Warianty trasy z dwóch publicznych serwisów (OSRM — profil pieszy, Valhalla — tryb wózka)
  są dopasowywane do sieci pieszej OSM (14 676 odcinków centrum Krakowa, 76% z nawierzchnią; 713 krawężników) i
  oceniane pod profil: schody, krawężniki, nawierzchnia (metry bruku / żwiru / bez danych), nachylenie. Wybieramy
  wariant z najmniejszą liczbą barier — np. Bulwar Czerwieński → Wawel: zamiast 111 stopni trasa 1287 m bez schodów.
  Odcinki bez danych liczone osobno i pokazane na mapie przerywaną linią; awaria routingu → komunikat, reszta działa.
- **Dojazd:** najbliższe przystanki KMK przy każdym miejscu z oceną wsiadania (peron Kassel / zwykły krawężnik /
  wsiadanie z jezdni), nawierzchni peronu i miejsc odpoczynku (wiaty, ławki) — z inwentaryzacji ZTP.
- PWA: instalacja na telefonie, podstawowe działanie przy słabym zasięgu.

## Źródła danych

| Źródło | Co dostarcza | Pobieranie | Licencja |
|---|---|---|---|
| OpenStreetMap (Overpass API) | ~3300 miejsc w centrum Krakowa, tagi `wheelchair`, `toilets:wheelchair`, `changing_table`, `step_count`, `door:width`, `ramp`, `surface` | `npm run ingest` (kilka serwerów zapasowych) | ODbL 1.0 |
| OSM API | aktualny stan pojedynczego obiektu | na żądanie z karty miejsca | ODbL 1.0 |
| Otwarte dane Krakowa — ZTP: [Toalety publiczne](https://services-eu1.arcgis.com/svTzSt3AvH7sK6q9/arcgis/rest/services/Toalety_publiczne_4/FeatureServer/0) | 50 toalet: dostępność, sposób wjazdu (poziom 0 / platforma / winda / schodołaz), przewijak, godziny | `npm run ingest:official` | dane publiczne GMK, z podaniem źródła |
| Otwarte dane Krakowa — ZTP: [Miejsca postojowe OzN](https://services-eu1.arcgis.com/svTzSt3AvH7sK6q9/arcgis/rest/services/Miejsca_postojowe_OZN/FeatureServer/0) | 2037 miejsc postojowych; przypisujemy je miejscom w promieniu 150 m | `npm run ingest:official` | dane publiczne GMK, z podaniem źródła |
| Otwarte dane Krakowa — ZTP: [Przystanki KMK](https://services-eu1.arcgis.com/svTzSt3AvH7sK6q9/arcgis/rest/services/Przystanki_Komunikacji_Miejskiej_w_Krakowie/FeatureServer/0) | 3756 przystanków: krawężnik peronowy (Kassel / zwykły / brak), nawierzchnia peronu, wiaty, ławki | `npm run ingest:official` | dane publiczne GMK, z podaniem źródła |
| Deklaracje właścicieli | szczegółowe dane od zarządcy obiektu (zweryfikowane / oczekujące na weryfikację) | formularz `/dla-firm/deklaracja/<id>` / `accessibility.json` | CC BY 4.0 |
| Zgłoszenia użytkowników | obserwacje odwiedzających | formularz na karcie miejsca | CC BY 4.0 |

| OpenStreetMap — sieć piesza (Overpass API) | chodniki, schody (`highway=steps`, `step_count`), nawierzchnia (`surface`, `footway:surface`), nachylenie (`incline`), krawężniki (`kerb`) | `npm run ingest:paths` | ODbL 1.0 |
| OSRM (routing.openstreetmap.de) i Valhalla (valhalla1.openstreetmap.de) | geometria tras pieszych / dla wózka | na żądanie | dane ODbL, usługi FOSSGIS — limity uczciwego użycia |

Sprawdzone, ale nieużyte: GTFS ZTP (pola `wheelchair_boarding` / `wheelchair_accessible` są puste), dane.gov.pl
(brak zbiorów UMK o dostępności).

**Aktualność i wiarygodność.** Data przy informacji to: `check_date` lub data ostatniej edycji obiektu (OSM), data
ostatniej edycji rekordu u wydawcy (dane miejskie), data deklaracji lub zgłoszenia. Informacje starsze niż 2 lata są
oznaczane. Zgodność co najmniej dwóch niezależnych źródeł daje status „potwierdzone”; rozbieżność — „sprzeczne dane”.

**Automatyczna aktualizacja.** Workflow GitHub Actions (`.github/workflows/update-data.yml`) codziennie pobiera
dane z OSM (miejsca i sieć piesza) i otwarte dane Krakowa, uruchamia testy i zapisuje zmiany w repozytorium —
bez ręcznego utrzymywania bazy. Każde źródło jest osobnym krokiem; awaria jednego nie blokuje pozostałych.

**Niedostępność źródła.** Importy zapisują kopię z datą i przy błędzie zostawiają poprzednią. Gdy źródła nie da się
wczytać, aplikacja to komunikuje i nie pokazuje miejsc jako „bez barier”. Demo: `/?awaria=osm`,
`/miejsce/<id>?awaria=osm`.

**Tylko realne obiekty.** Aplikacja nie zawiera fikcyjnych miejsc ani zmyślonych danych. Konflikty i
potwierdzenia pokazujemy na prawdziwych danych: ten sam obiekt w danych miejskich i w OSM łączymy w jeden
(28 z 50 toalet publicznych ma odpowiednik w OSM). Przykłady: `/miejsce/krk-wc-11` — sprzeczne dane (miasto:
toaleta dostępna, OSM: niedostępna), `/miejsce/krk-wc-7` — sprzeczne dane o przewijaku w Sukiennicach,
`/miejsce/krk-wc-12` — dostępność i przewijak potwierdzone przez dwa źródła. Oznaczanie danych przykładowych
pozostaje w kodzie na wypadek ich użycia (np. w szkoleniach), ale nie jest używane.

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

## Uruchomienie i utrzymanie poza infrastrukturą UMK

| Obszar | Kto odpowiada | Jak |
|---|---|---|
| Produkt i rozwój | zespół projektu (docelowo spółka / fundacja prowadząca usługę) | roadmapa, wdrożenia w kolejnych miastach |
| Hosting | operator usługi | backend: Vercel lub dowolny serwer Node.js / kontener; baza zgłoszeń: PostgreSQL (np. Supabase, Neon) |
| Aktualizacje danych | automatycznie | codzienny import OSM i danych miejskich (cron), przy błędzie zostaje ostatnia kopia z datą |
| Bezpieczeństwo | operator usługi | HTTPS, walidacja i limity zgłoszeń, brak danych osobowych, aktualizacje zależności, kopie zapasowe bazy |
| Obsługa zgłoszeń | moderator operatora + właściciele obiektów | kolejka zgłoszeń, potwierdzanie przez inne źródło, przekazywanie poprawek do OSM |
| Aplikacja mobilna | operator usługi | publikacja w Google Play / App Store przez EAS, aktualizacje OTA |

**Szacunkowe koszty miesięczne (jedno miasto):** hosting backendu 0–20 USD (Vercel Hobby/Pro), baza danych 0–25 USD,
konta deweloperskie Google Play 25 USD jednorazowo i Apple 99 USD rocznie, kafelki mapy — przy większym ruchu własny
serwer kafelków lub dostawca komercyjny (OSM nie pozwala na intensywne korzystanie z tile.openstreetmap.org). Koszty
pokrywają abonamenty obiektów i API (patrz „Model biznesowy”).

Rozwiązanie nie wymaga dostępu do wewnętrznych systemów UMK ani MJO i nie zakłada ręcznego utrzymywania bazy przez
Miasto — korzysta wyłącznie z publicznych danych i usług.

## Zależności, licencje, przenośność

- **Zewnętrzni dostawcy danych:** OpenStreetMap (Overpass API, OSM API — ODbL, wymagane oznaczenie źródła),
  ArcGIS Online ZTP Kraków (dane publiczne GMK, z podaniem źródła i daty pobrania), kafelki mapy OSM.
  Każde źródło może być niedostępne — aplikacja działa wtedy na ostatniej kopii i informuje o tym użytkownika.
- **Komponenty:** Next.js, React, Leaflet, Expo / React Native — licencje MIT / BSD. Kod projektu: MIT.
- **Przenośność:** backend to zwykła aplikacja Node.js (bez zależności od konkretnej chmury), dane w plikach JSON lub
  bazie SQL, aplikacja mobilna budowana lokalnie albo w EAS.
- **Kolejne miasto:** katalog `data/<miasto>/city.json` (granice obszaru, lista źródeł) → `npm run ingest -- <miasto>`
  pobiera OSM automatycznie; lokalne otwarte dane — nowy adapter zwracający te same typy co
  `src/lib/krakow-official.ts`.

## Dostępność cyfrowa (cel: WCAG 2.2 AA)

Obsługa klawiaturą i widoczny fokus, link „Przejdź do treści”, semantyczne nagłówki i etykiety, komunikaty
`aria-live` o wynikach, kontrast ≥ 4.5:1 w trybie jasnym i ciemnym, stan nigdy nie tylko kolorem, cele dotykowe ≥ 44 px,
tekstowa alternatywa dla mapy. W aplikacji mobilnej: role i etykiety dla TalkBack/VoiceOver, skalowanie tekstu
systemowego, cele dotykowe ≥ 48 dp.

### Kontrola dostępności głównego scenariusza (3 października 2026)

| Sprawdzenie | Jak | Wynik |
|---|---|---|
| Automatyczny test WCAG 2.2 A/AA | axe-core 4.10 na: wyszukiwarce (lista), karcie miejsca, źródłach, widżecie | 0 naruszeń |
| Widok mapy | axe-core | początkowo `target-size` (nakładające się znaczniki) → naprawione grupowaniem znaczników; ponowny test: 0 naruszeń |
| Klawiatura | przejście Tab przez nagłówek, profil (strzałki), wyszukiwarkę, wyniki | wszystkie elementy osiągalne, fokus widoczny (3 px), logiczna kolejność |
| Czytnik ekranu | nazwy dostępne (etykiety pól, role, `aria-live` dla liczby wyników, opisy ocen) | komunikaty o wynikach i ocenach odczytywane tekstem |
| Kontrast | tokeny kolorów jasny / ciemny | tekst ≥ 4.5:1, elementy interfejsu ≥ 3:1 |
| Strony trasy i asystenta (web) | axe-core | 0 naruszeń (także po udzieleniu odpowiedzi przez asystenta) |
| Aplikacja mobilna — nazwy dla czytnika ekranu | automatyczny audyt drzewa dostępności (uiautomator) na 8 ekranach: wyszukiwarka, wyniki, asystent, potrzeby, info, karta miejsca, zgłoszenie | 99 elementów klikalnych — wszystkie z nazwą dostępną |
| Aplikacja mobilna — cele dotykowe | ten sam audyt, próg 44 dp | początkowo 2 przełączniki 47×27 dp → cały wiersz z opisem jako przełącznik (≥ 52 dp) |
| Mapa w formie tekstowej | lista wyników + karta miejsca zawierają wszystkie informacje z mapy | spełnione |

**Ograniczenia i plan:** wersja angielska jest w aplikacji mobilnej (wersja webowa — po polsku, do tłumaczenia);
brak testów z użytkownikami (osoby na wózkach, rodzice z
wózkami, użytkownicy czytników ekranu) → sesje testowe przed wdrożeniem; ręczny test z włączonym TalkBack/VoiceOver
na urządzeniach → przed publikacją w sklepach.

## Prywatność i bezpieczeństwo

Nie zbieramy informacji o niepełnosprawności ani danych osobowych. Profil i lokalizacja zostają w przeglądarce.
Asystent AI: treść pytania (i lokalizacja — tylko gdy użytkownik ją włączy) jest wysyłana do Google Gemini w celu
wygenerowania odpowiedzi; serwer nie zapisuje rozmów, a aplikacja informuje o tym pod polem pytania. W wersji
produkcyjnej: płatny poziom Gemini API (dane nie są używane do trenowania modeli) albo model uruchamiany lokalnie.
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
