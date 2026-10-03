// Polityka bezpieczeństwa treści: tylko własne zasoby i kafelki mapy OpenStreetMap.
const csp = (frameAncestors) =>
  [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");

const common = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lokalizacja tylko dla tej strony (przycisk "najbliżej mnie"), reszta wyłączona.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dane miast są czytane z dysku w trasach serwerowych — dołącz je do wdrożenia.
  outputFileTracingIncludes: { "/**": ["./data/**/*"] },
  async headers() {
    return [
      {
        // Wszystko poza widżetem: strona nie może być osadzana na cudzych stronach.
        source: "/:path((?!widget).*)",
        headers: [...common, { key: "Content-Security-Policy", value: csp("'self'") }],
      },
      {
        // Widżet jest przeznaczony do osadzania na stronach hoteli i organizatorów.
        source: "/widget/:path*",
        headers: [...common, { key: "Content-Security-Policy", value: csp("*") }],
      },
      {
        source: "/api/v1/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};
export default nextConfig;
