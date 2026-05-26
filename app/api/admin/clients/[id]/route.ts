import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

// GET — Détails d'un client
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params

    const client = await prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { product: true } } },
        },
        _count: {
          select: {
            orders:    true,
            favorites: true,
          },
        },
      },
    })

    if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

    // Les retours sont gérés par Flowmerce — aucun champ local lié aux retours
    return NextResponse.json(client)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// DELETE — Supprimer un client
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { id } = await params

    await prisma.resetToken.deleteMany({ where: { userId: id } })
    await prisma.favorite.deleteMany({ where: { userId: id } })
    await prisma.cartItem.deleteMany({ where: { cart: { userId: id } } })
    await prisma.cart.deleteMany({ where: { userId: id } })
    await prisma.orderItem.deleteMany({ where: { order: { userId: id } } })
    await prisma.order.deleteMany({ where: { userId: id } })
    await prisma.user.delete({ where: { id } })

    return NextResponse.json({ message: 'Client supprimé' })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}