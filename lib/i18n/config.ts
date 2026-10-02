/**
 * lib/i18n/config.ts
 * ------------------
 * Configuration des langues de l'application (français / arabe).
 * Importable côté client ET serveur.
 */

export const LOCALES = ['fr', 'ar'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'fr'

/** Cookie qui mémorise la langue choisie (lu par le serveur à chaque requête). */
export const LOCALE_COOKIE = 'lang'

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: 'Français',
  ar: 'العربية',
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value)
}

export function localeDir(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/** Locale BCP 47 utilisée par Intl (nombres, dates). ar-DZ garde les chiffres latins. */
export function intlLocale(locale: Locale): string {
  return locale === 'ar' ? 'ar-DZ' : 'fr-FR'
}
