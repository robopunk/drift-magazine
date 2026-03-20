"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { label: "Companies", href: "/" },
  { label: "Sectors", href: "/#sectors" },
  { label: "Buried", href: "/#buried" },
  { label: "Methodology", href: "/about#methodology" },
  { label: "About", href: "/about" },
];

interface MastheadProps {
  initialTheme?: "light" | "dark";
}

export function Masthead({ initialTheme }: MastheadProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-[var(--forced-dark-bg)] text-[var(--forced-dark-text)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
        <Link href="/" className="font-serif text-xl font-bold text-white tracking-tight">
          Drift<span className="text-[var(--forced-dark-accent)]">.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-sans text-[var(--forced-dark-text)] hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle initialTheme={initialTheme} />
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle initialTheme={initialTheme} />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="text-[var(--forced-dark-text)] hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {menuOpen ? (
                <path d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-[var(--forced-dark-card)] px-4 pb-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-sans text-[var(--forced-dark-text)] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
