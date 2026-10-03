"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Szukaj" },
  { href: "/dla-firm", label: "Dla firm" },
  { href: "/o-projekcie", label: "Źródła i metoda" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Główna" className="site-nav">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={pathname === l.href ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
