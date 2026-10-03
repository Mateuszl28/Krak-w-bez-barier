import { assessStop } from "@/lib/assess";
import { formatDate } from "@/lib/labels";
import type { NearbyStop, Profile, Source } from "@/lib/model";
import { OUTCOME_ICON, OUTCOME_LABEL, VerdictBadge } from "./Verdict";

const MODE: Record<NearbyStop["mode"], string> = { bus: "autobus", tram: "tramwaj", bus_tram: "autobus i tramwaj" };

// Dojście do miejsca od najbliższych przystanków — wsiadanie, peron, odpoczynek.
export function StopsSection({
  stops,
  profile,
  sources,
}: {
  stops: NearbyStop[];
  profile: Profile;
  sources: Record<string, Source>;
}) {
  return (
    <section aria-labelledby="dojazd-h">
      <h2 id="dojazd-h">Dojazd komunikacją miejską</h2>
      {stops.length === 0 ? (
        <p>Brak przystanków w promieniu 600 m w danych ZTP.</p>
      ) : (
        <>
          <p className="lead">
            Najbliższe przystanki i to, jak się z nich wsiada i wysiada. Odległość w linii prostej — przebieg i
            nawierzchnia chodnika na dojściu nie są jeszcze oceniane.
          </p>
          <ul className="reqs">
            {stops.map((s) => {
              const a = assessStop(s, profile);
              return (
                <li key={s.id} style={{ gridTemplateColumns: "1fr" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <span className="label">
                        {s.name} · {MODE[s.mode]} · ok. {s.distanceM} m
                      </span>
                      <VerdictBadge verdict={a.verdict} />
                    </div>
                    {[a.boarding, a.platform].map((r) => (
                      <div key={r.id} className="detail">
                        <span className={`o-${r.outcome}`} aria-hidden="true">
                          {OUTCOME_ICON[r.outcome]}{" "}
                        </span>
                        <strong>{r.label}</strong> ({OUTCOME_LABEL[r.outcome]}): {r.detail}
                      </div>
                    ))}
                    <div className="detail">
                      <strong>Odpoczynek:</strong>{" "}
                      {a.rest
                        ? [s.shelters ? `wiata (${s.shelters})` : "", s.benches ? `ławki (${s.benches})` : ""]
                            .filter(Boolean)
                            .join(", ")
                        : "brak wiaty i ławek"}
                    </div>
                    <div className="src" style={{ color: "var(--muted)", fontSize: "0.93rem" }}>
                      Źródło: {sources[s.sourceId]?.name ?? s.sourceId}
                      {s.observedAt ? ` · stan na ${formatDate(s.observedAt)}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
