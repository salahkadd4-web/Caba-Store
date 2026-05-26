// app/(admin)/admin/retours/page.tsx — CabaStore
// L'admin CabaStore consulte tous les retours via le dashboard admin Flowmerce.

import { auth }     from '@/auth'
import { redirect } from 'next/navigation'
import Link         from 'next/link'

const FLOWMERCE_URL = (process.env.FLOWMERCE_API_URL || 'https://flowmerce.app').replace(/\/$/, '')

export default async function AdminRetoursPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/connexion')

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-8 inline-flex items-center gap-1">
        ← Dashboard admin
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 mt-6">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">
          ↩
        </div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Retours — Vue globale
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          En tant qu&apos;admin CabaStore, vous pouvez consulter l&apos;ensemble des réclamations
          de tous vos vendeurs depuis le dashboard admin{' '}
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">Flowmerce</span>,
          avec la possibilité de filtrer par vendeur (clé API).
        </p>

        <div className="flex flex-col gap-3">
          {/* Lien principal → admin Flowmerce (ou login si non connecté) */}
          <a
            href={`${FLOWMERCE_URL}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition text-sm"
          >
            Consulter tous les retours via Flowmerce
            <span className="text-base">↗</span>
          </a>

          {/* Lien direct connexion si pas de session Flowmerce */}
          <a
            href={`${FLOWMERCE_URL}/auth/login`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium px-6 py-2.5 rounded-xl transition text-sm"
          >
            Se connecter à Flowmerce
            <span>↗</span>
          </a>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          Compte Flowmerce admin : utilisez les identifiants du compte CabaStore enregistré sur Flowmerce.
        </p>
      </div>
    </div>
  )
}