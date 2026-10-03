import { NextResponse } from "next/server";
import { addReport, loadCity } from "@/lib/repository";
import { rateLimiter, validCity, validFacts } from "@/lib/validate";

// Zgłoszenie korekty danych. Nie zbieramy danych osobowych: brak imienia, e-maila
// i adresu IP w zapisanym rekordzie. Limit zgłoszeń liczony jest tylko w pamięci.
const allow = rateLimiter(20);

export async function POST(req: Request) {
  if (!allow(req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local")) {
    return NextResponse.json({ error: "Zbyt wiele zgłoszeń. Spróbuj za godzinę." }, { status: 429 });
  }
  let body: { placeId?: unknown; facts?: unknown; comment?: unknown; city?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }

  const city = await loadCity(validCity(body.city)).catch(() => null);
  if (!city || typeof body.placeId !== "string" || !city.byId.has(body.placeId)) {
    return NextResponse.json({ error: "Nie znaleziono miejsca." }, { status: 404 });
  }
  const facts = validFacts(body.facts);
  if (Object.keys(facts).length === 0) {
    return NextResponse.json({ error: "Zaznacz co najmniej jedną informację o miejscu." }, { status: 400 });
  }
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 500) : "";

  await addReport({
    id: crypto.randomUUID(),
    placeId: body.placeId,
    createdAt: new Date().toISOString().slice(0, 10),
    facts,
    ...(comment ? { comment } : {}),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
