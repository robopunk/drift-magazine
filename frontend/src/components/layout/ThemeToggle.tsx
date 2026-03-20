"use client";

import { useState } from "react";
import { setThemeCookie, type Theme } from "@/lib/theme";

interface ThemeToggleProps {
  initialTheme?: Theme;
}

export function ThemeToggle({ initialTheme }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (initialTheme) return initialTheme;
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark") ? "dark" : "light";
    }
    return "light";
  });

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    setThemeCookie(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="text-lg p-1 hover:opacity-80 transition-opacity"
    >
      {theme === "light" ? "\u{2600}\u{FE0F}" : "\u{1F319}"}
    </button>
  );
}
