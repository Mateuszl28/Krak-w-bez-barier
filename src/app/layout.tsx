import type { Metadata, Viewport } from "next";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kraków bez barier", template: "%s · Kraków bez barier" },
  description:
    "Sprawdź, czy miejsce w Krakowie odpowiada Twoim potrzebom: schody, progi, szerokość drzwi, toalety — ze źródłem i datą każdej informacji.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Bez barier", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1d1f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
