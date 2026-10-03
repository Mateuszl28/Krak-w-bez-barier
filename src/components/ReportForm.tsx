"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Formularz korekty danych. Zgłoszenie trafia do źródła "Zgłoszenia użytkowników"
// i jest oznaczane jako niezweryfikowane. Nie zbieramy danych osobowych.
export function ReportForm({ placeId }: { placeId: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const facts: Record<string, unknown> = {};
    const str = (k: string) => (form.get(k) as string) || "";
    if (str("entrance")) facts.entrance = str("entrance");
    for (const k of ["step_count", "step_height_cm", "door_width_cm"]) if (str(k)) facts[k] = Number(str(k));
    for (const k of ["toilet", "changing_table", "elevator"]) if (str(k)) facts[k] = str(k) === "yes";
    if (str("surface")) facts.surface = str("surface");

    setBusy(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ placeId, facts, comment: str("comment") }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      e.currentTarget?.reset();
      setMsg({
        ok: true,
        text: "Dziękujemy! Zgłoszenie jest już widoczne na karcie jako niezweryfikowane — do czasu potwierdzenia przez inne źródło.",
      });
      router.refresh();
    } else {
      setMsg({ ok: false, text: body.error ?? "Nie udało się wysłać zgłoszenia." });
    }
  };

  return (
    <form className="card" onSubmit={submit} aria-describedby="report-help">
      <p id="report-help" className="lead">
        Byłeś na miejscu? Uzupełnij to, co wiesz — wystarczy jedno pole. Nie prosimy o imię ani e-mail.
      </p>
      <div className="grid-2">
        <div>
          <label htmlFor="r-entrance">Wejście</label>
          <select id="r-entrance" name="entrance" defaultValue="">
            <option value="">— nie wiem —</option>
            <option value="level">bez stopni</option>
            <option value="ramp">podjazd / pochylnia</option>
            <option value="lift">platforma lub winda</option>
            <option value="steps">stopnie</option>
          </select>
        </div>
        <div>
          <label htmlFor="r-steps">Liczba stopni</label>
          <input id="r-steps" name="step_count" type="number" inputMode="numeric" min={0} max={50} />
        </div>
        <div>
          <label htmlFor="r-height">Najwyższy próg / stopień (cm)</label>
          <input id="r-height" name="step_height_cm" type="number" inputMode="numeric" min={0} max={60} />
        </div>
        <div>
          <label htmlFor="r-door">Szerokość drzwi (cm)</label>
          <input id="r-door" name="door_width_cm" type="number" inputMode="numeric" min={30} max={400} />
        </div>
        <YesNo id="r-toilet" name="toilet" label="Toaleta dostępna dla wózka" />
        <YesNo id="r-changing" name="changing_table" label="Przewijak" />
        <YesNo id="r-elevator" name="elevator" label="Winda na inne piętra" />
        <div>
          <label htmlFor="r-surface">Nawierzchnia dojścia</label>
          <select id="r-surface" name="surface" defaultValue="">
            <option value="">— nie wiem —</option>
            <option value="smooth">gładka (asfalt, płyty)</option>
            <option value="paving">kostka brukowa</option>
            <option value="cobblestone">bruk / kocie łby</option>
            <option value="gravel">żwir / nieutwardzona</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 10 }}>
        <label htmlFor="r-comment">Uwagi (opcjonalnie)</label>
        <textarea id="r-comment" name="comment" maxLength={500} />
      </div>
      <div style={{ marginTop: 12 }}>
        <button type="submit" disabled={busy}>
          {busy ? "Wysyłanie…" : "Wyślij zgłoszenie"}
        </button>
      </div>
      <div role="status" aria-live="polite" style={{ marginTop: 10 }}>
        {msg && (
          <p className={msg.ok ? "status-ok" : "status-bad"} style={{ margin: 0 }}>
            {msg.text}
          </p>
        )}
      </div>
    </form>
  );
}

function YesNo({ id, name, label }: { id: string; name: string; label: string }) {
  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue="">
        <option value="">— nie wiem —</option>
        <option value="yes">jest</option>
        <option value="no">nie ma</option>
      </select>
    </div>
  );
}
