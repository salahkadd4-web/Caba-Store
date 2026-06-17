import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getSellerBillingBreakdown, SELLER_SALE_FEE_RATE } from '@/lib/seller-billing'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Package, Percent, Receipt, ShoppingCart, TrendingUp, Store } from 'lucide-react'
import {
  heading, subtext, kpiCard, kpiCardDark,
  tableWrapper,
  statutOrderColor,
} from '@/lib/dashboard-ui'

export default async function VendeurDashboard() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') redirect('/connexion')

  const vendeur = await prisma.vendeurProfile.findUnique({
    where:   { userId: session.user.id },
    include: { documents: true, abonnement: true },
  })

  // Le layout (vendeur/layout.tsx) bloque déjà les vendeurs non approuvés.
  // On vérifie quand même pour TypeScript et pour éviter tout crash.
  if (!vendeur) return null

  const vid = vendeur.id

  const [
    totalProduits, produitsActifs,
    totalCommandes, commandesEnAttente,
    caData, top5,
  ] = await Promise.all([
    prisma.product.count({ where: { vendeurId: vid } }),
    prisma.product.count({ where: { vendeurId: vid, actif: true } }),
    prisma.orderItem.count({ where: { product: { vendeurId: vid } } }),
    prisma.order.count({ where: { statut: 'EN_ATTENTE', items: { some: { product: { vendeurId: vid } } } } }),
    prisma.$queryRaw<Array<{ total: number | null }>>`
      SELECT COALESCE(SUM(oi.prix * oi.quantite), 0)::float AS total
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE p."vendeurId" = ${vid}
        AND o.statut = 'LIVREE'
    `,
    prisma.product.findMany({
      where:   { vendeurId: vid },
      select:  { id: true, nom: true, prix: true, images: true, _count: { select: { orderItems: true } } },
      orderBy: { orderItems: { _count: 'desc' } },
      take:    5,
    }),
  ])

  const ca = caData[0]?.total ?? 0
  const billing = await getSellerBillingBreakdown(vendeur.id, vendeur.abonnement ?? null)

  const dernieresCommandes = await prisma.order.findMany({
    where:   { items: { some: { product: { vendeurId: vid } } } },
    orderBy: { createdAt: 'desc' },
    take:    5,
    include: {
      user:  { select: { nom: true, prenom: true } },
      items: { where: { product: { vendeurId: vid } }, include: { product: { select: { nom: true } } } },
    },
  })

  const kpis = [
    {
      href: '/vendeur/produits', label: 'Produits', value: totalProduits,
      sub: `${produitsActifs} actifs`,
      Icon: Package, accent: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40',
    },
    {
      href: '/commandes', label: 'Commandes', value: totalCommandes,
      sub: commandesEnAttente > 0 ? `${commandesEnAttente} en attente` : 'À jour',
      Icon: ShoppingCart, accent: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      href: '/vendeur/abonnement', label: 'Commission ventes', value: `${billing.salesFee.toLocaleString('fr-DZ')} DA`,
      sub: `${Math.round(SELLER_SALE_FEE_RATE * 100)}% sur ${billing.grossSales.toLocaleString('fr-DZ')} DA`,
      Icon: Percent, accent: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40',
    },
    {
      href: '/vendeur/abonnement', label: 'Total a payer', value: `${billing.totalDue.toLocaleString('fr-DZ')} DA`,
      sub: 'Abonnement + frais sur ventes',
      Icon: Receipt, accent: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className={heading}>Tableau de bord</h1>
        {vendeur.nomBoutique && (
          <p className={`${subtext} flex items-center gap-1.5 mt-0.5`}>
            <Store className="w-3.5 h-3.5" /> {vendeur.nomBoutique}
          </p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ href, label, value, sub, Icon, accent, bg }) => (
          <Link key={href} href={href} className={`${kpiCard} group`}>
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-1`}>
              <Icon className={`w-4 h-4 ${accent}`} />
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
            <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">{value}</p>
            <p className={`text-xs ${accent} mt-0.5`}>{sub}</p>
          </Link>
        ))}

        {/* CA */}
        <div className={`${kpiCardDark} col-span-2`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-stone-400 mb-1">Chiffre d&apos;affaires</p>
              <p className="text-2xl font-bold text-white">{ca.toLocaleString('fr-DZ')} DA</p>
              <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Commandes livrées
              </p>
            </div>
            <Link href="/vendeur/abonnement" className="text-xs text-emerald-400 hover:underline flex items-center gap-0.5 mt-1">
              Abonnement <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Dernières commandes */}
        <div className={tableWrapper}>
          <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <h2 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Dernières commandes</h2>
            <Link href="/commandes" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {dernieresCommandes.length === 0 ? (
              <p className="p-5 text-xs text-stone-400 text-center">Aucune commande</p>
            ) : dernieresCommandes.map((cmd) => (
              <div key={cmd.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">
                    {cmd.user.prenom} {cmd.user.nom}
                  </p>
                  <p className="text-xs text-stone-400 truncate">
                    {cmd.items.map(i => i.product.nom).join(', ')}
                  </p>
                  <p className="text-xs text-stone-400">{new Date(cmd.createdAt).toLocaleDateString('fr-DZ')}</p>
                </div>
                <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${statutOrderColor[cmd.statut] ?? 'bg-stone-100 text-stone-600'}`}>
                  {cmd.statut.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 produits */}
        <div className={tableWrapper}>
          <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <h2 className="font-semibold text-stone-800 dark:text-stone-100 text-sm">Meilleurs produits</h2>
            <Link href="/vendeur/produits" className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {top5.length === 0 ? (
              <p className="p-5 text-xs text-stone-400 text-center">Aucun produit</p>
            ) : top5.map((p, i) => (
              <div key={p.id} className="px-5 py-3.5 flex items-center gap-3">
                <span className={`text-lg font-bold w-6 shrink-0 ${
                  i === 0 ? 'text-yellow-400' : i === 1 ? 'text-stone-400' : i === 2 ? 'text-amber-600' : 'text-stone-300 dark:text-stone-600'
                }`}>{i + 1}</span>
                {p.images[0] && (
                  <Image src={p.images[0]} alt={p.nom} width={36} height={36}
                    className="w-9 h-9 rounded-xl object-cover shrink-0 border border-stone-100 dark:border-stone-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{p.nom}</p>
                  <p className="text-xs text-stone-400">{p.prix.toLocaleString('fr-DZ')} DA</p>
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
