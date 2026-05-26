import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/vendeur/stats
export async function GET() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!vendeur || vendeur.statut !== 'APPROUVE') {
    return NextResponse.json({ error: 'Compte non approuvé' }, { status: 403 })
  }

  const vid = vendeur.id

  const [
    totalProduits,
    produitsActifs,
    totalCommandes,
    commandesEnAttente,
    commandesLivrees,
    caData,
    top5Produits,
  ] = await Promise.all([
    prisma.product.count({ where: { vendeurId: vid } }),
    prisma.product.count({ where: { vendeurId: vid, actif: true } }),
    prisma.orderItem.count({ where: { product: { vendeurId: vid } } }),
    prisma.order.count({ where: { statut: 'EN_ATTENTE',  items: { some: { product: { vendeurId: vid } } } } }),
    prisma.order.count({ where: { statut: 'LIVREE',       items: { some: { product: { vendeurId: vid } } } } }),
    prisma.orderItem.aggregate({
      _sum: { prix: true },
      where: { product: { vendeurId: vid }, order: { statut: 'LIVREE' } },
    }),
    // Top 5 produits par ventes
    prisma.product.findMany({
      where: { vendeurId: vid },
      select: {
        id: true, nom: true, prix: true, images: true,
        _count: { select: { orderItems: true } },
      },
      orderBy: { orderItems: { _count: 'desc' } },
      take: 5,
    }),
    // CA par mois (12 derniers mois) — via raw aggregation
    prisma.orderItem.groupBy({
      by: ['orderId'],
      _sum: { prix: true },
      where: {
        product: { vendeurId: vid },
        order:   { statut: 'LIVREE', createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } },
      },
    }),
  ])

  const chiffreAffaire = caData._sum.prix ?? 0

  // 5 produits les moins vendus (avec au moins 1 vente)
  const flop5Produits = await prisma.product.findMany({
    where: { vendeurId: vid, orderItems: { some: {} } },
    select: {
      id: true, nom: true, prix: true, images: true,
      _count: { select: { orderItems: true } },
    },
    orderBy: { orderItems: { _count: 'asc' } },
    take: 5,
  })

  return NextResponse.json({
    totalProduits,
    produitsActifs,
    totalCommandes,
    commandesEnAttente,
    commandesLivrees,
    chiffreAffaire,
    top5Produits,
    flop5Produits,
  })
}
