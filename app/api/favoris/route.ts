import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'

export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

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
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

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
      return NextResponse.json({ message: t.msg.removedFromFavorites, isFavori: false })
    }

    // Ajouter aux favoris
    await prisma.favorite.create({
      data: {
        userId: token.id as string,
        productId: produitId,
      },
    })

    return NextResponse.json({ message: t.msg.addedToFavorites, isFavori: true })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
