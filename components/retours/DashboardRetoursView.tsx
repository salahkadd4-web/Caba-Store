import Link from 'next/link'
import { Info } from 'lucide-react'

const FLOWMERCE_URL = process.env.FLOWMERCE_API_URL

export default function DashboardRetoursView({ isAdmin }: { isAdmin: boolean }) {
  if (!isAdmin) {
    // Vue Vendeur
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <Link href="/vendeur" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-8 inline-flex items-center gap-1">
          ← Dashboard
        </Link>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 mt-6">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">↩</div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Gestion des retours</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Les demandes de retour de vos clients sont centralisées et traitées par l&apos;équipe CabaStore. Vous serez notifié pour chaque décision concernant vos produits.
          </p>
          <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 rounded-xl p-4 text-left">
            <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Pour toute question sur un retour en particulier, contactez le support CabaStore.</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Vue Admin
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-8 inline-flex items-center gap-1">
        ← Dashboard admin
      </Link>
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-10 mt-6">
        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5">↩</div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Retours — Vue globale</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Consultez l&apos;ensemble des réclamations depuis le dashboard{' '}
          <span className="font-semibold text-indigo-600 dark:text-indigo-400">Flowmerce</span>, avec la possibilité de filtrer par vendeur.
        </p>
        <div className="flex flex-col gap-3">
          <a href={`${FLOWMERCE_URL}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition text-sm">
            Consulter tous les retours via Flowmerce <span className="text-base">↗</span>
          </a>
          <a href={`${FLOWMERCE_URL}/auth/login`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium px-6 py-2.5 rounded-xl transition text-sm">
            Se connecter à Flowmerce <span>↗</span>
          </a>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          Compte Flowmerce admin : utilisez les identifiants du compte CabaStore enregistré sur Flowmerce.
        </p>
      </div>
    </div>
  )
}
