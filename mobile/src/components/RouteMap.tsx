import { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import type { RouteResult } from "../lib/api";
import { useTheme } from "../lib/theme";

// Kolory odcinków (z kontrastem względem podkładu OSM). Typ odcinka jest też
// opisany tekstem na ekranie — kolor nie jest jedynym nośnikiem informacji.
export const SEGMENT_COLOR = { ok: "#0b6b2e", warn: "#b35c00", barrier: "#a4161a", unknown: "#6b6b6b" };

export function RouteMap({ route, label }: { route: RouteResult["route"]; label: string }) {
  const t = useTheme();
  const html = useMemo(() => {
    const segs = route.segments.map((s) => ({ c: SEGMENT_COLOR[s.kind], d: s.kind === "unknown", p: s.coords }));
    return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%}</style>
</head><body><div id="m"></div><script>
var segs=${JSON.stringify(segs)};
var map=L.map('m');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(map);
var all=[];
segs.forEach(function(s){
  L.polyline(s.p,{color:'#ffffff',weight:9,opacity:0.9}).addTo(map);
  L.polyline(s.p,{color:s.c,weight:6,dashArray:s.d?'4 8':null}).addTo(map);
  all=all.concat(s.p);
});
if(all.length){
  L.circleMarker(all[0],{radius:8,color:'#fff',weight:3,fillColor:'#0a4fa8',fillOpacity:1}).addTo(map);
  L.circleMarker(all[all.length-1],{radius:9,color:'#fff',weight:3,fillColor:'#1a1a1a',fillOpacity:1}).addTo(map);
  map.fitBounds(all,{padding:[24,24]});
}
</script></body></html>`;
  }, [route]);
  return (
    <View
      accessibilityLabel={label}
      style={{ height: 320, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: t.line }}
    >
      <WebView originWhitelist={["*"]} source={{ html, baseUrl: "https://localhost/" }} nestedScrollEnabled />
    </View>
  );
}
