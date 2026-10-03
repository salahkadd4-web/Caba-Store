import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'
import { isProduitVisible } from '@/lib/product-visibility'
import { isQuantiteValide } from '@/lib/prix'

export async function GET() {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

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
                vendeur: {
                  select: {
                    id: true,
                    nomBoutique: true,
                    user: {
                      select: { nom: true, prenom: true, telephone: true, email: true, wilaya: true },
                    },
                  },
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
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { produitId, quantite = 1, variantId, variantOptionId } = await req.json()

    if (!isQuantiteValide(quantite)) {
      return NextResponse.json({ error: t.msg.invalidQuantity }, { status: 400 })
    }
    if (typeof produitId !== 'string') {
      return NextResponse.json({ error: t.msg.productIdRequired }, { status: 400 })
    }

    const produit = await prisma.product.findUnique({
      where: { id: produitId },
      include: {
        variants: { include: { options: true } },
        vendeur:  { select: { statut: true, prioriteAffichage: true } },
      },
    })
    // Un produit masqué (désactivé, vendeur suspendu ou abonnement expiré) n'est pas achetable
    if (!produit || !isProduitVisible(produit)) {
      return NextResponse.json({ error: t.msg.productNotFound }, { status: 404 })
    }

    // Vérifier stock (l'option doit appartenir à la variante choisie, la variante au produit)
    let stockDispo: number
    if (variantOptionId) {
      const option = produit.variants
        .filter(v => !variantId || v.id === variantId)
        .flatMap(v => v.options)
        .find(o => o.id === variantOptionId)
      if (!option) return NextResponse.json({ error: t.msg.optionNotFound }, { status: 404 })
      if (option.stock === 0) return NextResponse.json({ error: t.msg.optionOutOfStock }, { status: 400 })
      stockDispo = option.stock
    } else if (variantId) {
      const variant = produit.variants.find(v => v.id === variantId)
      if (!variant) return NextResponse.json({ error: t.msg.variantNotFound }, { status: 404 })
      if (variant.stock === 0) return NextResponse.json({ error: t.msg.variantOutOfStock }, { status: 400 })
      stockDispo = variant.stock
    } else {
      if (produit.stock === 0) return NextResponse.json({ error: t.msg.productOutOfStock }, { status: 400 })
      stockDispo = produit.stock
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
        // Jamais plus que le stock disponible
        data:  { quantite: Math.min(itemExistant.quantite + quantite, stockDispo) },
        select: { id: true },
      })
      cartItemId = updated.id
    } else {
      const created = await prisma.cartItem.create({
        data: {
          cartId:         panier.id,
          productId:      produitId,
          quantite:       Math.min(quantite, stockDispo),
          variantId:      variantId || null,
          variantOptionId: variantOptionId || null,
        },
        select: { id: true },
      })
      cartItemId = created.id
    }
    // On retourne l'id du cartItem pour éviter un re-fetch côté client
    return NextResponse.json({ message: t.msg.addedToCart, cartItemId })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}