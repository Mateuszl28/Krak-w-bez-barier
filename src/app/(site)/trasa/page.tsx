import type { Metadata } from "next";
import { RouteView } from "@/components/RouteView";

export const metadata: Metadata = { title: "Trasa dojścia" };

function point(lat?: string, lon?: string): [number, number] | null {
  const a = Number(lat), b = Number(lon);
  return Number.isFinite(a) && Number.isFinite(b) && lat && lon ? [a, b] : null;
}

export default async function RoutePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const from = point(sp.fromLat, sp.fromLon);
  const to = point(sp.toLat, sp.toLon);
  if (!from || !to) {
    return (
      <>
        <h1>Trasa dojścia</h1>
        <p>Wybierz miejsce i przystanek startowy na karcie miejsca, aby ocenić trasę dojścia.</p>
      </>
    );
  }
  return (
    <>
      <p>
        <a href={sp.toId ? `/miejsce/${encodeURIComponent(sp.toId)}` : "/"}>← Wróć do miejsca</a>
      </p>
      <RouteView from={from} to={to} fromName={sp.fromName ?? "Start"} toName={sp.toName ?? "Cel"} awaria={sp.awaria} />
    </>
  );
}
