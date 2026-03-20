"use client";

import { useState, useEffect } from "react";
import { setThemeCookie, type Theme } from "@/lib/theme";

interface ThemeToggleProps {
  initialTheme?: Theme;
}

export function ThemeToggle({ initialTheme }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(initialTheme ?? "light");

  useEffect(() => {
    if (!initialTheme) {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
  }, [initialTheme]);

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
