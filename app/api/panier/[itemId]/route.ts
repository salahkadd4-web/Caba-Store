import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { Prisma } from '@/generated/prisma/client'
import { getI18n } from '@/lib/i18n/server'
import { isQuantiteValide } from '@/lib/prix'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })
    const { itemId } = await params
    const { quantite, variantId, variantOptionId } = await req.json()

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: { select: { userId: true } },
        product: { select: { variants: { select: { id: true, options: { select: { id: true } } } } } },
      },
    })
    if (!item || item.cart.userId !== token.id) {
      return NextResponse.json({ error: t.api.unauthorized }, { status: 404 })
    }

    const data: Prisma.CartItemUpdateInput = {}
    if (quantite !== undefined) {
      if (!isQuantiteValide(quantite)) return NextResponse.json({ error: t.msg.invalidQuantity }, { status: 400 })
      data.quantite = quantite
    }

    // La variante et l'option doivent appartenir au produit de la ligne
    const variantCible = variantId !== undefined ? variantId : item.variantId
    if (variantId) {
      if (!item.product.variants.some(v => v.id === variantId)) {
        return NextResponse.json({ error: t.msg.variantNotFound }, { status: 404 })
      }
    }
    if (variantOptionId) {
      const options = item.product.variants
        .filter(v => !variantCible || v.id === variantCible)
        .flatMap(v => v.options)
      if (!options.some(o => o.id === variantOptionId)) {
        return NextResponse.json({ error: t.msg.optionNotFound }, { status: 404 })
      }
    }
    if (variantId       !== undefined) data.variant       = variantId       ? { connect: { id: variantId } }       : { disconnect: true }
    if (variantOptionId !== undefined) data.variantOption = variantOptionId ? { connect: { id: variantOptionId } } : { disconnect: true }

    await prisma.cartItem.update({ where: { id: itemId }, data })
    return NextResponse.json({ message: t.msg.cartUpdated })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { t } = await getI18n()
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })
    const { itemId } = await params

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { userId: true } } },
    })
    if (!item || item.cart.userId !== token.id) {
      return NextResponse.json({ error: t.api.unauthorized }, { status: 404 })
    }

    await prisma.cartItem.delete({ where: { id: itemId } })
    return NextResponse.json({ message: t.msg.removedFromCart })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
