// app/(vendeur)/vendeur/retours/page.tsx — CabaStore
//
// Les retours sont desormais centralises cote admin CabaStore.
// Cette page informe le vendeur et le redirige vers le support.

import { auth }     from '@/auth'
import { redirect } from 'next/navigation'
import Link         from 'next/link'
import { Info }     from 'lucide-react'

export default async function VendeurRetoursPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') redirect('/connexion')

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <Link
        href="/vendeur"
        className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-8 inline-flex items-center gap-1"
      >
        ← Dashboard
      </Link>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 mt-6">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">
          ↩
        </div>

        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Gestion des retours
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
          Les demandes de retour de vos clients sont desormais centralisees et traitees par
          l&apos;equipe CabaStore. Vous serez notifie pour chaque decision concernant
          vos produits.
        </p>

        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4 text-left">
          <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Pour toute question sur un retour en particulier, contactez le support CabaStore.
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}
