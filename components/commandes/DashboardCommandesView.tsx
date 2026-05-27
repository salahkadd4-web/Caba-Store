import Link from 'next/link'

type Commande = {
  id:        string
  createdAt: Date
  statut:    string
  total:     number
  user?:     { nom: string | null; prenom: string | null; email: string | null } | null
  items:     { id: string }[]
}

const statutColors: Record<string, string> = {
  EN_ATTENTE:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  CONFIRMEE:      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  EN_PREPARATION: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  EXPEDIEE:       'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
  LIVREE:         'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  ANNULEE:        'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  RETOURNEE:      'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

const statutLabel: Record<string, string> = {
  EN_ATTENTE:     'En attente',
  CONFIRMEE:      'Confirmée',
  EN_PREPARATION: 'En préparation',
  EXPEDIEE:       'Expédiée',
  LIVREE:         'Livrée',
  ANNULEE:        'Annulée',
  RETOURNEE:      'Retournée',
}

export default function DashboardCommandesView({
  commandes,
  isAdmin,
}: {
  commandes: Commande[]
  isAdmin: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">Commandes</h1>
        <span className="text-sm text-gray-400 dark:text-gray-500">
          {commandes.length} commande{commandes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {commandes.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-16 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Aucune commande pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Référence</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Articles</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {commandes.map(cmd => (
                  <tr key={cmd.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      {isAdmin ? (
                        <Link href={`/admin/commandes/${cmd.id}`} className="font-mono text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                          #{cmd.id.slice(-8).toUpperCase()}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">#{cmd.id.slice(-8).toUpperCase()}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {cmd.user?.prenom} {cmd.user?.nom}
                      {isAdmin && <div className="text-xs text-gray-400 dark:text-gray-500">{cmd.user?.email}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {new Date(cmd.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {cmd.items.length} article{cmd.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
                      {Number(cmd.total).toLocaleString('fr-DZ')} DA
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statutColors[cmd.statut] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statutLabel[cmd.statut] ?? cmd.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
