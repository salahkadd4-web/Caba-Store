/**
 * lib/i18n/server.ts
 * ------------------
 * Résolution de la langue côté serveur (Server Components, Route Handlers).
 * Priorité : cookie `lang` → en-tête Accept-Language → français.
 */

import 'server-only'
import { cookies, headers } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config'
import { getI18nFor, type I18n } from './index'

export async function getLocale(): Promise<Locale> {
  const [cookieStore, hdrs] = await Promise.all([cookies(), headers()])
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie

  const accept = hdrs.get('accept-language') ?? ''
  if (/^\s*ar\b/i.test(accept)) return 'ar'
  if (/^\s*en\b/i.test(accept)) return 'en'
  return DEFAULT_LOCALE
}

export async function getI18n(): Promise<I18n> {
  return getI18nFor(await getLocale())
}
