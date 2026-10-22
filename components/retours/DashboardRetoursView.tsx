import Link from 'next/link'
import { Info } from 'lucide-react'
import { getI18n } from '@/lib/i18n/server'

const FLOWMERCE_URL = process.env.FLOWMERCE_API_URL

export default async function DashboardRetoursView({ isAdmin }: { isAdmin: boolean }) {
  const { t } = await getI18n()
  const d = t.returns.dashboard
  if (!isAdmin) {
    // Vue Vendeur
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Link href="/vendeur" className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 mb-8 inline-flex items-center gap-1">
          {d.backDashboard}
        </Link>
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-10 mt-6">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">↩</div>
          <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">{d.sellerTitle}</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
            {d.sellerDesc}
          </p>
          <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-4 text-start">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{d.sellerSupport}</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Vue Admin
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <Link href="/admin" className="text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 mb-8 inline-flex items-center gap-1">
        {d.backAdmin}
      </Link>
      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-10 mt-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">↩</div>
        <h1 className="text-xl font-bold text-stone-800 dark:text-stone-100 mb-2">{d.adminTitle}</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-8 leading-relaxed">
          {d.adminDescBefore}{' '}
          <span className="font-semibold text-blue-600 dark:text-blue-400">Flowmerce</span>{d.adminDescAfter}
        </p>
        <div className="flex flex-col gap-3">
          <a href={`${FLOWMERCE_URL}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition text-sm">
            {d.viewAll} <span className="text-base">↗</span>
          </a>
          <a href={`${FLOWMERCE_URL}/auth/login`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 font-medium px-6 py-2.5 rounded-xl transition text-sm">
            {d.login} <span>↗</span>
          </a>
        </div>
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-6">
          {d.adminAccount}
        </p>
      </div>
    </div>
  )
}
