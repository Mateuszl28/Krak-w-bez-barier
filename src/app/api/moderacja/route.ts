import { NextResponse } from "next/server";
import { moderate } from "@/lib/repository";

const ACTIONS = ["verify-declaration", "reject-declaration", "reject-report"] as const;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { action?: string; id?: string };
  const action = ACTIONS.find((a) => a === body.action);
  if (!action || typeof body.id !== "string") {
    return NextResponse.json({ error: "Nieprawidłowe dane." }, { status: 400 });
  }
  const ok = await moderate(action, body.id);
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Nie znaleziono." }, { status: 404 });
}
