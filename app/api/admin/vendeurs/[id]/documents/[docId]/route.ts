import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'

// PATCH /api/admin/vendeurs/[id]/documents/[docId]
// body: { action: "accepter" | "refuser", adminNote?: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const { id, docId } = await params

  const body = await req.json()
  const { action, adminNote } = body

  const doc = await prisma.vendeurDocument.findFirst({
    where: { id: docId, vendeurId: id },
  })
  if (!doc) {
    return NextResponse.json({ error: t.msg.documentNotFound }, { status: 404 })
  }

  if (!['accepter', 'refuser'].includes(action)) {
    return NextResponse.json({ error: t.msg.invalidAction }, { status: 400 })
  }

  const newStatut = action === 'accepter' ? 'ACCEPTE' : 'REFUSE'

  await prisma.vendeurDocument.update({
    where: { id: docId },
    data: {
      statut:    newStatut,
      adminNote: adminNote || null,
    },
  })

  // Si un document est refusé → remettre le compte en PIECES_REQUISES
  if (action === 'refuser') {
    await prisma.vendeurProfile.update({
      where: { id },
      data: { statut: 'PIECES_REQUISES' },
    })
    return NextResponse.json({ message: t.msg.documentRefused })
  }

  // Si accepté → vérifier si TOUS les documents sont maintenant acceptés
  if (action === 'accepter') {
    const docsNonAcceptes = await prisma.vendeurDocument.count({
      where: {
        vendeurId: id,
        statut:    { not: 'ACCEPTE' },
      },
    })

    // Si tous les docs sont acceptés → débloquer automatiquement le compte
    if (docsNonAcceptes === 0) {
      await prisma.vendeurProfile.update({
        where: { id },
        data: { statut: 'APPROUVE' },
      })
      return NextResponse.json({
        message: t.msg.documentAcceptedAll,
        compteDebloque: true,
      })
    }

    return NextResponse.json({
      message: t.msg.documentAcceptedOthersPending,
      compteDebloque: false,
    })
  }
}

// DELETE /api/admin/vendeurs/[id]/documents/[docId]
// Supprimer une demande de document (si on change d'avis)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const { id, docId } = await params

  await prisma.vendeurDocument.delete({
    where: { id: docId, vendeurId: id },
  })

  return NextResponse.json({ message: t.msg.documentDeleted })
}