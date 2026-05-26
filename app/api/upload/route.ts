import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/getAuthToken'
import cloudinary from '@/lib/cloudinary'
import { rateLimit, rateLimits } from '@/lib/security'

const MAX_FILE_SIZE    = 5 * 1024 * 1024  // 5 MB
const ALLOWED_TYPES    = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  // Rate limiting — 20 uploads/heure
  const limited = await rateLimit(req, rateLimits.upload)
  if (limited) return limited

  try {
    const token = await getAuthToken()
    if (!token || !['ADMIN', 'VENDEUR'].includes(token.role)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // ── Validation taille ─────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 5 MB)' },
        { status: 400 }
      )
    }

    // ── Validation type MIME ──────────────────────────────
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Utilisez JPG, PNG, WebP ou GIF.' },
        { status: 400 }
      )
    }

    // ── Validation magic bytes (vrai type de fichier) ─────
    const buffer = await file.arrayBuffer()
    const bytes  = new Uint8Array(buffer)
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8
    const isPng  = bytes[0] === 0x89 && bytes[1] === 0x50
    const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45
    const isGif  = bytes[0] === 0x47 && bytes[1] === 0x49

    if (!isJpeg && !isPng && !isWebp && !isGif) {
      return NextResponse.json(
        { error: 'Le contenu du fichier ne correspond pas à une image valide' },
        { status: 400 }
      )
    }

    // ── Upload Cloudinary ─────────────────────────────────
    const base64 = Buffer.from(buffer).toString('base64')
    const dataUri = `data:${file.type};base64,${base64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder:         'cabastore/produits',
      transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (error) {
    console.error('Erreur upload:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}