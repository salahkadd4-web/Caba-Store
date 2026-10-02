/**
 * GET /api/panier/check?productId=<id>
 *
 * Vérifie si un produit spécifique est dans le panier de l'utilisateur.
 * Retourne { inCart: boolean, cartItemId: string | null }
 *
 * Utilisé par CartIconButton pour éviter de charger tout le panier
 * à chaque montage de composant (problème de polling infini).
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma }        from '@/lib/prisma'
import { getAuthToken }  from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'

export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const productId = req.nextUrl.searchParams.get('productId')
    if (!productId) {
      return NextResponse.json({ error: t.msg.productIdRequired }, { status: 400 })
    }

    const panier = await prisma.cart.findUnique({
      where:  { userId: token.id as string },
      select: { id: true },
    })

    if (!panier) {
      return NextResponse.json({ inCart: false, cartItemId: null })
    }

    const item = await prisma.cartItem.findFirst({
      where:  { cartId: panier.id, productId },
      select: { id: true },
    })

    return NextResponse.json({
      inCart:     !!item,
      cartItemId: item?.id ?? null,
    })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
