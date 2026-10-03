import { router } from "expo-router";
import { useMemo } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { VERDICT_TEXT, type Assessment, type Place } from "../lib/shared";
import { useTheme } from "../lib/theme";
import { VERDICT_ICON } from "./ui";

export interface Assessed {
  place: Place;
  assessment: Assessment;
}

const PIN: Record<string, string> = { meets: "#0b6b2e", barrier: "#a4161a", incomplete: "#6b4a00" };

// Mapa OpenStreetMap (Leaflet w WebView) — bez kluczy API i zależności od Google.
// Jest dodatkiem: te same informacje są w liście i na karcie miejsca.
export function PlacesMap({ results, height = 420 }: { results: Assessed[]; height?: number }) {
  const t = useTheme();
  const html = useMemo(() => {
    const points = results.map(({ place, assessment }) => ({
      id: place.id,
      name: place.name,
      lat: place.lat,
      lon: place.lon,
      color: PIN[assessment.verdict],
      icon: VERDICT_ICON[assessment.verdict],
      verdict: VERDICT_TEXT[assessment.verdict].title,
    }));
    return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%}
.pin{width:30px;height:30px;border-radius:50%;border:2px solid #fff;color:#fff;font:800 15px sans-serif;
display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,.5)}
.pop a{display:inline-block;margin-top:6px;padding:8px 10px;background:#0a4fa8;color:#fff;border-radius:6px;text-decoration:none;font-weight:700}</style>
</head><body><div id="m"></div><script>
var pts=${JSON.stringify(points).replace(/</g, "\\u003c")};
var map=L.map('m',{zoomControl:true}).setView([50.0614,19.9372],15);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,
  attribution:'&copy; OpenStreetMap'}).addTo(map);
function esc(s){return s.replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';'})}
var b=[];
pts.forEach(function(p){
  var icon=L.divIcon({className:'',html:'<div class="pin" style="background:'+p.color+'">'+p.icon+'</div>',iconSize:[30,30],iconAnchor:[15,15]});
  var m=L.marker([p.lat,p.lon],{icon:icon,title:p.name+': '+p.verdict}).addTo(map);
  m.bindPopup('<div class="pop"><b>'+esc(p.name)+'</b><br>'+p.verdict+'<br><a href="#" onclick="window.ReactNativeWebView.postMessage(\\''+p.id+'\\');return false">Szczegóły i źródła</a></div>');
  b.push([p.lat,p.lon]);
});
if(b.length>1)map.fitBounds(b,{padding:[30,30],maxZoom:17});else if(b.length===1)map.setView(b[0],17);
</script></body></html>`;
  }, [results]);

  return (
    <View
      style={{ height, borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: t.line }}
      accessibilityLabel="Mapa miejsc. Te same informacje są dostępne w liście."
    >
      <WebView
        originWhitelist={["*"]}
        source={{ html, baseUrl: "https://localhost/" }}
        onMessage={(e) => router.push({ pathname: "/miejsce/[id]", params: { id: e.nativeEvent.data } })}
        nestedScrollEnabled
      />
    </View>
  );
}
