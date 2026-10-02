import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'

// PATCH /api/vendeur/documents/[docId] — Soumettre le fichier pour un document demandé
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ docId: string }> }
) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const { docId } = await params
  const body = await req.json()
  const { filename } = body  // contient maintenant l'URL blob Vercel

  if (!filename) {
    return NextResponse.json({ error: t.msg.fileUrlRequired }, { status: 400 })
  }

  // Validation : doit être une URL Vercel Blob
  const isValidBlobUrl = filename.startsWith('https://') && (
    filename.includes('.public.blob.vercel-storage.com') ||
    filename.includes('.blob.vercel-storage.com')
  )
  if (!isValidBlobUrl) {
    return NextResponse.json({ error: t.msg.invalidFileUrl }, { status: 400 })
  }

  // Vérifier que ce document appartient bien à ce vendeur
  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!vendeur) {
    return NextResponse.json({ error: t.auth.api.sellerProfileNotFound }, { status: 404 })
  }

  const doc = await prisma.vendeurDocument.findFirst({
    where: { id: docId, vendeurId: vendeur.id },
  })
  if (!doc) {
    return NextResponse.json({ error: t.msg.documentNotFound }, { status: 404 })
  }

  // Mettre à jour → statut revient à EN_ATTENTE pour re-validation
  await prisma.vendeurDocument.update({
    where: { id: docId },
    data: {
      fichier:   filename,  // stocke l'URL blob privée
      statut:    'EN_ATTENTE',
      adminNote: null,
    },
  })

  // Vérifier s'il reste encore des docs sans fichier
  const docsManquants = await prisma.vendeurDocument.count({
    where: { vendeurId: vendeur.id, fichier: null },
  })

  return NextResponse.json({
    message: t.msg.documentSubmitted,
    docsManquants,
  })
}