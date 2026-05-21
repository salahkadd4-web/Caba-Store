import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET /api/admin/vendeurs/[id] — détail d'un vendeur
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id } = await params

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true, nom: true, prenom: true, email: true,
          telephone: true, createdAt: true, wilaya: true,
        },
      },
      documents: { orderBy: { createdAt: 'asc' } },
      products: {
        select: { id: true, nom: true, actif: true, prix: true, stock: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      categories: {
        select: { id: true, nom: true, statut: true },
        orderBy: { createdAt: 'desc' },
      },
      _count: { select: { products: true, categories: true } },
    },
  })

  if (!vendeur) {
    return NextResponse.json({ error: 'Vendeur introuvable' }, { status: 404 })
  }

  // Stats commandes & CA
  const [totalCommandes, chiffreAffaire] = await Promise.all([
    prisma.orderItem.count({ where: { product: { vendeurId: id } } }),
    prisma.orderItem.aggregate({
      _sum: { prix: true },
      where: { product: { vendeurId: id }, order: { statut: 'LIVREE' } },
    }),
  ])

  return NextResponse.json({
    ...vendeur,
    totalCommandes,
    chiffreAffaire: chiffreAffaire._sum.prix ?? 0,
  })
}

// PATCH /api/admin/vendeurs/[id] — modifier le statut du vendeur
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { id } = await params

  const body = await req.json()
  const { action, adminNote, documents } = body
  // action: "approuver" | "suspendre" | "demander_pieces" | "reactiver"
  // documents: [{ type, label, description }] — pour action "demander_pieces"

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { id },
  })
  if (!vendeur) {
    return NextResponse.json({ error: 'Vendeur introuvable' }, { status: 404 })
  }

  if (action === 'approuver') {
    const docsRefuses = await prisma.vendeurDocument.count({
      where: { vendeurId: id, fichier: { not: null }, statut: 'REFUSE' },
    })
    if (docsRefuses > 0) {
      return NextResponse.json(
        { error: 'Certains documents ont été refusés.' },
        { status: 400 }
      )
    }

    const dateFin = new Date()
    dateFin.setFullYear(dateFin.getFullYear() + 1) // 1 an gratuit

    await prisma.$transaction([
      prisma.vendeurProfile.update({
        where: { id },
        data: { statut: 'APPROUVE', adminNote: adminNote || null, prioriteAffichage: 3 },
      }),
      prisma.abonnement.upsert({
        where: { vendeurId: id },
        update: {},
        create: {
          vendeurId: id,
          niveau: 'NIVEAU_3',
          statut: 'GRATUIT',
          dateFin,
        },
      }),
    ])
    return NextResponse.json({ message: 'Vendeur approuvé — période gratuite d\'1 an démarrée' })
  }

  if (action === 'suspendre') {
    await prisma.vendeurProfile.update({
      where: { id },
      data: { statut: 'SUSPENDU', adminNote: adminNote || null },
    })
    return NextResponse.json({ message: 'Vendeur suspendu' })
  }

  if (action === 'reactiver') {
    await prisma.vendeurProfile.update({
      where: { id },
      data: { statut: 'APPROUVE', adminNote: null },
    })
    return NextResponse.json({ message: 'Vendeur réactivé' })
  }

  if (action === 'demander_pieces') {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: 'Vous devez spécifier au moins un document à demander' },
        { status: 400 }
      )
    }

    await prisma.vendeurProfile.update({
      where: { id },
      data: { statut: 'PIECES_REQUISES', adminNote: adminNote || null },
    })

    await prisma.vendeurDocument.createMany({
      data: documents.map((doc: { type: string; label: string; description?: string }) => ({
        vendeurId:   id,
        type:        doc.type,
        label:       doc.label,
        description: doc.description || null,
        statut:      'EN_ATTENTE',
      })),
    })

    return NextResponse.json({ message: 'Demande de pièces envoyée' })
  }

  if (action === 'set_flowmerce_key') {
    const { flowmerceApiKey, flowmerceShopId } = body
    await prisma.vendeurProfile.update({
      where: { id },
      data:  {
        flowmerceApiKey: flowmerceApiKey || null,
        ...(flowmerceShopId !== undefined ? { flowmerceShopId: flowmerceShopId || null } : {}),
      },
    })
    return NextResponse.json({ message: 'Clé Flowmerce mise à jour' })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}