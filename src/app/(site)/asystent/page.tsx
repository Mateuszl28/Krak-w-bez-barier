import type { Metadata } from "next";
import { AssistantChat } from "@/components/AssistantChat";

export const metadata: Metadata = { title: "Asystent podróży" };

export default function AssistantPage() {
  return (
    <>
      <h1>Asystent podróży</h1>
      <p className="lead">
        Opisz, dokąd jedziesz i czego potrzebujesz. Asystent sprawdzi miejsca, przystanki i trasę dojścia — wyłącznie na
        podstawie danych ze źródłami. Brak danych zawsze nazywa po imieniu.
      </p>
      <AssistantChat />
    </>
  );
}
