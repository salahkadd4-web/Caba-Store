import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const statut = searchParams.get('statut')
  const search = searchParams.get('search') || ''

  const where: Prisma.VendeurProfileWhereInput = {}
  if (statut) where.statut = statut as Prisma.VendeurProfileWhereInput['statut']

  if (search) {
    where.OR = [
      { nomBoutique: { contains: search, mode: 'insensitive' } },
      { user: { nom:       { contains: search, mode: 'insensitive' } } },
      { user: { prenom:    { contains: search, mode: 'insensitive' } } },
      { user: { email:     { contains: search, mode: 'insensitive' } } },
      { user: { telephone: { contains: search, mode: 'insensitive' } } },  // ← NOUVEAU
    ]
  }

  const vendeurs = await prisma.vendeurProfile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, nom: true, prenom: true, email: true, telephone: true, createdAt: true },
      },
      documents: true,
      _count: { select: { products: true, categories: true } },
    },
  })

  const vendeursAvecStats = await Promise.all(
    vendeurs.map(async (v) => {
      const [totalCommandes, chiffreAffaire] = await Promise.all([
        prisma.orderItem.count({ where: { product: { vendeurId: v.id } } }),
        prisma.orderItem.aggregate({
          _sum: { prix: true },
          where: { product: { vendeurId: v.id }, order: { statut: 'LIVREE' } },
        }),
      ])
      return {
        ...v,
        totalCommandes,
        chiffreAffaire: chiffreAffaire._sum.prix ?? 0,
      }
    })
  )

  return NextResponse.json(vendeursAvecStats)
}