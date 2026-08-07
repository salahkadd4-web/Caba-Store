// app/api/retours/upload/route.ts — CabaStore
//
// POST — Upload d'un fichier (image / video / autre) pour une demande de retour.
//
// Prêt pour Flowmerce : si FLOWMERCE_UPLOAD_URL est défini, le fichier est
// envoyé tel quel à l'API d'upload Flowmerce (Bearer FLOWMERCE_API_KEY) et
// l'URL retournée est placée dans les réponses du formulaire.
// Sinon, repli sur Cloudinary (comportement actuel).
//
// Validations minimales côté serveur (le contrôle métier appartient à Flowmerce).

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthToken } from '@/lib/getAuthToken'
import { rateLimit, rateLimits } from '@/lib/security'

const FLOWMERCE_UPLOAD_URL = (process.env.FLOWMERCE_UPLOAD_URL || '').replace(/\/$/, '')
const FLOWMERCE_API_KEY    = process.env.FLOWMERCE_API_KEY || ''

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4',  'video/webm', 'video/quicktime',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export async function POST(req: NextRequest) {
  // Rate limiting — 20 uploads/heure
  const limited = await rateLimit(req, rateLimits.upload)
  if (limited) return limited

  try {
    const token = await getAuthToken()
    if (!token?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
    }

    // ── Validation taille ─────────────────────────────────────
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux (max 10 MB)' },
        { status: 400 }
      )
    }

    // ── Validation type MIME ──────────────────────────────────
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé' },
        { status: 400 }
      )
    }

    // ── Upload Flowmerce (si configuré) ou Cloudinary ─────────
    const url = FLOWMERCE_UPLOAD_URL
      ? await uploadToFlowmerce(file)
      : await uploadToCloudinary(file)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('[retours/upload] erreur:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// ── Upload vers la future API Flowmerce ─────────────────────────────────────
async function uploadToFlowmerce(file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${FLOWMERCE_UPLOAD_URL}/api/v1/uploads`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${FLOWMERCE_API_KEY}` },
    body:    formData,
    signal:  AbortSignal.timeout(30_000),
  })

  if (!res.ok) throw new Error(`Flowmerce upload HTTP ${res.status}`)

  const data = await res.json().catch(() => ({})) as { url?: string }
  if (!data.url) throw new Error('Flowmerce upload : URL manquante')

  return data.url
}

// ── Repli : upload Cloudinary ────────────────────────────────────────────────
async function uploadToCloudinary(file: File): Promise<string> {
  const { default: cloudinary } = await import('@/lib/cloudinary')

  const buffer = await file.arrayBuffer()
  const bytes  = new Uint8Array(buffer)

  // Magic bytes — image : jpeg/png/webp/gif, vidéo : ftyp(mp4) / webm
  const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8
  const isPng  = bytes[0] === 0x89 && bytes[1] === 0x50
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45
  const isGif  = bytes[0] === 0x47 && bytes[1] === 0x49
  const isMp4  = bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  const isWebm = bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3
  const isPdf  = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46

  if (!isJpeg && !isPng && !isWebp && !isGif && !isMp4 && !isWebm && !isPdf) {
    throw new Error('Le contenu du fichier ne correspond pas à un type autorisé')
  }

  const dataUri = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`

  const result = await cloudinary.uploader.upload(dataUri, {
    folder:         'cabastore/retours',
    resource_type:  file.type.startsWith('video') ? 'video' : 'auto',
    transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
  })

  return result.secure_url
}
