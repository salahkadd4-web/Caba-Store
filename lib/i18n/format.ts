/**
 * lib/i18n/format.ts
 * ------------------
 * Formatage des nombres, prix et dates selon la langue active.
 * Importable côté client ET serveur.
 */

import { intlLocale, type Locale } from './config'

const CURRENCY: Record<Locale, string> = { fr: 'DA', ar: 'دج', en: 'DA' }

export type Formatters = {
  /** Code Intl de la langue (fr-FR / ar-DZ / en-GB), pour les appels toLocale* existants. */
  intl: string
  /** Symbole de la devise : DA / دج */
  currency: string
  /** 1 500 → "1 500" (fr) / "1.500" (ar) */
  number: (n: number, opts?: Intl.NumberFormatOptions) => string
  /** Montant sans devise : 1500 → "1 500", 1499.5 → "1 499,5" (2 décimales au plus, jamais ".00") */
  money: (n: number) => string
  /** 1 500 → "1 500 DA" / "1.500 دج" */
  price: (n: number, opts?: Intl.NumberFormatOptions) => string
  /** Date longue : "2 octobre 2026" / "2 أكتوبر 2026" */
  date: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string
  /** Date + heure */
  dateTime: (d: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string
}

export function makeFormatters(locale: Locale): Formatters {
  const intl = intlLocale(locale)
  const currency = CURRENCY[locale]
  const number = (n: number, opts?: Intl.NumberFormatOptions) =>
    Number(n).toLocaleString(intl, opts)
  const money = (n: number) => number(n, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  return {
    intl,
    currency,
    number,
    money,
    price: (n, opts) => `${opts ? number(n, opts) : money(n)} ${currency}`,
    date: (d, opts) =>
      new Date(d).toLocaleDateString(intl, opts ?? { day: 'numeric', month: 'long', year: 'numeric' }),
    dateTime: (d, opts) =>
      new Date(d).toLocaleString(
        intl,
        opts ?? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
      ),
  }
}
