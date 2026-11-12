import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { donneesAbonnementInitial, prioriteAbonnement } from '@/lib/seller-billing'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'

// GET /api/admin/vendeurs/[id] — détail d'un vendeur
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const { id } = await params

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true, nom: true, prenom: true, email: true,
          telephone: true, createdAt: true, wilaya: true, commune: true,
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
    return NextResponse.json({ error: t.msg.sellerNotFound }, { status: 404 })
  }

  // Stats commandes & CA
  const [totalCommandes, chiffreAffaire] = await Promise.all([
    prisma.orderItem.count({ where: { product: { vendeurId: id } } }),
    prisma.$queryRaw<Array<{ total: number | null }>>`
      SELECT COALESCE(SUM(oi.prix * oi.quantite), 0)::float AS total
      FROM "OrderItem" oi
      JOIN "Product" p ON p.id = oi."productId"
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE p."vendeurId" = ${id}
        AND o.statut = 'LIVREE'
    `,
  ])

  return NextResponse.json({
    ...vendeur,
    totalCommandes,
    chiffreAffaire: chiffreAffaire[0]?.total ?? 0,
  })
}

// PATCH /api/admin/vendeurs/[id] — modifier le statut du vendeur
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
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
    return NextResponse.json({ error: t.msg.sellerNotFound }, { status: 404 })
  }

  if (action === 'approuver') {
    const docsRefuses = await prisma.vendeurDocument.count({
      where: { vendeurId: id, fichier: { not: null }, statut: 'REFUSE' },
    })
    if (docsRefuses > 0) {
      return NextResponse.json(
        { error: t.msg.someDocumentsRefused },
        { status: 400 }
      )
    }

    // Premier mois en commission Niveau 4 (2 %) ; un vendeur réapprouvé garde son abonnement.
    await prisma.$transaction(async (tx) => {
      const abo = await tx.abonnement.findUnique({ where: { vendeurId: id } })
        ?? await tx.abonnement.create({ data: donneesAbonnementInitial(id) })
      await tx.vendeurProfile.update({
        where: { id },
        data: { statut: 'APPROUVE', adminNote: adminNote || null, prioriteAffichage: prioriteAbonnement(abo) },
      })
    })
    return NextResponse.json({ message: t.msg.sellerApprovedCommission })
  }

  if (action === 'suspendre') {
    await prisma.vendeurProfile.update({
      where: { id },
      data: { statut: 'SUSPENDU', adminNote: adminNote || null },
    })
    return NextResponse.json({ message: t.msg.sellerSuspended })
  }

  if (action === 'reactiver') {
    await prisma.vendeurProfile.update({
      where: { id },
      data: { statut: 'APPROUVE', adminNote: null },
    })
    return NextResponse.json({ message: t.msg.sellerReactivated })
  }

  if (action === 'demander_pieces') {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return NextResponse.json(
        { error: t.msg.specifyAtLeastOneDocument },
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

    return NextResponse.json({ message: t.msg.documentsRequestSent })
  }

  return NextResponse.json({ error: t.msg.invalidAction }, { status: 400 })
}
