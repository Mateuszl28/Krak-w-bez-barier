import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlaceDetail } from "@/components/PlaceDetail";
import { loadCity } from "@/lib/repository";
import { SOURCES } from "@/lib/sources";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const city = await loadCity();
  return { title: city.byId.get(id)?.name ?? "Miejsce" };
}

export default async function PlacePage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const city = await loadCity("krakow", (sp.awaria ?? "").split(",").filter(Boolean));
  const place = city.byId.get(id);
  if (!place) notFound();
  return <PlaceDetail place={place} sources={SOURCES} status={city.status} />;
}
