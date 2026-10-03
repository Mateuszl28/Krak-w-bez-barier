"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { VERDICT_TEXT, type RequirementResult, type Verdict } from "@/lib/assess";
import { LABELS, formatDate } from "@/lib/labels";
import { useProfile } from "./ProfileProvider";
import { OUTCOME_ICON, OUTCOME_LABEL, VERDICT_ICON } from "./Verdict";

const RouteMap = dynamic(() => import("./RouteMap"), { ssr: false, loading: () => <p>Ładowanie mapy…</p> });

export interface RouteData {
  route: {
    verdict: Verdict;
    distanceM: number;
    requirements: RequirementResult[];
    surfaces: Record<string, number>;
    coverage: number;
    segments: { kind: "ok" | "warn" | "barrier" | "unknown"; coords: [number, number][] }[];
    dataDate: string;
  };
  alternatives: number;
  insideDataArea: boolean;
  sources: { routing: string; paths: string };
}

const ROUTE_TITLE: Record<Verdict, string> = {
  meets: "Trasa bez barier dla Ciebie",
  barrier: "Bariery na trasie",
  incomplete: "Niepełne dane o trasie",
};

export const SEGMENT_LABEL = { ok: "bez utrudnień", warn: "utrudnienie", barrier: "bariera", unknown: "brak danych" };

// Ocena trasy dojścia (wersja webowa) — te same dane i API co aplikacja mobilna.
export function RouteView({
  from,
  to,
  fromName,
  toName,
  awaria,
}: {
  from: [number, number];
  to: [number, number];
  fromName: string;
  toName: string;
  awaria?: string;
}) {
  const { profile } = useProfile();
  const [data, setData] = useState<RouteData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setData(null);
    setError("");
    const p = new URLSearchParams({
      from: `${from[0]},${from[1]}`,
      to: `${to[0]},${to[1]}`,
      maxStep: String(profile.maxStepCm),
      minDoor: String(profile.minDoorCm),
      avoidCobbles: profile.avoidCobbles ? "1" : "0",
    });
    if (awaria) p.set("awaria", awaria);
    fetch(`/api/v1/route?${p}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? `HTTP ${r.status}`);
        setData(body);
      })
      .catch((e: Error) => setError(e.message));
  }, [from, to, profile, awaria]);

  return (
    <>
      <h1>
        Trasa dojścia: {fromName} → {toName}
      </h1>
      {!data && (
        <p role="status" aria-live="polite" className="lead">
          {error || "Wyznaczam i oceniam trasę…"}
        </p>
      )}
      {error && (
        <div className="banner" role="alert">
          <strong>Nie udało się wyznaczyć trasy</strong>
          {error}
        </div>
      )}
      {data && <RouteResult data={data} />}
    </>
  );
}

function RouteResult({ data }: { data: RouteData }) {
  const r = data.route;
  const total = Object.values(r.surfaces).reduce((a, b) => a + b, 0) || 1;
  return (
    <>
      <p className="lead">
        {r.distanceM} m · ok. {Math.max(1, Math.round(r.distanceM / 60))} min
      </p>
      <section aria-labelledby="route-verdict" className={`verdict-card v-${r.verdict}`}>
        <h2 id="route-verdict">
          <span aria-hidden="true">{VERDICT_ICON[r.verdict]} </span>
          {ROUTE_TITLE[r.verdict]}
        </h2>
        <p>{VERDICT_TEXT[r.verdict].body}</p>
      </section>
      {!data.insideDataArea && (
        <div className="banner">
          <strong>Część trasy leży poza obszarem z danymi o chodnikach</strong>
          Ocena jest niepełna.
        </div>
      )}
      <ul className="reqs">
        {r.requirements.map((q) => (
          <li key={q.id}>
            <span className={`mark o-${q.outcome}`} aria-hidden="true">
              {OUTCOME_ICON[q.outcome]}
            </span>
            <div>
              <div className="label">
                {q.label}: <span className={`o-${q.outcome}`}>{OUTCOME_LABEL[q.outcome]}</span>
              </div>
              <div className="detail">{q.detail}</div>
            </div>
          </li>
        ))}
      </ul>
      <p className="lead" style={{ marginTop: 8 }}>
        Sprawdziliśmy {data.alternatives} {data.alternatives === 1 ? "wariant" : "warianty"} trasy i wybraliśmy ten z
        najmniejszą liczbą barier.
      </p>

      <h2>Mapa trasy</h2>
      <p className="lead">Opis odcinków jest dostępny powyżej w formie tekstowej.</p>
      <RouteMap segments={r.segments} />
      <ul style={{ display: "flex", gap: 16, flexWrap: "wrap", listStyle: "none", padding: 0 }}>
        {(Object.keys(SEGMENT_LABEL) as (keyof typeof SEGMENT_LABEL)[]).map((k) => (
          <li key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span
              aria-hidden="true"
              style={{
                width: 22,
                height: 6,
                borderRadius: 3,
                background: { ok: "#0b6b2e", warn: "#b35c00", barrier: "#a4161a", unknown: "#6b6b6b" }[k],
              }}
            />
            {SEGMENT_LABEL[k]}
          </li>
        ))}
      </ul>

      <h2>Nawierzchnia na trasie</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Nawierzchnia</th>
              <th scope="col">Długość</th>
              <th scope="col">Udział</th>
            </tr>
          </thead>
          <tbody>
            {["smooth", "paving", "cobblestone", "gravel", "unknown"]
              .filter((k) => r.surfaces[k])
              .map((k) => (
                <tr key={k}>
                  <td>{k === "unknown" ? "bez danych" : LABELS.pl.enums[k]}</td>
                  <td>{r.surfaces[k]} m</td>
                  <td>{Math.round((r.surfaces[k] / total) * 100)}%</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="lead">Dane o nawierzchni dla {Math.round(r.coverage * 100)}% trasy.</p>

      <h2>Źródła</h2>
      <p>{data.sources.routing}</p>
      <p>
        {data.sources.paths} ({formatDate(r.dataDate)})
      </p>
    </>
  );
}
