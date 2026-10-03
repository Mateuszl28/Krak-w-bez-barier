/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Dane miast są czytane z dysku w trasach serwerowych — dołącz je do wdrożenia.
  outputFileTracingIncludes: { "/**": ["./data/**/*"] },
  async headers() {
    return [
      {
        // Widget is meant to be embedded on hotel / event pages.
        source: "/widget/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/api/v1/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};
export default nextConfig;
