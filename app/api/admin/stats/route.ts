import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  // ── 1. Métriques globales — 1 batch parallèle
  const [
    totalClients,
    totalVendeurs,
    totalVendeursApprouves,
    totalProduits,
    totalCommandes,
    caData,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'CLIENT' } }),
    prisma.user.count({ where: { role: 'VENDEUR' } }),
    prisma.vendeurProfile.count({ where: { statut: 'APPROUVE' } }),
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { total: true }, where: { statut: 'LIVREE' } }),
  ])

  // ── 2. Données brutes — 1 batch parallèle
  const [
    vendeursRaw,
    topProduits,
    flopProduits,
    categories,
    // CA par vendeur : 1 raw query groupée (Prisma groupBy ne traverse pas les relations)
    caParVendeur,
    // Nb commandes par vendeur : idem
    cmdParVendeur,
    // Ventes par catégorie : 1 raw query groupée
    ventesParCategorie,
    // CA par client : groupBy natif (userId direct sur Order)
    caParClient,
  ] = await Promise.all([
    prisma.vendeurProfile.findMany({
      where: { statut: 'APPROUVE' },
      select: {
        id: true,
        nomBoutique: true,
        user: { select: { nom: true, prenom: true, email: true } },
        _count: { select: { products: true } },
      },
    }),

    prisma.product.findMany({
      select: {
        id: true, nom: true, prix: true, images: true,
        category: { select: { nom: true } },
        vendeur:  { select: { nomBoutique: true } },
        _count:   { select: { orderItems: true } },
      },
      orderBy: { orderItems: { _count: 'desc' } },
      take: 10,
    }),

    prisma.product.findMany({
      where:   { orderItems: { some: {} } },
      select: {
        id: true, nom: true, prix: true, images: true,
        category: { select: { nom: true } },
        vendeur:  { select: { nomBoutique: true } },
        _count:   { select: { orderItems: true } },
      },
      orderBy: { orderItems: { _count: 'asc' } },
      take: 10,
    }),

    prisma.category.findMany({
      where:  { statut: 'APPROUVEE' },
      select: { id: true, nom: true, _count: { select: { products: true } } },
    }),

    // CA livré par vendeur — 1 seule requête SQL
    prisma.$queryRaw<{ vendeur_id: string; ca: number }[]>`
      SELECT p."vendeurId" AS vendeur_id,
             COALESCE(SUM(oi.prix * oi.quantite), 0)::float AS ca
      FROM   "OrderItem" oi
      JOIN   "Product"   p  ON p.id = oi."productId"
      JOIN   "Order"     o  ON o.id = oi."orderId"
      WHERE  o.statut = 'LIVREE'
        AND  p."vendeurId" IS NOT NULL
      GROUP  BY p."vendeurId"
    `,

    // Nb items commandés par vendeur — 1 seule requête SQL
    prisma.$queryRaw<{ vendeur_id: string; nb: number }[]>`
      SELECT p."vendeurId" AS vendeur_id,
             COUNT(oi.id)::int AS nb
      FROM   "OrderItem" oi
      JOIN   "Product"   p ON p.id = oi."productId"
      WHERE  p."vendeurId" IS NOT NULL
      GROUP  BY p."vendeurId"
    `,

    // Ventes (nb items) par catégorie — 1 seule requête SQL
    prisma.$queryRaw<{ category_id: string; ventes: number }[]>`
      SELECT p."categoryId" AS category_id,
             COUNT(oi.id)::int AS ventes
      FROM   "OrderItem" oi
      JOIN   "Product"   p ON p.id = oi."productId"
      GROUP  BY p."categoryId"
    `,

    // CA livré par client — groupBy natif Prisma (userId direct sur Order)
    prisma.order.groupBy({
      by:    ['userId'],
      _sum:  { total: true },
      where: { statut: 'LIVREE' },
    }),
  ])

  // ── 3. Jointures en mémoire (O(n) — pas de requêtes supplémentaires)

  // Vendeurs
  const caMap  = new Map(caParVendeur.map(r => [r.vendeur_id, r.ca]))
  const cmdMap = new Map(cmdParVendeur.map(r => [r.vendeur_id, r.nb]))

  const vendeursAvecCA = vendeursRaw
    .map(v => ({
      id:          v.id,
      nomBoutique: v.nomBoutique,
      user:        v.user,
      nbProduits:  v._count.products,
      nbCommandes: cmdMap.get(v.id) ?? 0,
      ca:          caMap.get(v.id)  ?? 0,
    }))
    .sort((a, b) => b.ca - a.ca)

  const meilleursVendeurs = vendeursAvecCA.slice(0, 5)
  const pireVendeurs      = [...vendeursAvecCA].sort((a, b) => a.ca - b.ca).slice(0, 5)

  // Catégories
  const ventesMap = new Map(ventesParCategorie.map(r => [r.category_id, r.ventes]))

  const catsAvecVentes = categories
    .map(c => ({ ...c, ventes: ventesMap.get(c.id) ?? 0 }))
    .sort((a, b) => b.ventes - a.ventes)

  const meilleuresCategories = catsAvecVentes.slice(0, 5)
  const piresCategories      = [...catsAvecVentes].sort((a, b) => a.ventes - b.ventes).slice(0, 5)

  // Clients — on a besoin des profils des top/flop clients seulement
  const caClientMap = new Map(caParClient.map(r => [r.userId, r._sum.total ?? 0]))

  // Récupérer les profils uniquement des clients qui ont commandé (max 10 ids)
  const clientsSorted = [...caClientMap.entries()].sort((a, b) => b[1] - a[1])
  const topClientIds  = clientsSorted.slice(0, 5).map(([id]) => id)
  const flopClientIds = clientsSorted.filter(([, ca]) => ca > 0).slice(-5).map(([id]) => id)
  const clientIds     = [...new Set([...topClientIds, ...flopClientIds])]

  const clientProfils = await prisma.user.findMany({
    where:  { id: { in: clientIds } },
    select: {
      id: true, nom: true, prenom: true, email: true, wilaya: true,
      _count: { select: { orders: true } },
    },
  })
  const profilMap = new Map(clientProfils.map(c => [c.id, c]))

  const toClientRow = (id: string) => {
    const p = profilMap.get(id)
    if (!p) return null
    return { ...p, ca: caClientMap.get(id) ?? 0 }
  }

  const meilleursClients = topClientIds.map(toClientRow).filter(Boolean)
  const piresClients     = flopClientIds.map(toClientRow).filter(Boolean)

  return NextResponse.json({
    resume: {
      totalClients,
      totalVendeurs,
      totalVendeursApprouves,
      totalProduits,
      totalCommandes,
      chiffreAffaire: caData._sum.total ?? 0,
    },
    vendeurs:   { meilleurs: meilleursVendeurs, pires: pireVendeurs },
    produits:   { top: topProduits, flop: flopProduits },
    categories: { meilleures: meilleuresCategories, pires: piresCategories },
    clients:    { meilleurs: meilleursClients, pires: piresClients },
  })
}
