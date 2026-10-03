"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import L from "leaflet";
import "leaflet.markercluster";
import { useEffect, useRef } from "react";
import { VERDICT_TEXT } from "@/lib/assess";
import type { Assessed } from "./SearchView";
import { VERDICT_ICON } from "./Verdict";

const KRAKOW: [number, number] = [50.0614, 19.9372];

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export default function MapView({ results, height }: { results: Assessed[]; height?: number }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    map.current = L.map(el.current, { scrollWheelZoom: false }).setView(KRAKOW, 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map.current);
    // Grupowanie znaczników: w gęstych miejscach znaczniki nie nachodzą na siebie.
    layer.current = L.markerClusterGroup({ maxClusterRadius: 40, showCoverageOnHover: false }).addTo(map.current);
    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || !layer.current) return;
    layer.current.clearLayers();
    const bounds: [number, number][] = [];
    for (const { place, assessment } of results) {
      const v = assessment.verdict;
      const icon = L.divIcon({
        className: "",
        html: `<span class="map-pin ${v}">${VERDICT_ICON[v]}</span>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });
      const label = `${place.name}: ${VERDICT_TEXT[v].title}`;
      L.marker([place.lat, place.lon], { icon, title: label, alt: label, keyboard: true })
        .bindPopup(
          `<strong>${escapeHtml(place.name)}</strong><br>${VERDICT_TEXT[v].title}<br><a href="/miejsce/${place.id}">Szczegóły i źródła</a>`,
        )
        .addTo(layer.current);
      bounds.push([place.lat, place.lon]);
    }
    if (bounds.length > 1) map.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 17 });
    else if (bounds.length === 1) map.current.setView(bounds[0], 17);
  }, [results]);

  return (
    <div
      ref={el}
      className="map"
      style={height ? { height } : undefined}
      role="region"
      aria-label="Mapa miejsc. Te same informacje są dostępne w formie tekstowej w liście."
    />
  );
}
