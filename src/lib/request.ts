import { DEFAULT_PROFILE, PRESETS } from "./labels.ts";
import type { Profile } from "./model.ts";

/** ?awaria=osm,user_reports — symulacja niedostępności źródeł na potrzeby demo. */
export function offlineFrom(params: URLSearchParams): string[] {
  return (params.get("awaria") ?? "").split(",").filter(Boolean);
}

/** Profil z parametrów zapytania: ?preset=stroller lub ?maxStep=2&minDoor=80&toilet=1 */
export function profileFrom(params: URLSearchParams): Profile | undefined {
  const preset = params.get("preset");
  const has = ["maxStep", "minDoor", "toilet", "changingTable", "avoidCobbles"].some((k) => params.has(k));
  if (!preset && !has) return undefined;
  const base = preset && preset in PRESETS ? PRESETS[preset as keyof typeof PRESETS] : DEFAULT_PROFILE;
  const num = (k: string, d: number) => (params.has(k) ? Number(params.get(k)) : d);
  const bool = (k: string, d: boolean) => (params.has(k) ? params.get(k) === "1" : d);
  return {
    preset: has ? "custom" : base.preset,
    maxStepCm: num("maxStep", base.maxStepCm),
    minDoorCm: num("minDoor", base.minDoorCm),
    needToilet: bool("toilet", base.needToilet),
    needChangingTable: bool("changingTable", base.needChangingTable),
    avoidCobbles: bool("avoidCobbles", base.avoidCobbles),
  };
}
