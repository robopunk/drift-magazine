import { describe, it, expect } from "vitest";
import { THEME_COOKIE_NAME, resolveTheme } from "@/lib/theme";

describe("theme", () => {
  it("exports the cookie name constant", () => {
    expect(THEME_COOKIE_NAME).toBe("drift-theme");
  });

  it("resolveTheme returns cookie value when present", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("light", "dark")).toBe("light");
  });

  it("resolveTheme falls back to system preference", () => {
    expect(resolveTheme(null, "dark")).toBe("dark");
    expect(resolveTheme(undefined, "light")).toBe("light");
  });

  it("resolveTheme defaults to light when no preference", () => {
    expect(resolveTheme(null, null)).toBe("light");
  });
});
