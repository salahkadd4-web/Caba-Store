import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'

// GET /api/admin/documents/view?docId=xxx
// Récupère un document privé depuis Vercel Blob et le stream à l'admin
// Accessible uniquement aux admins connectés
export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const docId = req.nextUrl.searchParams.get('docId')
  if (!docId) {
    return NextResponse.json({ error: t.msg.docIdRequired }, { status: 400 })
  }

  // Récupérer l'URL blob en base
  const doc = await prisma.vendeurDocument.findUnique({
    where: { id: docId },
    select: { fichier: true },
  })

  if (!doc?.fichier) {
    return NextResponse.json({ error: t.msg.documentNotFound }, { status: 404 })
  }

  // Récupérer le blob privé avec le token Vercel
  const blobResponse = await fetch(doc.fichier, {
    headers: {
      Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    },
  })

  if (!blobResponse.ok) {
    return NextResponse.json({ error: t.msg.fileInaccessible }, { status: 502 })
  }

  // Stream le fichier vers l'admin sans jamais exposer l'URL privée
  return new NextResponse(blobResponse.body, {
    status: 200,
    headers: {
      'Content-Type':           blobResponse.headers.get('Content-Type') ?? 'application/octet-stream',
      'Content-Disposition':    'inline',
      'Cache-Control':          'no-store, no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}