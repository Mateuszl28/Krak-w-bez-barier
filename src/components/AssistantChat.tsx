"use client";

import { useRef, useState } from "react";
import type { Profile } from "@/lib/model";
import { useProfile } from "./ProfileProvider";

interface Reply {
  reply: string;
  route?: { from: [number, number]; to: [number, number]; fromName: string; toName: string };
  profile?: Profile;
  places: { id: string; name: string }[];
}

interface Msg {
  role: "user" | "model";
  text: string;
  reply?: Reply;
  error?: boolean;
}

const EXAMPLES = [
  "Jadę wózkiem z przystanku Teatr Bagatela do Sukiennic. Którędy bez schodów?",
  "Z wózkiem dziecięcym na Wawel — gdzie po drodze jest toaleta z przewijakiem? Startuję z Placu Wszystkich Świętych.",
  "Szukam muzeum dostępnego dla wózka elektrycznego w pobliżu Rynku",
];

// Asystent AI (Gemini po stronie serwera). Fakty wyłącznie z danych aplikacji.
export function AssistantChat() {
  const { profile, setProfile } = useProfile();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history, profile, city: "krakow", lang: "pl" }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setMessages((m) => [...m, { role: "model", text: body.reply, reply: body }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "model", text: (e as Error).message, error: true }]);
    }
    setBusy(false);
    inputRef.current?.focus();
  };

  return (
    <>
      {messages.length === 0 && (
        <section aria-labelledby="examples-h" className="card">
          <h2 id="examples-h" style={{ marginTop: 0, fontSize: "1.05rem" }}>
            Przykładowe pytania
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
            {EXAMPLES.map((ex) => (
              <li key={ex}>
                <button type="button" className="secondary" style={{ width: "100%", textAlign: "left" }} onClick={() => send(ex)}>
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ol aria-label="Rozmowa" style={{ listStyle: "none", padding: 0, display: "grid", gap: 12, marginTop: 16 }}>
        {messages.map((m, i) => (
          <li
            key={i}
            className="card"
            style={{
              marginLeft: m.role === "user" ? "auto" : 0,
              maxWidth: "88%",
              background: m.role === "user" ? "var(--accent)" : m.error ? "var(--unk-bg)" : "var(--surface)",
              color: m.role === "user" ? "var(--accent-text)" : "var(--text)",
            }}
          >
            <span className="visually-hidden">{m.role === "user" ? "Ty: " : "Asystent: "}</span>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
            {m.reply && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {m.reply.route && (
                  <a
                    className="button"
                    href={`/trasa?${new URLSearchParams({
                      fromLat: String(m.reply.route.from[0]),
                      fromLon: String(m.reply.route.from[1]),
                      toLat: String(m.reply.route.to[0]),
                      toLon: String(m.reply.route.to[1]),
                      fromName: m.reply.route.fromName,
                      toName: m.reply.route.toName,
                    })}`}
                  >
                    Pokaż trasę
                  </a>
                )}
                {m.reply.profile && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      setProfile(m.reply!.profile!);
                      setApplied(i);
                    }}
                  >
                    {applied === i ? "Wymagania zastosowane ✓" : "Zastosuj te wymagania"}
                  </button>
                )}
                {m.reply.places.slice(0, 4).map((p) => (
                  <a key={p.id} className="button secondary" href={`/miejsce/${p.id}`}>
                    {p.name}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ol>
      <p role="status" aria-live="polite" className="lead">
        {busy ? "Sprawdzam dane…" : ""}
      </p>

      <form
        className="card"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="ask">Twoje pytanie</label>
        <textarea
          id="ask"
          ref={inputRef}
          value={input}
          maxLength={1000}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder="Np. jadę wózkiem z przystanku Teatr Bagatela do Sukiennic"
        />
        <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" disabled={busy || !input.trim()}>
            Wyślij
          </button>
          <span className="lead" style={{ margin: 0, fontSize: "0.9rem" }}>
            Pytanie przetwarza model Gemini (Google). Nie zapisujemy rozmowy.
          </span>
        </div>
      </form>
    </>
  );
}
