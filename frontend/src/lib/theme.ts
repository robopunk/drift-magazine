export const THEME_COOKIE_NAME = "drift-theme";
export type Theme = "light" | "dark";

export function resolveTheme(
  cookieValue: string | null | undefined,
  systemPreference: string | null | undefined
): Theme {
  if (cookieValue === "dark" || cookieValue === "light") return cookieValue;
  if (systemPreference === "dark") return "dark";
  if (systemPreference === "light") return "light";
  return "light";
}

export function setThemeCookie(theme: Theme): void {
  document.cookie = `${THEME_COOKIE_NAME}=${theme};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;
}
