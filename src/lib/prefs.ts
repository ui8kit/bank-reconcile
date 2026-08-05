const THEME_KEY = "bank-theme"
const LOCALE_KEY = "bank-locale"
const ADAPTER_KEY = "bank-adapter"

/** Fresh visits default to English; stored preference wins after first toggle. */
export const DEFAULT_LOCALE = "en" as const
export const DEFAULT_ADAPTER = "auto" as const

export type ThemeMode = "light" | "dark"
export type StoredAdapterChoice = "auto" | "generic" | "psb" | string

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

export function readStoredLocale(
  fallback: "en" | "ru" = DEFAULT_LOCALE,
): "en" | "ru" {
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

export function readStoredAdapter(
  fallback: StoredAdapterChoice = DEFAULT_ADAPTER,
): StoredAdapterChoice {
  try {
    const v = localStorage.getItem(ADAPTER_KEY)
    return v && v.trim() ? v : fallback
  } catch {
    return fallback
  }
}

export function storeAdapter(choice: StoredAdapterChoice) {
  try {
    localStorage.setItem(ADAPTER_KEY, choice)
  } catch {
    /* ignore */
  }
}
