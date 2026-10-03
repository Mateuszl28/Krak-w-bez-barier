"use client";

import { PRESETS, PRESET_LABELS } from "@/lib/labels";
import type { Profile } from "@/lib/model";
import { useProfile } from "./ProfileProvider";

const PRESET_ICONS: Record<Profile["preset"], string> = {
  wheelchair_manual: "♿",
  wheelchair_electric: "⚡",
  stroller: "👶",
  custom: "⚙",
};

export function ProfilePicker() {
  const { profile, setProfile } = useProfile();
  const update = (patch: Partial<Profile>) => setProfile({ ...profile, ...patch, preset: "custom" });

  return (
    <section aria-labelledby="profil-h" className="card">
      <fieldset>
        <legend id="profil-h">Czym się poruszasz?</legend>
        <div className="segmented">
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => (
            <label key={key}>
              <input
                type="radio"
                name="preset"
                value={key}
                checked={profile.preset === key}
                onChange={() => setProfile(PRESETS[key])}
              />
              <span aria-hidden="true">{PRESET_ICONS[key]}</span>
              {PRESET_LABELS[key]}
            </label>
          ))}
        </div>
      </fieldset>

      <details className="panel">
        <summary>
          Dostosuj wymagania
          {profile.preset === "custom" ? " (własne ustawienia)" : ""}
        </summary>
        <div className="grid-2" style={{ marginTop: 8 }}>
          <div>
            <label htmlFor="maxStep">Najwyższy próg, który pokonam (cm)</label>
            <input
              id="maxStep"
              type="number"
              inputMode="numeric"
              min={0}
              max={30}
              value={profile.maxStepCm}
              onChange={(e) => update({ maxStepCm: Number(e.target.value) })}
            />
          </div>
          <div>
            <label htmlFor="minDoor">Potrzebna szerokość przejścia (cm)</label>
            <input
              id="minDoor"
              type="number"
              inputMode="numeric"
              min={50}
              max={150}
              value={profile.minDoorCm}
              onChange={(e) => update({ minDoorCm: Number(e.target.value) })}
            />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <label className="check">
            <input
              type="checkbox"
              checked={profile.needToilet}
              onChange={(e) => update({ needToilet: e.target.checked })}
            />
            Potrzebuję toalety dostępnej dla wózka
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={profile.needChangingTable}
              onChange={(e) => update({ needChangingTable: e.target.checked })}
            />
            Potrzebuję przewijaka
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={profile.avoidCobbles}
              onChange={(e) => update({ avoidCobbles: e.target.checked })}
            />
            Unikam bruku i żwiru na dojściu
          </label>
        </div>
        <p className="lead" style={{ marginTop: 8, fontSize: "0.93rem" }}>
          Ustawienia zapisują się tylko w tej przeglądarce. Nie pytamy o niepełnosprawność — wystarczą Twoje potrzeby.
        </p>
      </details>
    </section>
  );
}
