import type { Source } from "./model.ts";

// Rejestr źródeł. Dodanie źródła = wpis tutaj + adapter, który zwraca fakty
// we wspólnym modelu (zob. src/lib/osm.ts, src/lib/repository.ts).
export const SOURCES: Record<string, Source> = {
  osm: {
    id: "osm",
    name: "OpenStreetMap",
    kind: "community",
    url: "https://www.openstreetmap.org/",
    license: "ODbL 1.0 — © współtwórcy OpenStreetMap",
    updateFrequency: "Import codziennie (Overpass API); pojedyncze miejsce odświeżane na żądanie (OSM API)",
    description:
      "Dane społeczności mapującej. Data przy informacji to data ostatniego sprawdzenia (check_date) lub ostatniej edycji obiektu.",
  },
  krakow_open_data: {
    id: "krakow_open_data",
    name: "Otwarte dane Krakowa (ZTP / GMK)",
    kind: "official",
    url: "https://otwartedane.um.krakow.pl/",
    license: "Dane publiczne Gminy Miejskiej Kraków — wykorzystanie z podaniem źródła i daty pobrania",
    updateFrequency: "Import codziennie z ArcGIS ZTP; data przy informacji = data ostatniej edycji rekordu u wydawcy",
    description:
      "Toalety publiczne (dostępność, sposób wjazdu, przewijak), inwentaryzacja miejsc postojowych dla osób z niepełnosprawnościami oraz przystanków (perony, wiaty, ławki).",
  },
  msip: {
    id: "msip",
    name: "Miejski System Informacji Przestrzennej Krakowa (MSIP)",
    kind: "official",
    url: "https://msip.krakow.pl/",
    license: "Dane publiczne Gminy Miejskiej Kraków — warunki ponownego wykorzystania nie są określone w usłudze; podajemy źródło",
    updateFrequency: "Import codziennie z usług ArcGIS MSIP (warstwy Obserwatorium)",
    description:
      "Miejskie instytucje kultury (lokalizacja, strona, BIP) oraz obiekty sportowe dla osób z niepełnosprawnościami.",
  },
  owner_declarations: {
    id: "owner_declarations",
    name: "Deklaracje właścicieli obiektów",
    kind: "owner",
    url: "/o-projekcie#deklaracje",
    license: "Udostępniane przez właściciela na licencji CC BY 4.0",
    updateFrequency: "Na bieżąco; deklaracja wygasa po 12 miesiącach bez potwierdzenia",
    description:
      "Informacje przekazane przez zarządcę obiektu (hotel, muzeum, organizator wydarzenia) przez formularz lub plik accessibility.json na jego stronie.",
  },
  owner_pending: {
    id: "owner_pending",
    name: "Deklaracje właścicieli — oczekujące na weryfikację",
    kind: "user_report",
    url: "/dla-firm",
    license: "CC BY 4.0",
    updateFrequency: "Na bieżąco",
    description:
      "Deklaracja przysłana formularzem przez osobę reprezentującą obiekt. Do czasu weryfikacji (np. kontakt z obiektem, zdjęcia, potwierdzenie przez odwiedzających) traktowana jak informacja niezweryfikowana.",
  },
  user_reports: {
    id: "user_reports",
    name: "Zgłoszenia użytkowników",
    kind: "user_report",
    url: "/o-projekcie#zgloszenia",
    license: "CC BY 4.0",
    updateFrequency: "Na bieżąco",
    description:
      "Obserwacje odwiedzających. Pokazywane jako niezweryfikowane do czasu potwierdzenia przez innego użytkownika, właściciela lub moderatora.",
  },
};
