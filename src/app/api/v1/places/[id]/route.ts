import { NextResponse } from "next/server";
import { assess } from "@/lib/assess";
import { loadCity, nearbyStops } from "@/lib/repository";
import { cityFrom, offlineFrom, profileFrom } from "@/lib/request";
import { SOURCES } from "@/lib/sources";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const query = new URL(req.url).searchParams;
  const city = await loadCity(cityFrom(query), offlineFrom(query)).catch(() => null);
  if (!city) return NextResponse.json({ error: "Nieznane miasto" }, { status: 404 });
  const place = city.byId.get(id);
  if (!place) return NextResponse.json({ error: "Nie znaleziono miejsca" }, { status: 404 });
  const profile = profileFrom(query);
  return NextResponse.json({
    status: city.status,
    sources: SOURCES,
    place,
    stops: nearbyStops(city.stops, place),
    ...(profile ? { assessment: assess(place, profile, SOURCES) } : {}),
  });
}
