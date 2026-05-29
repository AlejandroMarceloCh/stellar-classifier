"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Predicción" },
  { href: "/sky-map", label: "Sky map" },
  { href: "/universe", label: "Universo" },
  { href: "/analysis", label: "Análisis" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-sm border-b border-gray-200">
      <div className="mx-auto max-w-[1320px] flex items-center justify-between gap-6 px-6 py-3 sm:px-10 sm:py-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[14px] text-gray-900 hover:text-nasa-blue transition-colors"
        >
          <NasaMark />
          <span className="font-semibold tracking-tight-ish">Stellar Classifier</span>
        </Link>
        <nav className="flex items-center gap-1 text-[13px]">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  "px-3 py-1.5 rounded-md transition-colors whitespace-nowrap " +
                  (active
                    ? "bg-nasa-blue-bg text-nasa-blue font-medium"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

/** Pequeño "meatball" minimalista — círculo azul NASA con anillo blanco. */
function NasaMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <circle cx="11" cy="11" r="10" fill="#0B3D91" />
      <ellipse cx="11" cy="11" rx="9" ry="2.4" fill="none" stroke="#ffffff" strokeWidth="0.9" transform="rotate(-22 11 11)" />
      <circle cx="11" cy="11" r="1.6" fill="#ffffff" />
    </svg>
  );
}
