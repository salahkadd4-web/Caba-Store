import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'

// GET /api/vendeur/categories
// Retourne : mes propositions + toutes les catégories approuvées
export async function GET() {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!vendeur) {
    return NextResponse.json({ error: t.auth.api.sellerProfileNotFound }, { status: 404 })
  }

  const [mesCats, approuvees] = await Promise.all([
    // Catégories proposées par ce vendeur (tous statuts)
    prisma.category.findMany({
      where: { vendeurId: vendeur.id },
      select: { id: true, nom: true, statut: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    // Toutes les catégories approuvées (admin + vendeurs validés)
    prisma.category.findMany({
      where: { statut: 'APPROUVEE' },
      select: { id: true, nom: true, image: true },
      orderBy: { nom: 'asc' },
    }),
  ])

  return NextResponse.json({ mesCats, approuvees })
}

// POST /api/vendeur/categories
// Proposer une nouvelle catégorie (statut EN_ATTENTE par défaut)
export async function POST(req: NextRequest) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!vendeur) {
    return NextResponse.json({ error: t.auth.api.sellerProfileNotFound }, { status: 404 })
  }

  // Seul un vendeur APPROUVÉ peut proposer des catégories
  if (vendeur.statut !== 'APPROUVE') {
    return NextResponse.json(
      { error: t.msg.mustBeApprovedForCategories },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: t.msg.invalidBody }, { status: 400 })
  }

  const { nom, description } = body

  if (!nom?.trim()) {
    return NextResponse.json({ error: t.msg.categoryNameRequired }, { status: 400 })
  }

  // Vérifier qu'une catégorie avec ce nom n'existe pas déjà
  const existing = await prisma.category.findUnique({
    where: { nom: nom.trim() },
  })
  if (existing) {
    return NextResponse.json(
      { error: t.msg.categoryExists },
      { status: 409 }
    )
  }

  const category = await prisma.category.create({
    data: {
      nom:         nom.trim(),
      description: description?.trim() || null,
      statut:      'EN_ATTENTE',
      vendeurId:   vendeur.id,
    },
  })

  return NextResponse.json(
    { ...category, message: t.msg.categoryProposed },
    { status: 201 }
  )
}