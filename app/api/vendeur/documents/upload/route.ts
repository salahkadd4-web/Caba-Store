import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { put } from '@vercel/blob'
import { randomUUID } from 'crypto'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg':      'jpg',
  'image/png':       'png',
  'image/webp':      'webp',
  'application/pdf': 'pdf',
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: 'BLOB_READ_WRITE_TOKEN manquant' }, { status: 500 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 10 MB)' }, { status: 400 })
    }

    const ext = ALLOWED_TYPES[file.type]
    if (!ext) {
      return NextResponse.json(
        { error: 'Type non autorisé. Formats acceptés : JPG, PNG, WebP, PDF.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const b = buffer
    const isJpeg = b[0] === 0xFF && b[1] === 0xD8
    const isPng  = b[0] === 0x89 && b[1] === 0x50
    const isWebp = b[8] === 0x57 && b[9] === 0x45
    const isPdf  = b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46

    if (!isJpeg && !isPng && !isWebp && !isPdf) {
      return NextResponse.json({ error: 'Contenu du fichier invalide.' }, { status: 400 })
    }

    const vendeurId = session.user.id
    const pathname  = `documents/${vendeurId}/${randomUUID()}.${ext}`

    const blob = await put(pathname, buffer, {
      access:      'private',
      contentType: file.type,
      token:       process.env.BLOB_READ_WRITE_TOKEN, // explicite pour éviter tout problème de lecture env
    })

    return NextResponse.json({ filename: blob.url })

  } catch (error) {
    const err = error as { message?: string; status?: number; cause?: unknown; stack?: string }
    // Log complet dans le terminal next dev
    console.error('═══ ERREUR UPLOAD BLOB ═══')
    console.error('message :', err?.message)
    console.error('status  :', err?.status)
    console.error('cause   :', err?.cause)
    console.error('stack   :', err?.stack)
    console.error('══════════════════════════')

    return NextResponse.json(
      { error: err?.message ?? 'Erreur serveur' },
      { status: 500 }
    )
  }
}