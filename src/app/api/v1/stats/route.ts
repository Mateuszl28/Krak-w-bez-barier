import { NextResponse } from "next/server";
import { loadCity } from "@/lib/repository";
import { cityFrom } from "@/lib/request";
import { SOURCES } from "@/lib/sources";
import { qualityReport } from "@/lib/stats";

// Raport jakości danych (pokrycie, aktualność, sprzeczności) — dla miasta i partnerów.
export async function GET(req: Request) {
  const city = await loadCity(cityFrom(new URL(req.url).searchParams)).catch(() => null);
  if (!city) return NextResponse.json({ error: "Nieznane miasto" }, { status: 404 });
  return NextResponse.json({ city: city.config.name, status: city.status, ...qualityReport(city.places, SOURCES) });
}
