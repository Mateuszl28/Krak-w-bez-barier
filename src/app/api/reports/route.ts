import { NextResponse } from "next/server";
import type { FactValue, FeatureKey } from "@/lib/model";
import { addReport, loadCity } from "@/lib/repository";

// Zgłoszenie korekty danych. Nie zbieramy danych osobowych: brak imienia, e-maila
// i adresu IP w zapisanym rekordzie. Limit zgłoszeń liczony jest tylko w pamięci.

const ALLOWED: Record<FeatureKey, (v: unknown) => v is FactValue> = {
  entrance: (v): v is FactValue => v === "level" || v === "ramp" || v === "lift" || v === "steps",
  step_count: (v): v is FactValue => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 50,
  step_height_cm: (v): v is FactValue => typeof v === "number" && v >= 0 && v <= 60,
  door_width_cm: (v): v is FactValue => typeof v === "number" && v >= 30 && v <= 400,
  elevator: (v): v is FactValue => typeof v === "boolean",
  toilet: (v): v is FactValue => typeof v === "boolean",
  changing_table: (v): v is FactValue => typeof v === "boolean",
  surface: (v): v is FactValue => ["smooth", "paving", "cobblestone", "gravel"].includes(v as string),
  rest: (v): v is FactValue => typeof v === "boolean",
  parking: (v): v is FactValue => typeof v === "boolean",
  general: (v): v is FactValue => false, // ogólnej oceny nie przyjmujemy ze zgłoszeń
};

const recent = new Map<string, number[]>();
const LIMIT_PER_HOUR = 20;

export async function POST(req: Request) {
  const who = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const times = (recent.get(who) ?? []).filter((t) => now - t < 3_600_000);
  if (times.length >= LIMIT_PER_HOUR) {
    return NextResponse.json({ error: "Zbyt wiele zgłoszeń. Spróbuj za godzinę." }, { status: 429 });
  }

  let body: { placeId?: unknown; facts?: unknown; comment?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const city = await loadCity();
  if (typeof body.placeId !== "string" || !city.byId.has(body.placeId)) {
    return NextResponse.json({ error: "Nie znaleziono miejsca." }, { status: 404 });
  }
  const facts: Partial<Record<FeatureKey, FactValue>> = {};
  for (const [key, value] of Object.entries((body.facts as Record<string, unknown>) ?? {})) {
    const valid = ALLOWED[key as FeatureKey];
    if (valid && valid(value)) facts[key as FeatureKey] = value;
  }
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";
  if (Object.keys(facts).length === 0) {
    return NextResponse.json({ error: "Zaznacz co najmniej jedną informację o miejscu." }, { status: 400 });
  }

  times.push(now);
  recent.set(who, times);
  await addReport({
    id: crypto.randomUUID(),
    placeId: body.placeId,
    createdAt: new Date().toISOString().slice(0, 10),
    facts,
    ...(comment ? { comment } : {}),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
