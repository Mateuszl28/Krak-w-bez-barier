import { formatDate } from "@/lib/labels";
import type { Source, SourceStatus } from "@/lib/model";

// Informuje o niedostępnych źródłach i wieku kopii danych. Gdy źródło nie
// odpowiada, użytkownik widzi to wprost — brak danych nie wygląda jak "brak barier".
export function SourceStatusBanner({
  status,
  sources,
}: {
  status: SourceStatus[];
  sources: Record<string, Source>;
}) {
  const down = status.filter((s) => !s.ok);
  const osm = status.find((s) => s.sourceId === "osm" && s.ok && s.fetchedAt);
  if (down.length === 0 && !osm) return null;
  return (
    <div className={`banner ${down.length ? "" : "info"}`} role={down.length ? "alert" : undefined}>
      {down.length > 0 && (
        <>
          <strong>Część źródeł jest teraz niedostępna</strong>
          <p style={{ margin: 0 }}>
            Nie wyświetlamy informacji z: {down.map((s) => sources[s.sourceId]?.name ?? s.sourceId).join(", ")}.
            Miejsca z tych źródeł mogą mieć niepełne dane — brak informacji nie oznacza braku barier.
          </p>
        </>
      )}
      {osm && down.length === 0 && (
        <p style={{ margin: 0, fontSize: "0.95rem" }}>
          Dane OpenStreetMap z dnia {formatDate(osm.fetchedAt!)} ({osm.records} miejsc). Szczegóły w{" "}
          <a href="/o-projekcie">źródłach i metodzie</a>.
        </p>
      )}
    </div>
  );
}
