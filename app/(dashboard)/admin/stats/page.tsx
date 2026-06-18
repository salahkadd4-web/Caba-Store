import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Image from 'next/image'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
import BoutonInitProfilAdmin from '@/components/Boutoninitprofiladmin'
import { CreditCard, Gem, Moon, ShieldCheck, Star, Tag, TrendingDown, Trophy } from 'lucide-react'
import {
  heading, kpiCard, kpiCardDark, sectionHeading,
  card, tableWrapper,
} from '@/lib/dashboard-ui'

async function getStats() {
  const now         = new Date()
  const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

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
    // Abonnements groupés par niveau+statut en une requête
    abonnementsGroupes,
    revenusParNiveau,
    bientotExpireParNiveau,
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

    // Abonnements groupés (niveau + statut)
    prisma.$queryRaw<{ niveau: string; statut: string; nb: number }[]>`
      SELECT niveau, statut, COUNT(id)::int AS nb FROM "Abonnement" GROUP BY niveau, statut
    `,
    // Revenus par niveau
    prisma.$queryRaw<{ niveau: string; revenu: number }[]>`
      SELECT a.niveau, COALESCE(SUM(p.montant), 0)::float AS revenu
      FROM "Paiement" p JOIN "Abonnement" a ON a.id = p."abonnementId"
      WHERE p."confirmeParAdmin" = true GROUP BY a.niveau
    `,
    // Bientôt expiré par niveau
    prisma.$queryRaw<{ niveau: string; nb: number }[]>`
      SELECT niveau, COUNT(id)::int AS nb FROM "Abonnement"
      WHERE statut IN ('ACTIF','GRATUIT') AND "dateFin" >= ${now} AND "dateFin" <= ${dans30Jours}
      GROUP BY niveau
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
  const NIVEAUX = ['NIVEAU_1', 'NIVEAU_2', 'NIVEAU_3'] as const
  const revNivMap  = new Map(revenusParNiveau.map(r => [r.niveau, r.revenu]))
  const expNivMap  = new Map(bientotExpireParNiveau.map(r => [r.niveau, r.nb]))

  const statsAbonnements = NIVEAUX.map(niveau => {
    const rows = abonnementsGroupes.filter(r => r.niveau === niveau)
    const get  = (s: string) => rows.find(r => r.statut === s)?.nb ?? 0
    const actif = get('ACTIF'); const gratuit = get('GRATUIT')
    const expire = get('EXPIRE'); const suspendu = get('SUSPENDU')
    return {
      niveau, actif, gratuit, expire, suspendu,
      total: actif + gratuit + expire + suspendu,
      bientotExpire: expNivMap.get(niveau) ?? 0,
      revenu: revNivMap.get(niveau) ?? 0,
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

function StatTable<T extends StatRow>({ title, icon, rows, getValue, getLabel, getSubLabel }: {
  title: string; icon: React.ElementType; rows: T[]
  getValue: (r: T) => string; getLabel: (r: T) => string; getSubLabel?: (r: T) => string
}) {
  const Icon = icon
  return (
    <div className={`${tableWrapper}`}>
      <div className="px-5 py-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center gap-2">
        <Icon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">{title}</h3>
      </div>
      <div className="divide-y divide-stone-50 dark:divide-stone-800">
        {rows.length === 0 ? (
          <p className="p-5 text-xs text-stone-400 text-center">Aucune donnée</p>
        ) : rows.map((r, i) => (
          <div key={r.id} className="px-5 py-3 flex items-center gap-3">
            <span className={`text-lg font-bold shrink-0 w-6 ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-stone-400' : i === 2 ? 'text-amber-600' : 'text-stone-300 dark:text-stone-600'}`}>
              {i + 1}
            </span>
            {r.images?.[0] && (
              <Image src={r.images[0]} alt={r.nom ?? ''} width={32} height={32} className="w-8 h-8 rounded-xl object-cover shrink-0 border border-stone-100 dark:border-stone-800" />
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
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') redirect('/connexion')

  const stats = await getStats()

  const kpisResume = [
    { label: 'CA Total',        value: `${stats.resume.ca.toLocaleString('fr-DZ')} DA`, dark: true },
    { label: 'Commandes',       value: stats.resume.totalCommandes },
    { label: 'Clients',         value: stats.resume.totalClients },
    { label: 'Vendeurs actifs', value: `${stats.resume.totalVendeursApprouves} / ${stats.resume.totalVendeurs}` },
    { label: 'Produits',        value: stats.resume.totalProduits },
    { label: 'Retours',         value: stats.resume.totalRetours },
  ]

  return (
    <div className="space-y-8">
      <h1 className={heading}>Statistiques avancées</h1>

      {/* KPIs résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpisResume.map(kpi => (
          kpi.dark ? (
            <div key={kpi.label} className={`${kpiCardDark} col-span-2 lg:col-span-1`}>
              <p className="text-xs text-stone-400">{kpi.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{String(kpi.value)}</p>
            </div>
          ) : (
            <div key={kpi.label} className={kpiCard}>
              <p className="text-xs text-stone-500 dark:text-stone-400">{kpi.label}</p>
              <p className="text-2xl font-bold text-stone-800 dark:text-stone-100">{String(kpi.value)}</p>
            </div>
          )
        ))}
      </div>

      {/* Priorités admin */}
      <div>
        <h2 className={sectionHeading}><ShieldCheck className="w-4 h-4 text-purple-600" /> Priorités d&apos;affichage vendeurs</h2>
        <BoutonInitProfilAdmin />
      </div>

      {/* Abonnements */}
      <div>
        <h2 className={sectionHeading}><CreditCard className="w-4 h-4 text-teal-600" /> Abonnements vendeurs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.statsAbonnements.map(a => {
            const cfg = {
              NIVEAU_1: { label: 'Niveau 1', tarif: '3 000 DA/mois', border: 'border-purple-300 dark:border-purple-700', badge: 'bg-purple-600 text-white' },
              NIVEAU_2: { label: 'Niveau 2', tarif: '4 000 DA/mois', border: 'border-blue-300 dark:border-blue-700',     badge: 'bg-blue-500 text-white'   },
              NIVEAU_3: { label: 'Niveau 3', tarif: '5 000 DA/mois', border: 'border-stone-300 dark:border-stone-600',   badge: 'bg-stone-500 text-white'  },
            }[a.niveau]!
            const tauxActif = a.total > 0 ? Math.round(((a.actif + a.gratuit) / a.total) * 100) : 0
            return (
              <div key={a.niveau} className={`bg-white dark:bg-stone-900 rounded-2xl border-2 ${cfg.border} p-5 space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
                    <p className="text-xs text-stone-400 mt-1">{cfg.tarif}</p>
                  </div>
                  <p className="text-3xl font-bold text-stone-800 dark:text-stone-100">{a.total}</p>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Taux actifs</span><span className="font-medium">{tauxActif}%</span>
                  </div>
                  <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-teal-500 transition-all" style={{ width: `${tauxActif}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Actifs',    value: a.actif,   cls: 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300'     },
                    { label: 'Gratuits',  value: a.gratuit, cls: 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300'  },
                    { label: 'Expirés',   value: a.expire,  cls: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'         },
                    { label: 'Suspendus', value: a.suspendu,cls: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'},
                  ].map(s => (
                    <div key={s.label} className={`${s.cls} rounded-xl p-2 text-center`}>
                      <p className="font-bold text-base">{s.value}</p>
                      <p className="opacity-80">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-100 dark:border-stone-800 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Revenus encaissés</span>
                    <span className="font-bold text-stone-800 dark:text-stone-100">{a.revenu.toLocaleString('fr-DZ')} DA</span>
                  </div>
                  {a.bientotExpire > 0 && (
                    <div className="flex justify-between">
                      <span className="text-orange-500">⚠ Expirent dans 30j</span>
                      <span className="font-bold text-orange-600">{a.bientotExpire}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Produits */}
      <div>
        <h2 className={sectionHeading}>Produits</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatTable title="Meilleurs produits" icon={Trophy} rows={stats.topProduits}
            getLabel={r => r.nom} getSubLabel={r => `${r.category?.nom ?? '—'} • ${r.vendeur?.nomBoutique ?? 'Admin'}`}
            getValue={r => `${r._count.orderItems} ventes`} />
          <StatTable title="Produits les moins vendus" icon={TrendingDown} rows={stats.flopProduits}
            getLabel={r => r.nom} getSubLabel={r => r.category?.nom ?? '—'}
            getValue={r => `${r._count.orderItems} ventes`} />
        </div>
      </div>

      {/* Catégories */}
      <div>
        <h2 className={sectionHeading}>Catégories</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatTable title="Meilleures catégories" icon={Tag} rows={stats.topCategories}
            getLabel={r => r.nom} getSubLabel={r => `${r._count.products} produits`}
            getValue={r => `${r.ventes} ventes`} />
          <StatTable title="Catégories les moins vendues" icon={TrendingDown} rows={stats.flopCategories}
            getLabel={r => r.nom} getSubLabel={r => `${r._count.products} produits`}
            getValue={r => `${r.ventes} ventes`} />
        </div>
      </div>

      {/* Vendeurs */}
      <div>
        <h2 className={sectionHeading}>Vendeurs</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatTable title="Meilleurs vendeurs" icon={Star} rows={stats.topVendeurs}
            getLabel={r => r.nomBoutique || `${r.user.prenom} ${r.user.nom}`}
            getSubLabel={r => `${r.nb} commandes`}
            getValue={r => `${r.ca.toLocaleString('fr-DZ')} DA`} />
          <StatTable title="Vendeurs les moins actifs" icon={Moon} rows={stats.flopVendeurs}
            getLabel={r => r.nomBoutique || `${r.user.prenom} ${r.user.nom}`}
            getSubLabel={r => `${r.nb} commandes`}
            getValue={r => `${r.ca.toLocaleString('fr-DZ')} DA`} />
        </div>
      </div>

      {/* Clients */}
      <div>
        <h2 className={sectionHeading}>Clients</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatTable title="Meilleurs clients" icon={Gem} rows={stats.topClients}
            getLabel={r => `${r.prenom} ${r.nom}`}
            getSubLabel={r => `${r._count.orders} commandes · ${r.retours} retour(s)`}
            getValue={r => `${r.ca.toLocaleString('fr-DZ')} DA`} />
          <StatTable title="Clients inactifs" icon={Moon} rows={stats.flopClients}
            getLabel={r => `${r.prenom} ${r.nom}`}
            getSubLabel={r => `${r._count.orders} commandes`}
            getValue={r => `${r.ca.toLocaleString('fr-DZ')} DA`} />
        </div>
      </div>
    </div>
  )
}
