"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ModerationActions({
  id,
  kind,
  verified,
}: {
  id: string;
  kind: "declaration" | "report";
  verified?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const act = async (action: string) => {
    setBusy(true);
    await fetch("/api/moderacja", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, id }),
    });
    setBusy(false);
    router.refresh();
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {kind === "declaration" && !verified && (
        <button type="button" disabled={busy} onClick={() => act("verify-declaration")}>
          Zweryfikuj
        </button>
      )}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={() => act(kind === "declaration" ? "reject-declaration" : "reject-report")}
      >
        {kind === "declaration" ? "Odrzuć deklarację" : "Usuń zgłoszenie (spam / nadużycie)"}
      </button>
    </div>
  );
}
