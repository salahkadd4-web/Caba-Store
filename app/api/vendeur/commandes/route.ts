import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!vendeur || vendeur.statut !== 'APPROUVE') {
    return NextResponse.json({ error: 'Compte non approuvé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statut     = searchParams.get('statut')
  const search     = searchParams.get('search') || ''
  const categoryId = searchParams.get('categoryId')

  const commandeWhere: Prisma.OrderWhereInput = {
    items: { some: { product: { vendeurId: vendeur.id } } },
  }

  if (statut) commandeWhere.statut = statut as Prisma.OrderWhereInput['statut']

  if (categoryId) {
    commandeWhere.items = {
      some: { product: { vendeurId: vendeur.id, categoryId } },
    }
  }

  if (search) {
    commandeWhere.OR = [
      { id:   { contains: search, mode: 'insensitive' } },
      { user: { nom:       { contains: search, mode: 'insensitive' } } },
      { user: { prenom:    { contains: search, mode: 'insensitive' } } },
      { user: { email:     { contains: search, mode: 'insensitive' } } },
      { user: { telephone: { contains: search, mode: 'insensitive' } } },  // ← NOUVEAU
    ]
  }

  const commandes = await prisma.order.findMany({
    where: commandeWhere,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, nom: true, prenom: true, email: true, telephone: true } },
      items: {
        where:   { product: { vendeurId: vendeur.id } },
        include: { variant: { select: { id: true, nom: true, couleur: true, images: true } }, product: { select: { id: true, nom: true, images: true, prix: true, prixVariables: true } } },
      },
    },
  })

  const commandesAvecTotal = commandes.map((cmd) => ({
    ...cmd,
    totalVendeur: cmd.items.reduce((sum, item) => sum + item.prix * item.quantite, 0),
  }))

  return NextResponse.json(commandesAvecTotal)
}