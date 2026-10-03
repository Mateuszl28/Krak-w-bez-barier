import { NextResponse } from "next/server";
import { AssistantRateLimited, AssistantUnavailable, askAssistant, type AssistantTurn } from "@/lib/assistant";
import { DEFAULT_PROFILE } from "@/lib/labels";
import type { Profile } from "@/lib/model";
import { rateLimiter, validCity } from "@/lib/validate";

// Asystent AI. Treść pytania trafia do Gemini (Google); rozmowy nie zapisujemy.
const allow = rateLimiter(30);

function validProfile(input: unknown): Profile {
  const p = (input ?? {}) as Partial<Profile>;
  const n = (v: unknown, d: number, max: number) => (typeof v === "number" && v >= 0 && v <= max ? v : d);
  const b = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
  return {
    preset: ["wheelchair_manual", "wheelchair_electric", "stroller", "custom"].includes(p.preset as string)
      ? (p.preset as Profile["preset"])
      : DEFAULT_PROFILE.preset,
    maxStepCm: n(p.maxStepCm, DEFAULT_PROFILE.maxStepCm, 30),
    minDoorCm: n(p.minDoorCm, DEFAULT_PROFILE.minDoorCm, 200),
    needToilet: b(p.needToilet, false),
    needChangingTable: b(p.needChangingTable, false),
    avoidCobbles: b(p.avoidCobbles, false),
  };
}

export async function POST(req: Request) {
  if (!allow(req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local")) {
    return NextResponse.json({ error: "Zbyt wiele pytań. Spróbuj za chwilę." }, { status: 429 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 1000) : "";
  if (!message) return NextResponse.json({ error: "Napisz pytanie." }, { status: 400 });

  const history: AssistantTurn[] = Array.isArray(body?.history)
    ? (body!.history as unknown[])
        .filter(
          (t): t is AssistantTurn =>
            !!t &&
            typeof (t as AssistantTurn).text === "string" &&
            ((t as AssistantTurn).role === "user" || (t as AssistantTurn).role === "model"),
        )
        .slice(-10)
        .map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }))
    : [];
  const loc = body?.location as unknown;
  const location =
    Array.isArray(loc) && loc.length === 2 && loc.every((x) => typeof x === "number" && Number.isFinite(x))
      ? (loc as [number, number])
      : undefined;

  try {
    const result = await askAssistant({
      message,
      history,
      city: validCity(body?.city),
      locale: body?.lang === "en" ? "en" : "pl",
      profile: validProfile(body?.profile),
      location,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AssistantRateLimited) {
      const en = body?.lang === "en";
      const secs = err.retryAfterS;
      const wait =
        secs < 90 ? `${secs} s` : secs < 5400 ? `${Math.round(secs / 60)} min` : `${Math.round(secs / 3600)} ${en ? "h" : "godz."}`;
      return NextResponse.json(
        {
          error: en
            ? `The AI assistant has reached the free-plan request limit. Try again in about ${wait} — search and route checks work as usual.`
            : `Asystent AI wyczerpał limit zapytań darmowego planu. Spróbuj za ok. ${wait} — wyszukiwarka i ocena tras działają normalnie.`,
          retryAfterS: err.retryAfterS,
        },
        { status: 429, headers: { "retry-after": String(err.retryAfterS) } },
      );
    }
    if (err instanceof AssistantUnavailable) {
      return NextResponse.json(
        { error: "Asystent AI nie jest skonfigurowany na tym serwerze (brak klucza Gemini)." },
        { status: 503 },
      );
    }
    console.error("assistant error", err);
    return NextResponse.json(
      { error: "Asystent AI jest chwilowo niedostępny. Wyszukiwarka i ocena tras działają nadal." },
      { status: 502 },
    );
  }
}
