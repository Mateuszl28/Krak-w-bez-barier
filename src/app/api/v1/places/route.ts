import { NextResponse } from "next/server";
import { assess } from "@/lib/assess";
import type { Category } from "@/lib/model";
import { loadCity, search } from "@/lib/repository";
import { offlineFrom, profileFrom } from "@/lib/request";
import { SOURCES } from "@/lib/sources";

// Publiczne API: wyszukiwanie miejsc. Z parametrami profilu zwraca też ocenę
// (np. dla systemów rezerwacyjnych i aplikacji turystycznych).
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const city = await loadCity(params.get("city") ?? "krakow", offlineFrom(params));
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const places = search(city.places, {
    q: params.get("q") ?? undefined,
    category: (params.get("category") as Category) || undefined,
    near: lat && lon ? [lat, lon] : undefined,
    limit: Math.min(Number(params.get("limit")) || 40, 200),
  });
  const profile = profileFrom(params);
  return NextResponse.json({
    city: { id: city.config.id, name: city.config.name },
    status: city.status,
    sources: SOURCES,
    places: profile ? places.map((p) => ({ ...p, assessment: assess(p, profile, SOURCES) })) : places,
  });
}
