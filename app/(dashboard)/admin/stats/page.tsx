import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import BoutonInitProfilAdmin from '@/components/Boutoninitprofiladmin'
import { CreditCard, Gem, Moon, ShieldCheck, Star, Tag, TrendingDown, Trophy } from 'lucide-react'
import {
  heading, kpiCard, kpiCardDark, sectionHeading, tableWrapper,
} from '@/lib/dashboard-ui'
import { getI18n } from '@/lib/i18n/server'
import { FORFAIT_MENSUEL, NIVEAUX_VENDEUR, TAUX_COMMISSION } from '@/lib/billing-offers'

async function getStats() {

  // ── Toutes les requêtes indépendantes en parallèle ─────────────────────────
  const [
    totalClients, totalVendeurs, totalVendeursApprouves,
    totalProduits, totalCommandes, totalRetours, caData,
    topProduits, flopProduits,
    categories,
    vendeursRaw,
    clients,
    // Ventes par catégorie en une seule requête groupée
    ventesParCat,
    // CA et commandes par vendeur en deux requêtes groupées
    caParVendeur, nbParVendeur,
    // CA et retours par client en deux requêtes groupées
    caParClient, retoursParClient,
    // Abonnements groupés par niveau, formule et statut ; factures par niveau
    abonnementsGroupes,
    encaisseParNiveau,
    aEncaisserParNiveau,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'VENDEUR' } }),
    prisma.vendeurProfile.count({ where: { statut: 'APPROUVE' } }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { retourDemande: true } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { statut: 'LIVREE' } }),

    prisma.product.findMany({
      select: { id: true, nom: true, prix: true, images: true, category: { select: { nom: true } }, vendeur: { select: { nomBoutique: true } }, _count: { select: { orderItems: true } } },
      orderBy: { orderItems: { _count: 'desc' } }, take: 5,
    }),
    prisma.product.findMany({
      where: { orderItems: { some: {} } },
      select: { id: true, nom: true, prix: true, images: true, category: { select: { nom: true } }, vendeur: { select: { nomBoutique: true } }, _count: { select: { orderItems: true } } },
      orderBy: { orderItems: { _count: 'asc' } }, take: 5,
    }),

    prisma.category.findMany({
      where: { statut: 'APPROUVEE' },
      select: { id: true, nom: true, _count: { select: { products: true } } },
    }),

    prisma.vendeurProfile.findMany({
      where: { statut: 'APPROUVE' },
      include: { user: { select: { nom: true, prenom: true } }, _count: { select: { products: true } } },
    }),

    prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: { id: true, nom: true, prenom: true, email: true, _count: { select: { orders: true } } },
      take: 50,
    }),

    // Ventes par catégorie (1 requête groupée)
    prisma.$queryRaw<{ category_id: string; ventes: number }[]>`
      SELECT p."categoryId" AS category_id, COUNT(oi.id)::int AS ventes
      FROM "OrderItem" oi JOIN "Product" p ON p.id = oi."productId"
      GROUP BY p."categoryId"
    `,

    // CA par vendeur (commandes livrées)
    prisma.$queryRaw<{ vendeur_id: string; ca: number }[]>`
      SELECT p."vendeurId" AS vendeur_id,
             COALESCE(SUM(oi.prix * oi.quantite), 0)::float AS ca
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Order"   o ON o.id = oi."orderId"
      WHERE o.statut = 'LIVREE' AND p."vendeurId" IS NOT NULL
      GROUP BY p."vendeurId"
    `,
    // Nb commandes par vendeur
    prisma.$queryRaw<{ vendeur_id: string; nb: number }[]>`
      SELECT p."vendeurId" AS vendeur_id, COUNT(oi.id)::int AS nb
      FROM "OrderItem" oi JOIN "Product" p ON p.id = oi."productId"
      WHERE p."vendeurId" IS NOT NULL
      GROUP BY p."vendeurId"
    `,

    // CA par client (commandes livrées)
    prisma.$queryRaw<{ user_id: string; ca: number }[]>`
      SELECT o."userId" AS user_id,
             COALESCE(SUM(o.total), 0)::float AS ca
      FROM "Order" o WHERE o.statut = 'LIVREE'
      GROUP BY o."userId"
    `,
    // Retours par client
    prisma.$queryRaw<{ user_id: string; nb: number }[]>`
      SELECT o."userId" AS user_id, COUNT(o.id)::int AS nb
      FROM "Order" o WHERE o."retourDemande" = true
      GROUP BY o."userId"
    `,

    // Abonnements groupés (niveau + formule + statut)
    prisma.$queryRaw<{ niveau: string; mode: string; statut: string; nb: number }[]>`
      SELECT niveau, mode, statut, COUNT(id)::int AS nb FROM "Abonnement" GROUP BY niveau, mode, statut
    `,
    // Factures réglées par niveau
    prisma.$queryRaw<{ niveau: string; total: number }[]>`
      SELECT niveau, COALESCE(SUM(montant), 0)::float AS total FROM "Facture"
      WHERE statut = 'PAYEE' GROUP BY niveau
    `,
    // Factures à encaisser par niveau
    prisma.$queryRaw<{ niveau: string; total: number }[]>`
      SELECT niveau, COALESCE(SUM(montant), 0)::float AS total FROM "Facture"
      WHERE statut = 'EN_ATTENTE' GROUP BY niveau
    `,
  ])

  // ── Assemblage catégories ──────────────────────────────────────────────────
  const ventesMap = new Map(ventesParCat.map(r => [r.category_id, r.ventes]))
  const catsAvecVentes = categories
    .map(c => ({ ...c, ventes: ventesMap.get(c.id) ?? 0 }))
    .sort((a, b) => b.ventes - a.ventes)

  // ── Assemblage vendeurs ────────────────────────────────────────────────────
  const caVMap  = new Map(caParVendeur.map(r => [r.vendeur_id, r.ca]))
  const nbVMap  = new Map(nbParVendeur.map(r => [r.vendeur_id, r.nb]))
  const vendeursAvecCA = vendeursRaw
    .map(v => ({ ...v, ca: caVMap.get(v.id) ?? 0, nb: nbVMap.get(v.id) ?? 0 }))
    .sort((a, b) => b.ca - a.ca)

  // ── Assemblage clients ─────────────────────────────────────────────────────
  const caCMap  = new Map(caParClient.map(r => [r.user_id, r.ca]))
  const retMap  = new Map(retoursParClient.map(r => [r.user_id, r.nb]))
  const clientsAvecCA = clients
    .map(c => ({ ...c, ca: caCMap.get(c.id) ?? 0, retours: retMap.get(c.id) ?? 0 }))
    .sort((a, b) => b.ca - a.ca)

  // ── Assemblage abonnements ─────────────────────────────────────────────────
  const encMap = new Map(encaisseParNiveau.map(r => [r.niveau, r.total]))
  const aEncMap = new Map(aEncaisserParNiveau.map(r => [r.niveau, r.total]))

  const statsAbonnements = NIVEAUX_VENDEUR.map(niveau => {
    const rows = abonnementsGroupes.filter(r => r.niveau === niveau)
    const nb = (f: (r: typeof rows[number]) => boolean) => rows.filter(f).reduce((s, r) => s + r.nb, 0)
    return {
      niveau,
      total: nb(() => true),
      commission: nb(r => r.mode === 'COMMISSION'),
      forfait: nb(r => r.mode === 'FORFAIT'),
      bloques: nb(r => r.statut === 'BLOQUE'),
      encaisse: encMap.get(niveau) ?? 0,
      aEncaisser: aEncMap.get(niveau) ?? 0,
    }
  })

  return {
    resume: { totalClients, totalVendeurs, totalVendeursApprouves, totalProduits, totalCommandes, totalRetours, ca: caData._sum.total ?? 0 },
    topProduits, flopProduits,
    topCategories:  catsAvecVentes.slice(0, 5),
    flopCategories: [...catsAvecVentes].sort((a, b) => a.ventes - b.ventes).slice(0, 5),
    topVendeurs:    vendeursAvecCA.slice(0, 5),
    flopVendeurs:   [...vendeursAvecCA].sort((a, b) => a.ca - b.ca).slice(0, 5),
    topClients:     clientsAvecCA.slice(0, 5),
    flopClients:    clientsAvecCA.filter(c => c.ca > 0).sort((a, b) => a.ca - b.ca).slice(0, 5),
    statsAbonnements,
  }
}

// ── Tableau stat générique ────────────────────────────────────────────────────
type StatRow = { id: string; nom?: string; images?: string[] }

function StatTable<T extends StatRow>({ title, icon, rows, getValue, getLabel, getSubLabel, emptyLabel }: {
  title: string; icon: React.ElementType; rows: T[]
  getValue: (r: T) => string; getLabel: (r: T) => string; getSubLabel?: (r: T) => string
  emptyLabel: string
}) {
  const Icon = icon
  return (
    <div className={`${tableWrapper}`}>
      <div className="px-5 py-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2">
        <Icon className="w-4 h-4 text-stone-500 dark:text-stone-400" />
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{title}</h3>
      </div>
      <div className="divide-y divide-stone-50 dark:divide-stone-800">
        {rows.length === 0 ? (
          <p className="p-5 text-xs text-stone-400 text-center">{emptyLabel}</p>
        ) : rows.map((r, i) => (
          <div key={r.id} className="px-5 py-3 flex items-center gap-3">
            <span className={`text-sm font-semibold tabular-nums shrink-0 w-6 ${i < 3 ? 'text-stone-900 dark:text-stone-100' : 'text-stone-400 dark:text-stone-500'}`}>
              {i + 1}
            </span>
            {r.images?.[0] && (
              <Image src={r.images[0]} alt={r.nom ?? ''} width={40} height={40} className="w-10 h-10 rounded-xl object-contain p-1 bg-white shrink-0 border border-stone-200 dark:border-stone-700" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{getLabel(r)}</p>
              {getSubLabel && <p className="text-xs text-stone-400 truncate">{getSubLabel(r)}</p>}
            </div>
            <p className="text-sm font-bold text-stone-700 dark:text-stone-200 shrink-0">{getValue(r)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function AdminStatsPage() {
  const [session, { t, fmt }] = await Promise.all([auth(), getI18n()])
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/connexion')
  const s_ = t.admin.stats

  const stats = await getStats()

  const kpisResume = [
    { label: s_.totalRevenue,  value: fmt.price(stats.resume.ca), dark: true },
    { label: s_.orders,        value: stats.resume.totalCommandes },
    { label: s_.clients,       value: stats.resume.totalClients },
    { label: s_.activeSellers, value: `${stats.resume.totalVendeursApprouves} / ${stats.resume.totalVendeurs}` },
    { label: s_.products,      value: stats.resume.totalProduits },
    { label: s_.returns,       value: stats.resume.totalRetours },
  ]

  return (
    <div className="space-y-8">
      <h1 className={heading}>{s_.title}</h1>

      {/* KPIs résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpisResume.map(kpi => (
          kpi.dark ? (
            <div key={kpi.label} className={`${kpiCardDark} col-span-2 lg:col-span-1`}>
              <p className="text-xs text-stone-400">{kpi.label}</p>
              <p className="text-2xl font-semibold tabular-nums text-white mt-1">{String(kpi.value)}</p>
            </div>
          ) : (
            <div key={kpi.label} className={kpiCard}>
              <p className="text-xs text-stone-500 dark:text-stone-400">{kpi.label}</p>
              <p className="text-2xl font-semibold tabular-nums text-stone-900 dark:text-stone-50">{String(kpi.value)}</p>
            </div>
          )
        ))}
      </div>

      {/* Priorités admin */}
      <div>
        <h2 className={sectionHeading}><ShieldCheck className="w-4 h-4 text-stone-500 dark:text-stone-400" /> {s_.priorities}</h2>
        <BoutonInitProfilAdmin />
      </div>

      {/* Abonnements */}
      <div>
        <h2 className={sectionHeading}><CreditCard className="w-4 h-4 text-stone-500 dark:text-stone-400" /> {s_.subscriptions}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.statsAbonnements.map(a => {
            // Cartes neutres ; seul le niveau qui compte le plus de vendeurs est souligné en orange
            const plusUtilise = a.total > 0 && a.total === Math.max(...stats.statsAbonnements.map(x => x.total))
            const badge = plusUtilise
              ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-800 dark:text-orange-300'
              : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200'
            return (
              <div key={a.niveau} className={`bg-white dark:bg-stone-900 rounded-2xl p-5 space-y-4 ${plusUtilise ? 'border-2 border-orange-600 dark:border-orange-500' : 'border border-stone-200 dark:border-stone-800'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge}`}>{t.billing.levels[a.niveau]?.label ?? a.niveau}</span>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      {s_.offerPrices(Math.round(TAUX_COMMISSION[a.niveau] * 100), fmt.price(FORFAIT_MENSUEL[a.niveau]))}
                    </p>
                  </div>
                  <p className="text-3xl font-bold text-stone-800 dark:text-stone-100">{a.total}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { label: t.billing.modes.COMMISSION, value: a.commission, cls: 'bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200' },
                    { label: t.billing.modes.FORFAIT,    value: a.forfait,    cls: 'bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200' },
                    { label: s_.blocked,                 value: a.bloques,    cls: a.bloques > 0 ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' : 'bg-stone-50 dark:bg-stone-800/70 text-stone-700 dark:text-stone-200' },
                  ].map(x => (
                    <div key={x.label} className={`${x.cls} rounded-xl p-2 text-center`}>
                      <p className="font-bold text-base">{x.value}</p>
                      <p className="opacity-80">{x.label}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-100 dark:border-stone-800 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">{s_.collected}</span>
                    <span className="font-bold text-stone-800 dark:text-stone-100">{fmt.price(a.encaisse)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">{s_.toCollect}</span>
                    <span className={`font-bold ${a.aEncaisser > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-stone-800 dark:text-stone-100'}`}>{fmt.price(a.aEncaisser)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Produits */}
      <div>
        <h2 className={sectionHeading}>{s_.productsSection}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatTable emptyLabel={s_.noData} title={s_.bestProducts} icon={Trophy} rows={stats.topProduits}
            getLabel={r => r.nom} getSubLabel={r => `${r.category?.nom ?? '—'} • ${r.vendeur?.nomBoutique ?? s_.admin}`}
            getValue={r => s_.sales(r._count.orderItems)} />
          <StatTable emptyLabel={s_.noData} title={s_.worstProducts} icon={TrendingDown} rows={stats.flopProduits}
            getLabel={r => r.nom} getSubLabel={r => r.category?.nom ?? '—'}
            getValue={r => s_.sales(r._count.orderItems)} />
        </div>
      </div>

      {/* Catégories */}
      <div>
        <h2 className={sectionHeading}>{s_.categoriesSection}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatTable emptyLabel={s_.noData} title={s_.bestCategories} icon={Tag} rows={stats.topCategories}
            getLabel={r => r.nom} getSubLabel={r => s_.productsCount(r._count.products)}
            getValue={r => s_.sales(r.ventes)} />
          <StatTable emptyLabel={s_.noData} title={s_.worstCategories} icon={TrendingDown} rows={stats.flopCategories}
            getLabel={r => r.nom} getSubLabel={r => s_.productsCount(r._count.products)}
            getValue={r => s_.sales(r.ventes)} />
        </div>
      </div>

      {/* Vendeurs */}
      <div>
        <h2 className={sectionHeading}>{s_.sellersSection}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatTable emptyLabel={s_.noData} title={s_.bestSellers} icon={Star} rows={stats.topVendeurs}
            getLabel={r => r.nomBoutique || `${r.user.prenom} ${r.user.nom}`}
            getSubLabel={r => s_.ordersCount(r.nb)}
            getValue={r => fmt.price(r.ca)} />
          <StatTable emptyLabel={s_.noData} title={s_.leastActiveSellers} icon={Moon} rows={stats.flopVendeurs}
            getLabel={r => r.nomBoutique || `${r.user.prenom} ${r.user.nom}`}
            getSubLabel={r => s_.ordersCount(r.nb)}
            getValue={r => fmt.price(r.ca)} />
        </div>
      </div>

      {/* Clients */}
      <div>
        <h2 className={sectionHeading}>{s_.clientsSection}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatTable emptyLabel={s_.noData} title={s_.bestClients} icon={Gem} rows={stats.topClients}
            getLabel={r => `${r.prenom} ${r.nom}`}
            getSubLabel={r => s_.ordersAndReturns(r._count.orders, r.retours)}
            getValue={r => fmt.price(r.ca)} />
          <StatTable emptyLabel={s_.noData} title={s_.inactiveClients} icon={Moon} rows={stats.flopClients}
            getLabel={r => `${r.prenom} ${r.nom}`}
            getSubLabel={r => s_.ordersCount(r._count.orders)}
            getValue={r => fmt.price(r.ca)} />
        </div>
      </div>
    </div>
  )
}
