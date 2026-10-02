/**
 * lib/i18n/index.ts
 * -----------------
 * Point d'entrée des traductions. Les dictionnaires sont des objets TypeScript :
 * - le dictionnaire arabe est typé sur le français → une clé manquante est une
 *   erreur de compilation ;
 * - une valeur peut être une fonction (pluriels, interpolation).
 *
 * Usage :
 *   client  → const { t, fmt } = useI18n()          (components/I18nProvider)
 *   serveur → const { t, fmt } = await getI18n()    (lib/i18n/server)
 */

import fr from './fr'
import ar from './ar'
import { localeDir, type Locale } from './config'
import { makeFormatters, type Formatters } from './format'

export type { Dictionary } from './fr'
export * from './config'
export type { Formatters } from './format'

export const dictionaries = { fr, ar } as const

export type I18n = {
  locale: Locale
  dir: 'ltr' | 'rtl'
  t: typeof fr
  fmt: Formatters
}

/**
 * Traduit une valeur stockée en base (statut, méthode d'expédition…) via une table
 * du dictionnaire ; retombe sur la valeur brute si elle n'est pas répertoriée.
 */
export function tr(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return ''
  return map[key] ?? key
}

export function getI18nFor(locale: Locale): I18n {
  return { locale, dir: localeDir(locale), t: dictionaries[locale], fmt: makeFormatters(locale) }
}
