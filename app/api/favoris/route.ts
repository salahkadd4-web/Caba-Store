import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'

export async function GET(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const userId    = token.id as string
    const productId = req.nextUrl.searchParams.get('productId')

    // ── Mode ciblé : vérifier un seul produit ────────────────────────────────
    // Utilisé par FavoriButton et FavoriIconButton pour éviter de charger
    // toute la liste à chaque montage de composant.
    if (productId) {
      const existing = await prisma.favorite.findUnique({
        where: { userId_productId: { userId, productId } },
        select: { id: true },
      })
      return NextResponse.json({ isFavori: !!existing })
    }

    // ── Mode liste : page /favoris ────────────────────────────────────────────
    const favoris = await prisma.favorite.findMany({
      where:   { userId },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(favoris)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { produitId } = await req.json()

    // Vérifier si déjà en favoris
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_productId: {
          userId: token.id as string,
          productId: produitId,
        },
      },
    })

    if (existing) {
      // Retirer des favoris
      await prisma.favorite.delete({
        where: { id: existing.id },
      })
      return NextResponse.json({ message: 'Retiré des favoris', isFavori: false })
    }

    // Ajouter aux favoris
    await prisma.favorite.create({
      data: {
        userId: token.id as string,
        productId: produitId,
      },
    })

    return NextResponse.json({ message: 'Ajouté aux favoris', isFavori: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
