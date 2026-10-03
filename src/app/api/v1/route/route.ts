import { NextResponse } from "next/server";
import { PRESETS } from "@/lib/labels";
import { cityFrom, profileFrom } from "@/lib/request";
import { planRoute } from "@/lib/routing";

// Trasa dojścia oceniona pod profil użytkownika (zob. src/lib/routing.ts).
function point(raw: string | null): [number, number] | null {
  const m = raw?.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const from = point(params.get("from"));
  const to = point(params.get("to"));
  if (!from || !to) return NextResponse.json({ error: "Podaj from=lat,lon i to=lat,lon." }, { status: 400 });
  const plan = await planRoute(from, to, profileFrom(params) ?? PRESETS.wheelchair_manual, {
    city: cityFrom(params),
    locale: params.get("lang") === "en" ? "en" : "pl",
    simulateOutage: params.get("awaria")?.includes("routing"),
  });
  if (!plan.ok) return NextResponse.json({ error: plan.error, detail: plan.detail }, { status: plan.status });
  const { ok: _ok, ...body } = plan;
  return NextResponse.json(body);
}
