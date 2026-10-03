import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DeclarationForm } from "@/components/DeclarationForm";
import { loadCity } from "@/lib/repository";

export const metadata: Metadata = { title: "Deklaracja dostępności obiektu" };
export const dynamic = "force-dynamic";

export default async function DeclarationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const city = await loadCity();
  const place = city.byId.get(id);
  if (!place) notFound();
  return (
    <>
      <p>
        <a href={`/miejsce/${place.id}`}>← Karta obiektu</a>
      </p>
      <h1>Deklaracja dostępności: {place.name}</h1>
      <p className="lead">
        Opisz obiekt tak, jak wygląda dziś. Deklaracja pojawi się na karcie z datą jako „oczekująca na weryfikację”, a
        po weryfikacji — jako deklaracja właściciela. Odwiedzający mogą ją potwierdzić lub zgłosić rozbieżność.
      </p>
      <DeclarationForm placeId={place.id} placeName={place.name} />
    </>
  );
}
