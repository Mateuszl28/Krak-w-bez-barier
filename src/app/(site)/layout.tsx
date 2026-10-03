import Link from "next/link";
import { Nav } from "@/components/Nav";
import { ProfileProvider } from "@/components/ProfileProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
  <>
      <a className="skip-link" href="#tresc">
        Przejdź do treści
      </a>
      <header className="site-header">
        <div className="inner">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden="true">
              ♿
            </span>
            Kraków bez barier
          </Link>
          <Nav />
        </div>
      </header>
      <ProfileProvider>
        <main id="tresc" tabIndex={-1}>
          {children}
        </main>
      </ProfileProvider>
      <footer className="site-footer">
        <div className="inner">
          <p>
            Dane mapy i miejsc: ©{" "}
            <a href="https://www.openstreetmap.org/copyright">współtwórcy OpenStreetMap</a> (ODbL). Informacje o
            dostępności pochodzą z różnych źródeł i nie stanowią formalnego zapewnienia dostępności — przy każdej
            podajemy źródło, datę i poziom wiarygodności.
          </p>
          <p>
            <Link href="/o-projekcie#dostepnosc">Deklaracja dostępności</Link> ·{" "}
            <Link href="/o-projekcie#prywatnosc">Prywatność</Link> ·{" "}
            <a href="https://github.com/Mateuszl28/Krak-w-bez-barier">Kod źródłowy</a>
          </p>
        </div>
      </footer>
    </>
  );
}
