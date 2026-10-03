"use client";

import { useState } from "react";

// Formularz deklaracji właściciela. Pola jak w zgłoszeniu, ale z nazwą obiektu
// i oświadczeniem o reprezentowaniu obiektu. Bez danych osobowych.
export function DeclarationForm({ placeId, placeName }: { placeId: string; placeName: string }) {
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const str = (k: string) => ((form.get(k) as string) || "").trim();
    const facts: Record<string, unknown> = {};
    if (str("entrance")) facts.entrance = str("entrance");
    for (const k of ["step_count", "step_height_cm", "door_width_cm"]) if (str(k)) facts[k] = Number(str(k));
    for (const k of ["elevator", "toilet", "changing_table", "parking", "rest"]) if (str(k)) facts[k] = str(k) === "yes";
    if (str("surface")) facts.surface = str("surface");

    setBusy(true);
    const res = await fetch("/api/declarations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        placeId,
        organization: str("organization"),
        represent: form.get("represent") === "on",
        facts,
        notes: str("notes"),
      }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    setStatus(
      res.ok
        ? { ok: true, text: "Dziękujemy! Deklaracja jest już widoczna na karcie obiektu jako oczekująca na weryfikację." }
        : { ok: false, text: body.error ?? "Nie udało się wysłać deklaracji." },
    );
  };

  if (status?.ok) {
    return (
      <div className="card" role="status">
        <p className="status-ok">{status.text}</p>
        <h2 style={{ marginTop: 8 }}>Osadź kartę dostępności na swojej stronie</h2>
        <p>Wklej ten kod na stronie obiektu — karta będzie się aktualizować automatycznie:</p>
        <pre>{`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/widget/${placeId}"
  title="Dostępność: ${placeName}" width="100%" height="520" style="border:0"></iframe>`}</pre>
        <p>
          <a href={`/miejsce/${placeId}`}>Zobacz kartę obiektu</a> · <a href={`/widget/${placeId}`}>Podgląd widżetu</a>
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <div>
        <label htmlFor="d-org">Nazwa obiektu lub firmy</label>
        <input id="d-org" name="organization" type="text" required maxLength={120} defaultValue={placeName} />
      </div>

      <h2 style={{ fontSize: "1.1rem" }}>Wejście</h2>
      <div className="grid-2">
        <div>
          <label htmlFor="d-entrance">Główne wejście</label>
          <select id="d-entrance" name="entrance" defaultValue="">
            <option value="">— wybierz —</option>
            <option value="level">bez stopni</option>
            <option value="ramp">podjazd / pochylnia</option>
            <option value="lift">platforma lub winda</option>
            <option value="steps">stopnie</option>
          </select>
        </div>
        <Num id="d-steps" name="step_count" label="Liczba stopni" max={50} />
        <Num id="d-height" name="step_height_cm" label="Najwyższy próg / stopień (cm)" max={60} />
        <Num id="d-door" name="door_width_cm" label="Szerokość drzwi w świetle (cm)" min={30} max={400} />
      </div>

      <h2 style={{ fontSize: "1.1rem" }}>Wewnątrz i w pobliżu</h2>
      <div className="grid-2">
        <YesNo id="d-elevator" name="elevator" label="Winda na inne piętra" />
        <YesNo id="d-toilet" name="toilet" label="Toaleta dostępna dla wózka" />
        <YesNo id="d-changing" name="changing_table" label="Przewijak" />
        <YesNo id="d-rest" name="rest" label="Miejsca do odpoczynku" />
        <YesNo id="d-parking" name="parking" label="Miejsce parkingowe dla osób z niepełnosprawnościami" />
        <div>
          <label htmlFor="d-surface">Nawierzchnia dojścia</label>
          <select id="d-surface" name="surface" defaultValue="">
            <option value="">— wybierz —</option>
            <option value="smooth">gładka (asfalt, płyty)</option>
            <option value="paving">kostka brukowa</option>
            <option value="cobblestone">bruk / kocie łby</option>
            <option value="gravel">żwir / nieutwardzona</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label htmlFor="d-notes">Dodatkowe informacje (np. dzwonek przy wejściu, pomoc personelu)</label>
        <textarea id="d-notes" name="notes" maxLength={500} />
      </div>

      <label className="check" style={{ marginTop: 12 }}>
        <input type="checkbox" name="represent" required />
        Oświadczam, że reprezentuję ten obiekt, a informacje opisują jego obecny stan.
      </label>

      <div style={{ marginTop: 12 }}>
        <button type="submit" disabled={busy}>
          {busy ? "Wysyłanie…" : "Opublikuj deklarację"}
        </button>
      </div>
      <div role="status" aria-live="polite" style={{ marginTop: 10 }}>
        {status && !status.ok && <p className="status-bad">{status.text}</p>}
      </div>
    </form>
  );
}

function Num({ id, name, label, min = 0, max }: { id: string; name: string; label: string; min?: number; max: number }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input id={id} name={name} type="number" inputMode="numeric" min={min} max={max} />
    </div>
  );
}

function YesNo({ id, name, label }: { id: string; name: string; label: string }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue="">
        <option value="">— wybierz —</option>
        <option value="yes">jest</option>
        <option value="no">nie ma</option>
      </select>
    </div>
  );
}
