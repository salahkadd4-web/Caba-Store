import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { BarChart2, Package, ShoppingCart, Users, TrendingUp, ArrowRight, RefreshCw } from 'lucide-react'
import {
  card, cardSm, heading, subtext, kpiCard, kpiCardDark,
  tableWrapper, tableHead, tableTh, tableTd, tableRow,
  statutOrderColor,
} from '@/lib/dashboard-ui'

export default async function AdminPage() {
  const [
    totalProduits, totalClients, totalCommandes,
    commandesLivrees, chiffreAffaireBrut, dernieresCommandes,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.order.count(),
    prisma.order.count({ where: { statut: 'LIVREE' } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { statut: 'LIVREE' } }),
    prisma.order.findMany({
      take: 5, orderBy: { createdAt: 'desc' },
      include: { user: { select: { nom: true, prenom: true } } },
    }),
  ])

  const ca = chiffreAffaireBrut._sum.total || 0

  const kpis = [
    { href: '/admin/produits',  label: 'Produits',   value: totalProduits,   Icon: Package,      accent: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-950/40' },
    { href: '/admin/clients',   label: 'Clients',    value: totalClients,    Icon: Users,        accent: 'text-purple-600 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-950/40' },
    { href: '/commandes',       label: 'Commandes',  value: totalCommandes,  Icon: ShoppingCart, accent: 'text-blue-600   dark:text-blue-400',     bg: 'bg-blue-50   dark:bg-blue-950/40'   },
    { href: '/admin/stats',     label: 'Statistiques', value: '→',           Icon: TrendingUp,   accent: 'text-teal-600  dark:text-teal-400',     bg: 'bg-teal-50   dark:bg-teal-950/40'  },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className={heading}>Tableau de bord</h1>
        <p className={subtext}>Vue d&apos;ensemble de votre boutique</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ href, label, value, Icon, accent, bg }) => (
          <Link key={href} href={href} className={`${kpiCard} group`}>
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-1`}>
              <Icon className={`w-4 h-4 ${accent}`} />
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
            <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">{value}</p>
            <p className={`text-xs ${accent} flex items-center gap-0.5 mt-0.5`}>
              Voir tout <ArrowRight className="w-3 h-3" />
            </p>
          </Link>
        ))}
      </div>

      {/* CA + retours */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Link href="/commandes" className={`${kpiCardDark} hover:opacity-90 transition`}>
          <p className="text-xs text-stone-400 mb-1">Chiffre d&apos;affaires</p>
          <p className="text-2xl font-bold text-white">{ca.toLocaleString('fr-DZ')} DA</p>
          <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
            <ShoppingCart className="w-3 h-3" /> {commandesLivrees} commandes livrées
          </p>
        </Link>
        <Link href="/retours" className={`${cardSm} p-4 hover:border-stone-300 dark:hover:border-stone-600 transition group`}>
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center mb-1">
            <RefreshCw className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">Retours</p>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200 mt-1">
            Gérer via Flowmerce
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 flex items-center gap-0.5">
            Accéder <ArrowRight className="w-3 h-3" />
          </p>
        </Link>
      </div>

      {/* Dernières commandes */}
      <div className={tableWrapper}>
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-orange-600" />
            Dernières commandes
          </h2>
          <Link href="/commandes" className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5">
            Voir tout <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={tableHead}>
              <tr>
                <th className={tableTh}>Client</th>
                <th className={tableTh}>Référence</th>
                <th className={tableTh}>Montant</th>
                <th className={tableTh}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {dernieresCommandes.map((cmd) => (
                <tr key={cmd.id} className={tableRow}>
                  <td className={tableTd}>
                    <p className="font-medium text-stone-800 dark:text-stone-100">{cmd.user.prenom} {cmd.user.nom}</p>
                  </td>
                  <td className={tableTd}>
                    <span className="font-mono text-xs text-stone-500 dark:text-stone-400">#{cmd.id.slice(-6).toUpperCase()}</span>
                  </td>
                  <td className={tableTd}>
                    <span className="font-bold text-stone-800 dark:text-stone-100">{cmd.total.toFixed(0)} DA</span>
                  </td>
                  <td className={tableTd}>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statutOrderColor[cmd.statut] ?? 'bg-stone-100 text-stone-600'}`}>
                      {cmd.statut.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-stone-100 dark:divide-stone-800">
          {dernieresCommandes.map((cmd) => (
            <div key={cmd.id} className="px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{cmd.user.prenom} {cmd.user.nom}</p>
                <p className="text-xs font-mono text-stone-400 mt-0.5">#{cmd.id.slice(-6).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-stone-800 dark:text-stone-100">{cmd.total.toFixed(0)} DA</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statutOrderColor[cmd.statut] ?? 'bg-stone-100 text-stone-600'}`}>
                  {cmd.statut.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
