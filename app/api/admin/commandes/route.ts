import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { Prisma } from '@/generated/prisma/client'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

export async function GET(req: NextRequest) {
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const vendeurId  = searchParams.get('vendeurId')   // filtre par vendeur spécifique
    const adminOnly  = searchParams.get('adminOnly') === 'true' // filtre produits admin (vendeurId null)
    const statut    = searchParams.get('statut')       // ← NOUVEAU filtre statut
    const search    = searchParams.get('search') || '' // ← NOUVEAU filtre recherche

    // Construction dynamique du WHERE
    const where: Prisma.OrderWhereInput = {}

    // Filtre par vendeur spécifique
    if (vendeurId) {
      where.items = { some: { product: { vendeurId } } }
    }

    // Filtre commandes admin uniquement (produits sans vendeur = vendeurId null)
    if (adminOnly) {
      where.items = { some: { product: { vendeurId: null } } }
    }

    // Filtre par statut
    if (statut) {
      where.statut = statut as Prisma.OrderWhereInput['statut']
    }

    // Filtre par recherche (nom client ou ID)
    if (search) {
      where.OR = [
        { id:   { contains: search, mode: 'insensitive' } },
        { user: { nom:    { contains: search, mode: 'insensitive' } } },
        { user: { prenom: { contains: search, mode: 'insensitive' } } },
        { user: { email:  { contains: search, mode: 'insensitive' } } },
      ]
    }

    const commandes = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { nom: true, prenom: true, email: true, telephone: true } },
        items: {
          include: {
            variant: { select: { id: true, nom: true, couleur: true, images: true } },
            product: {
              include: {
                vendeur: { select: { id: true, nomBoutique: true } },
              },
            },
          },
        },
      },
    })

    return NextResponse.json(commandes)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}