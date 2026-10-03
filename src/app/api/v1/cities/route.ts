import { NextResponse } from "next/server";
import { listCities } from "@/lib/repository";

export async function GET() {
  return NextResponse.json({ cities: await listCities() });
}
