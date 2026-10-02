import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VENDEUR_SUSPENDU_PRIORITE } from '@/lib/constants'
import { rankProducts, VENDEUR_RANK_SELECT } from '@/lib/product-ranking'
import { getViewerWilaya } from '@/lib/viewer'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ categories: [], produits: [] })
  }

  const [categories, produitsRaw, viewerWilaya] = await Promise.all([
    prisma.category.findMany({
      where: { nom: { contains: q, mode: 'insensitive' } },
      take: 4,
      select: { id: true, nom: true, image: true },
    }),
    prisma.product.findMany({
      where: {
        actif: true,
        nom: { contains: q, mode: 'insensitive' },
        OR: [
          { vendeurId: null },
          { vendeur: { prioriteAffichage: { lt: VENDEUR_SUSPENDU_PRIORITE } } },
        ],
      },
      // On prend plus pour trier puis limiter à 5
      take: 20,
      // Tri DB par date ; le classement complet se fait en JS (rankProducts)
      orderBy: [{ createdAt: 'desc' }],
      select: {
        id: true,
        nom: true,
        images: true,
        prix: true,
        createdAt: true,
        category: { select: { nom: true } },
        vendeur: VENDEUR_RANK_SELECT,
      },
    }),
    // Réponse non mise en cache : on peut lire la wilaya du visiteur en session
    getViewerWilaya(),
  ])

  // Priorité d'abonnement → wilaya du visiteur → date, puis limite à 5
  const produits = rankProducts(produitsRaw, viewerWilaya).slice(0, 5)

  return NextResponse.json({ categories, produits })
}
