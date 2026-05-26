import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Store } from 'lucide-react'

export default async function VendeurDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') redirect('/connexion')

  const vendeur = await prisma.vendeurProfile.findUnique({
    where:   { userId: session.user.id },
    include: { documents: true },
  })

  if (!vendeur || vendeur.statut !== 'APPROUVE') return null

  const vid = vendeur.id

  const [
    totalProduits, produitsActifs,
    totalCommandes, commandesEnAttente,
    caData,
    top5,
  ] = await Promise.all([
    prisma.product.count({ where: { vendeurId: vid } }),
    prisma.product.count({ where: { vendeurId: vid, actif: true } }),
    prisma.orderItem.count({ where: { product: { vendeurId: vid } } }),
    prisma.order.count({ where: { statut: 'EN_ATTENTE', items: { some: { product: { vendeurId: vid } } } } }),
    prisma.orderItem.aggregate({
      _sum: { prix: true },
      where: { product: { vendeurId: vid }, order: { statut: 'LIVREE' } },
    }),
    prisma.product.findMany({
      where:   { vendeurId: vid },
      select:  { id: true, nom: true, prix: true, images: true, _count: { select: { orderItems: true } } },
      orderBy: { orderItems: { _count: 'desc' } },
      take:    5,
    }),
  ])

  const ca = caData._sum.prix ?? 0

  const dernieresCommandes = await prisma.order.findMany({
    where:   { items: { some: { product: { vendeurId: vid } } } },
    orderBy: { createdAt: 'desc' },
    take:    5,
    include: {
      user:  { select: { nom: true, prenom: true } },
      items: { where: { product: { vendeurId: vid } }, include: { product: { select: { nom: true } } } },
    },
  })

  const statutColor: Record<string, string> = {
    EN_ATTENTE:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
    CONFIRMEE:      'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    EN_PREPARATION: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
    EXPEDIEE:       'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
    LIVREE:         'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    ANNULEE:        'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
          Tableau de bord
        </h1>
        {vendeur.nomBoutique && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1"><Store className="w-4 h-4 inline mr-1" />{' '}{vendeur.nomBoutique}</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Link href="/vendeur/produits" className="group bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Produits</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalProduits}</p>
          <p className="text-xs text-emerald-500 mt-1">{produitsActifs} actifs →</p>
        </Link>

        <Link href="/vendeur/commandes" className="group bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Commandes</p>
          <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{totalCommandes}</p>
          {commandesEnAttente > 0 && (
            <p className="text-xs text-yellow-500 mt-1">{commandesEnAttente} en attente →</p>
          )}
        </Link>

        <Link href="/vendeur/retours" className="group bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-800 transition-all">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Retours</p>
          <ArrowUpRight className="w-7 h-7 text-red-500" />
          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1 group-hover:text-indigo-600">Flowmerce →</p>
        </Link>

        <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl p-4 border border-gray-800">
          <p className="text-xs text-gray-400 mb-1">Chiffre d&apos;affaires</p>
          <p className="text-xl font-bold">{ca.toLocaleString('fr-DZ')} DA</p>
          <p className="text-xs text-gray-400 mt-1">Commandes livrées</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dernières commandes */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Dernières commandes</h2>
            <Link href="/vendeur/commandes" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">Voir tout</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {dernieresCommandes.length === 0 ? (
              <p className="p-4 text-xs text-gray-400 text-center">Aucune commande</p>
            ) : dernieresCommandes.map((cmd) => (
              <div key={cmd.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
                    {cmd.user.prenom} {cmd.user.nom}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {cmd.items.map(i => i.product.nom).join(', ')}
                  </p>
                  <p className="text-xs text-gray-400">{new Date(cmd.createdAt).toLocaleDateString('fr-DZ')}</p>
                </div>
                <span className={`shrink-0 text-xs px-2 py-1 rounded-full font-medium ${statutColor[cmd.statut] || ''}`}>
                  {cmd.statut.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 produits */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Meilleurs produits</h2>
            <Link href="/vendeur/produits" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline">Voir tout</Link>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {top5.length === 0 ? (
              <p className="p-4 text-xs text-gray-400 text-center">Aucun produit</p>
            ) : top5.map((p, i) => (
              <div key={p.id} className="p-4 flex items-center gap-3">
                <span className="text-lg font-bold text-gray-300 dark:text-gray-600 w-6 shrink-0">
                  {i + 1}
                </span>
                {p.images[0] && (
                  <Image src={p.images[0]} alt={p.nom} width={32} height={32} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">{p.nom}</p>
                  <p className="text-xs text-gray-400">{p.prix.toLocaleString('fr-DZ')} DA</p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {p._count.orderItems} ventes
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}