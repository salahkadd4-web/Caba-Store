import Link from 'next/link'
import { Compass, Search } from 'lucide-react'
import { getI18n } from '@/lib/i18n/server'

/** 404 à la marque Caba Store (liens morts, produits supprimés…). */
export default async function NotFound() {
  const { t } = await getI18n()
  const e = t.layout.errors

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 md:p-8 flex flex-col gap-4">
        <span className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 flex items-center justify-center">
          <Compass className="w-6 h-6" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{e.notFoundTitle}</h1>
          <p className="mt-2 text-stone-600 dark:text-stone-400">{e.notFoundDesc}</p>
        </div>

        {/* Recherche : envoie vers le catalogue filtré */}
        <form action="/produits" method="get" role="search" className="flex items-center gap-2 h-11 px-3.5 rounded-xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 focus-within:ring-2 focus-within:ring-orange-700/30">
          <Search className="w-4 h-4 text-stone-400 shrink-0" />
          <input
            name="recherche"
            type="search"
            placeholder={t.layout.nav.searchProduct}
            aria-label={t.layout.nav.searchProduct}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-stone-800 dark:text-stone-100 placeholder-stone-400"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Link href="/" className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold transition-colors">
            {e.backHome}
          </Link>
          <Link href="/produits" className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800 text-sm font-semibold transition-colors">
            {e.seeProducts}
          </Link>
        </div>
      </div>
    </div>
  )
}
