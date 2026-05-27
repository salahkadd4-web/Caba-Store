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

export async function GET(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const productId = req.nextUrl.searchParams.get('productId')
    if (!productId) {
      return NextResponse.json({ error: 'productId requis' }, { status: 400 })
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
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
