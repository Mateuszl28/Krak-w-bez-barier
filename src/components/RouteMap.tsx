"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

const COLOR = { ok: "#0b6b2e", warn: "#b35c00", barrier: "#a4161a", unknown: "#6b6b6b" };

// Mapa trasy: odcinki pokolorowane wg oceny; odcinki bez danych linią przerywaną.
export default function RouteMap({
  segments,
}: {
  segments: { kind: keyof typeof COLOR; coords: [number, number][] }[];
}) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { scrollWheelZoom: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const all: [number, number][] = [];
    for (const s of segments) {
      L.polyline(s.coords, { color: "#ffffff", weight: 9, opacity: 0.9 }).addTo(map);
      L.polyline(s.coords, { color: COLOR[s.kind], weight: 6, dashArray: s.kind === "unknown" ? "4 8" : undefined }).addTo(
        map,
      );
      all.push(...s.coords);
    }
    if (all.length) {
      L.circleMarker(all[0], { radius: 8, color: "#fff", weight: 3, fillColor: "#0a4fa8", fillOpacity: 1 })
        .bindTooltip("Start")
        .addTo(map);
      L.circleMarker(all[all.length - 1], { radius: 9, color: "#fff", weight: 3, fillColor: "#1a1a1a", fillOpacity: 1 })
        .bindTooltip("Cel")
        .addTo(map);
      map.fitBounds(all, { padding: [24, 24] });
    }
    return () => {
      map.remove();
    };
  }, [segments]);
  return (
    <div
      ref={el}
      className="map"
      role="region"
      aria-label="Mapa trasy. Opis odcinków jest dostępny w formie tekstowej powyżej."
    />
  );
}
