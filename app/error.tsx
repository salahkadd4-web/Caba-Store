'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { WifiOff } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

/**
 * Erreur pendant le rendu d'une page (ex. coupure de la base de données).
 * Remplace l'écran brut « Application error » de Next.js ; la navigation
 * (Nav, barre du bas) reste en place autour.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n()
  const e = t.layout.errors

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 md:p-8 flex flex-col gap-4">
        <span className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center">
          <WifiOff className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{e.errorTitle}</h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">{e.errorDesc}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold transition-colors"
          >
            {e.retry}
          </button>
          <Link href="/" className="text-sm font-medium text-orange-700 dark:text-orange-400 hover:underline">
            {e.backHome}
          </Link>
        </div>
        {error.digest && <p className="text-xs text-stone-400">{t.returns.ref(error.digest)}</p>}
      </div>
    </div>
  )
}
