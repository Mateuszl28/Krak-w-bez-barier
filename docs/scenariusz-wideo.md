# Dostępnik — scenariusz filmu demo (2:14)

Gotowa wersja robocza (lektor syntetyczny, nagrania ekranu z telefonu, napisy wtopione w obraz) powstaje z tego scenariusza.
Lepiej brzmi nagranie lektora ludzkim głosem — tekst poniżej mieści się w czasie scen.

| # | Czas | Obraz | Ekran aplikacji |
|---|---|---|---|
| 1 | 0:00 | Plansza: „Czy tam wjadę?” | `—` |
| 2 | 0:18 | Profil: Wózek dziecięcy → elektryczny → ręczny, szczegółowe wymagania | `bezbarier://profil` |
| 3 | 0:31 | Wyszukiwanie „toaleta”, wyniki z oceną | `bezbarier://` |
| 4 | 0:43 | Karta toalety przy pętli Rakowicka: wymagania, cechy, źródła | `bezbarier://miejsce/krk-wc-11` |
| 5 | 1:02 | Rozwinięcie sprzecznych danych (OSM 2026 vs miasto 2023), „Zgłoś zmianę” | `bezbarier://miejsce/krk-wc-11` |
| 6 | 1:15 | Trasa Bulwar Czerwieński → Wawel: wymagania, ławki, mapa, nawierzchnia | `bezbarier://trasa?fromLat=50.0510&fromLon=19.9340&toLat=50.0545&toLon=19.9355` |
| 7 | 1:31 | Asystent: podpowiedź „Teatr Bagatela → Sukiennice”, odpowiedź ze źródłami | `bezbarier://asystent` |
| 8 | 1:43 | Zakładka Źródła i metoda: OSM, ZTP, MSIP, deklaracje, zgłoszenia | `bezbarier://zrodla` |
| 9 | 1:55 | Plansza końcowa: Dostępnik, WCAG 2.2 AA, PL/EN, repozytorium | `—` |

## Narracja

**1 (0:00)** Czy tam wjadę? To pytanie zadaje sobie każda osoba na wózku i każdy rodzic z wózkiem dziecięcym. Etykieta „dostępne” nie wystarcza. W Krakowie tylko pięć procent miejsc ma w danych szczegóły o wejściu, progach czy toalecie. Dlatego powstał Dostępnik.

**2 (0:18)** Dostępnik zaczyna od Twoich potrzeb. Wybierasz wózek ręczny, elektryczny lub dziecięcy, albo ustawiasz własne progi. Nie pytamy o niepełnosprawność, a profil zostaje na telefonie.

**3 (0:31)** Wyszukujesz miejsce i od razu widzisz ocenę pod swój profil: spełnia wymagania, są bariery, albo brakuje danych. Brak danych nigdy nie jest pokazywany jako dostępne.

**4 (0:43)** Na karcie miejsca każde wymaganie ma osobny wynik, a każda informacja ma źródło i datę. Toaleta przy pętli Rakowicka: według miasta z dwa tysiące dwudziestego trzeciego roku jest dostępna, według OpenStreetMap z tego roku nie. Nie rozstrzygamy za użytkownika. Pokazujemy obie wersje.

**5 (1:02)** Każdy może jednym dotknięciem potwierdzić, że informacja jest aktualna, albo zgłosić zmianę. Zgłoszenia i deklaracje właścicieli przechodzą moderację i są oznaczone jako niezweryfikowane.

**6 (1:15)** Trasy oceniamy tak samo. Najkrótsza droga z Bulwaru Czerwieńskiego na Wawel prowadzi przez sto jedenaście stopni. Aplikacja wybiera wariant bez schodów, z ławkami po drodze, i mówi wprost, czego nie wie, na przykład o krawężnikach.

**7 (1:31)** Można też po prostu zapytać. Asystent AI korzysta wyłącznie z danych aplikacji. Gdy usługa AI jest niedostępna, odpowiada tryb awaryjny oparty na regułach.

**8 (1:43)** W zakładce źródeł widać, skąd pochodzą dane: OpenStreetMap oraz otwarte dane Krakowa z ZTP i MSIP. Gdy źródło nie działa, pokazujemy ostatnią kopię z datą.

**9 (1:55)** Aplikacja spełnia WCAG 2.2 AA, działa po polsku i angielsku, a Warszawę dodaliśmy jednym plikiem konfiguracyjnym. Dla ludzi jest bezpłatna. Płacą obiekty, platformy rezerwacyjne i miasta. Dostępnik. Sprawdź, zanim pojedziesz.

## Uwagi do nagrania

- Telefon w trybie demo paska stanu (stała godzina, bez powiadomień) — prywatne powiadomienia nie trafiają do kadru.
- Polskich znaków nie da się wpisać przez `adb input text`; w scenie asystenta użyta jest gotowa podpowiedź.
- Profil wózka ręcznego; nic nie jest wysyłane (formularz zgłoszenia tylko pokazany).
