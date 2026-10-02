import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'

// GET /api/vendeur/profil — Profil & statut du vendeur connecté
export async function GET() {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      documents: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!vendeur) {
    return NextResponse.json({ error: t.auth.api.sellerProfileNotFound }, { status: 404 })
  }

  return NextResponse.json(vendeur)
}

// PATCH /api/vendeur/profil — Mettre à jour nom boutique / description
export async function PATCH(req: NextRequest) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const body = await req.json()
  const { nomBoutique, description } = body

  const vendeur = await prisma.vendeurProfile.update({
    where: { userId: session.user.id },
    data: {
      ...(nomBoutique !== undefined && { nomBoutique }),
      ...(description !== undefined && { description }),
    },
  })

  return NextResponse.json(vendeur)
}
