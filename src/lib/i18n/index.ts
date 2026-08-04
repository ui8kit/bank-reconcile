import en from "../../fixtures/locale/en.json"
import ru from "../../fixtures/locale/ru.json"

export type Locale = "en" | "ru"
export type Dict = typeof en

const dictionaries: Record<Locale, Dict> = { en, ru }

export const LOCALES: Locale[] = ["en", "ru"]

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ru"
}

export function getDict(locale: Locale): Dict {
  return dictionaries[locale]
}

export function nextLocale(locale: Locale): Locale {
  return locale === "en" ? "ru" : "en"
}

export function amountLocale(locale: Locale): string {
  return locale === "ru" ? "ru-RU" : "en-US"
}
