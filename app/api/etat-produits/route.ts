/**
 * GET /api/etat-produits?productIds=<id1>,<id2>,<id3>
 *
 * Vérifie en UNE SEULE requête l'état favoris + panier d'une liste de produits.
 * Retourne : { [productId]: { isFavori, inCart, cartItemId } }
 *
 * Remplace les requêtes N+1 de /api/favoris?productId= et /api/panier/check
 * faites par chaque carte produit (FavoriIconButton, CartIconButton).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'

export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const productIds = (req.nextUrl.searchParams.get('productIds') ?? '')
      .split(',')
      .map(id => id.trim())
      .filter(Boolean)

    if (productIds.length === 0) {
      return NextResponse.json({ error: t.msg.productIdsRequired }, { status: 400 })
    }
    if (productIds.length > 100) {
      return NextResponse.json({ error: t.msg.tooManyProducts }, { status: 400 })
    }

    const userId = token.id as string

    const [favoris, panier] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId, productId: { in: productIds } },
        select: { productId: true },
      }),
      prisma.cart.findUnique({
        where: { userId },
        select: { id: true },
      }),
    ])

    const favoriSet = new Set(favoris.map(f => f.productId))

    const cartItemMap = new Map<string, string>()
    if (panier) {
      const items = await prisma.cartItem.findMany({
        where: { cartId: panier.id, productId: { in: productIds } },
        select: { id: true, productId: true },
      })
      for (const item of items) {
        if (!cartItemMap.has(item.productId)) cartItemMap.set(item.productId, item.id)
      }
    }

    const result: Record<string, { isFavori: boolean; inCart: boolean; cartItemId: string | null }> = {}
    for (const pid of productIds) {
      result[pid] = {
        isFavori:     favoriSet.has(pid),
        inCart:       cartItemMap.has(pid),
        cartItemId:   cartItemMap.get(pid) ?? null,
      }
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
