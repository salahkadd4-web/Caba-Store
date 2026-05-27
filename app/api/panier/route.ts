import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'

export async function GET() {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const panier = await prisma.cart.findUnique({
      where: { userId: token.id as string },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                variants: {
                  include: { options: { orderBy: { createdAt: 'asc' } } },
                  orderBy: { createdAt: 'asc' },
                },
              },
            },
            variant: { include: { options: { orderBy: { createdAt: 'asc' } } } },
            variantOption: true,
          },
        },
      },
    })
    return NextResponse.json(panier)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { produitId, quantite = 1, variantId, variantOptionId } = await req.json()

    const produit = await prisma.product.findUnique({
      where: { id: produitId },
      include: { variants: { include: { options: true } } },
    })
    if (!produit) return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })

    // Vérifier stock
    if (variantOptionId) {
      const option = produit.variants
        .flatMap(v => v.options)
        .find(o => o.id === variantOptionId)
      if (!option) return NextResponse.json({ error: 'Option introuvable' }, { status: 404 })
      if (option.stock === 0) return NextResponse.json({ error: 'Option en rupture de stock' }, { status: 400 })
    } else if (variantId) {
      const variant = produit.variants.find(v => v.id === variantId)
      if (!variant) return NextResponse.json({ error: 'Variante introuvable' }, { status: 404 })
      if (variant.stock === 0) return NextResponse.json({ error: 'Variante en rupture de stock' }, { status: 400 })
    } else {
      if (produit.stock === 0) return NextResponse.json({ error: 'Produit en rupture de stock' }, { status: 400 })
    }

    let panier = await prisma.cart.findUnique({ where: { userId: token.id as string } })
    if (!panier) panier = await prisma.cart.create({ data: { userId: token.id as string } })

    const itemExistant = await prisma.cartItem.findFirst({
      where: {
        cartId: panier.id,
        productId: produitId,
        variantId: variantId || null,
        variantOptionId: variantOptionId || null,
      },
    })

    let cartItemId: string

    if (itemExistant) {
      const updated = await prisma.cartItem.update({
        where: { id: itemExistant.id },
        data:  { quantite: itemExistant.quantite + quantite },
        select: { id: true },
      })
      cartItemId = updated.id
    } else {
      const created = await prisma.cartItem.create({
        data: {
          cartId:         panier.id,
          productId:      produitId,
          quantite,
          variantId:      variantId || null,
          variantOptionId: variantOptionId || null,
        },
        select: { id: true },
      })
      cartItemId = created.id
    }
    // On retourne l'id du cartItem pour éviter un re-fetch côté client
    return NextResponse.json({ message: 'Produit ajouté au panier', cartItemId })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
