'use client'

import { createContext, useCallback, useContext, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  getI18nFor, localeDir, LOCALE_COOKIE, type I18n, type Locale,
} from '@/lib/i18n'

type I18nContextValue = I18n & {
  /** Change la langue : cookie + direction immédiate + re-rendu serveur. */
  setLocale: (locale: Locale) => void
  switching: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter()
  const [switching, startTransition] = useTransition()

  const setLocale = useCallback((next: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    // Applique tout de suite lang/dir pour éviter un flash de mise en page.
    document.documentElement.lang = next
    document.documentElement.dir  = localeDir(next)
    startTransition(() => router.refresh())
  }, [router])

  const value = useMemo<I18nContextValue>(
    () => ({ ...getI18nFor(locale), setLocale, switching }),
    [locale, setLocale, switching],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>')
  return ctx
}
