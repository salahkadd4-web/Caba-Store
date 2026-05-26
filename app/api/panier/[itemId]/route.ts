import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { Prisma } from '@/generated/prisma/client'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { itemId } = await params
    const { quantite, variantId, variantOptionId } = await req.json()

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { userId: true } } },
    })
    if (!item || item.cart.userId !== token.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 404 })
    }

    const data: Prisma.CartItemUpdateInput = {}
    if (quantite !== undefined) {
      if (quantite < 1) return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 })
      data.quantite = quantite
    }
    if (variantId       !== undefined) data.variant       = variantId       ? { connect: { id: variantId } }       : { disconnect: true }
    if (variantOptionId !== undefined) data.variantOption = variantOptionId ? { connect: { id: variantOptionId } } : { disconnect: true }

    await prisma.cartItem.update({ where: { id: itemId }, data })
    return NextResponse.json({ message: 'Panier mis à jour' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const token = await getAuthToken()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    const { itemId } = await params

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: { select: { userId: true } } },
    })
    if (!item || item.cart.userId !== token.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 404 })
    }

    await prisma.cartItem.delete({ where: { id: itemId } })
    return NextResponse.json({ message: 'Produit supprimé du panier' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
