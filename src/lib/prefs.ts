const THEME_KEY = "bank-theme"
const LOCALE_KEY = "bank-locale"

export type ThemeMode = "light" | "dark"

export function readStoredTheme(fallback: ThemeMode = "dark"): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === "light" || v === "dark" ? v : fallback
  } catch {
    return fallback
  }
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark")
  try {
    localStorage.setItem(THEME_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function readStoredLocale(fallback: "en" | "ru" = "en"): "en" | "ru" {
  try {
    const v = localStorage.getItem(LOCALE_KEY)
    return v === "en" || v === "ru" ? v : fallback
  } catch {
    return fallback
  }
}

export function storeLocale(locale: "en" | "ru") {
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = locale === "ru" ? "ru" : "en"
}
