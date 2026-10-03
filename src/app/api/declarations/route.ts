import { NextResponse } from "next/server";
import { addDeclaration, loadCity } from "@/lib/repository";
import { rateLimiter, validCity, validFacts } from "@/lib/validate";

// Deklaracja właściciela obiektu. Trafia jako "oczekująca na weryfikację" —
// nie jest pokazywana jako potwierdzona, dopóki operator jej nie zweryfikuje.
const allow = rateLimiter(10);

export async function POST(req: Request) {
  if (!allow(req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local")) {
    return NextResponse.json({ error: "Zbyt wiele deklaracji. Spróbuj za godzinę." }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  const city = await loadCity(validCity(body.city)).catch(() => null);
  if (!city || typeof body.placeId !== "string" || !city.byId.has(body.placeId)) {
    return NextResponse.json({ error: "Nie znaleziono obiektu." }, { status: 404 });
  }
  const organization = typeof body.organization === "string" ? body.organization.trim().slice(0, 120) : "";
  if (!organization) return NextResponse.json({ error: "Podaj nazwę obiektu lub firmy." }, { status: 400 });
  if (body.represent !== true) {
    return NextResponse.json({ error: "Potwierdź, że reprezentujesz obiekt." }, { status: 400 });
  }
  const facts = validFacts(body.facts);
  if (Object.keys(facts).length < 2) {
    return NextResponse.json({ error: "Deklaracja powinna zawierać co najmniej dwie informacje." }, { status: 400 });
  }
  const notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
  await addDeclaration({
    id: crypto.randomUUID(),
    placeId: body.placeId,
    organization,
    declaredAt: new Date().toISOString().slice(0, 10),
    facts,
    ...(notes ? { notes } : {}),
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
