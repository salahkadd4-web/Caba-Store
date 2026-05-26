// app/api/retours/webhook/route.ts — CabaStore
//
// Webhook entrant Flowmerce — recoit les changements de statut des claims
// (PENDING -> APPROVED / REJECTED) et reconcilie le ReturnRequest local.
//
// Securite :
//   - Signature HMAC SHA-256 verifiee avec FLOWMERCE_WEBHOOK_SECRET
//   - Comparaison en temps constant (timingSafeEqual)
//   - Pas d'auth utilisateur — c'est un endpoint server-to-server

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/prisma'

const FLOWMERCE_WEBHOOK_SECRET = process.env.FLOWMERCE_WEBHOOK_SECRET || ''

console.log('[flowmerce:webhook] boot', {
  secretConfigured: !!FLOWMERCE_WEBHOOK_SECRET,
})

type FlowmerceEvent = {
  type?:  string                       // ex: "claim.updated"
  claim?: {
    id?:     string
    status?: string                    // PENDING | APPROVED | REJECTED
  }
}

export async function POST(req: NextRequest) {
  if (!FLOWMERCE_WEBHOOK_SECRET) {
    console.error('[flowmerce:webhook] 503 — FLOWMERCE_WEBHOOK_SECRET manquant')
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 })
  }

  // ── 1. Lire le body brut (necessaire pour HMAC) ──────────────────────────
  const rawBody = await req.text()

  // ── 2. Verifier la signature ─────────────────────────────────────────────
  const signature = req.headers.get('x-flowmerce-signature') ?? ''
  if (!signature || !verifySignature(rawBody, signature)) {
    console.warn('[flowmerce:webhook] signature invalide')
    return NextResponse.json({ error: 'Signature invalide' }, { status: 401 })
  }

  // ── 3. Parser ────────────────────────────────────────────────────────────
  let event: FlowmerceEvent
  try { event = JSON.parse(rawBody) }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }

  const claimId  = event.claim?.id
  const rawState = event.claim?.status?.toUpperCase()
  if (!claimId || !rawState) {
    return NextResponse.json({ error: 'Payload incomplet' }, { status: 400 })
  }

  const newStatus =
    rawState === 'APPROVED' ? 'APPROVED' :
    rawState === 'REJECTED' ? 'REJECTED' :
    rawState === 'PENDING'  ? 'PENDING'  : null

  if (!newStatus) {
    // Status inconnu — on accuse reception sans planter pour ne pas faire
    // re-essayer Flowmerce indefiniment.
    console.warn('[flowmerce:webhook] status inconnu', { claimId, rawState })
    return NextResponse.json({ ok: true, ignored: true })
  }

  // ── 4. Mise a jour idempotente ───────────────────────────────────────────
  // updateMany ne plante pas si aucune ligne (claim cree hors CabaStore).
  const result = await prisma.returnRequest.updateMany({
    where: { flowmerceClaimId: claimId },
    data:  { status: newStatus },
  })

  if (result.count === 0) {
    console.warn('[flowmerce:webhook] claim inconnu localement', { claimId })
  }

  return NextResponse.json({ ok: true, updated: result.count })
}

// ─────────────────────────────────────────────────────────────────────────────

function verifySignature(rawBody: string, headerSignature: string): boolean {
  // Le header peut etre soit "<hex>" soit "sha256=<hex>" — on supporte les deux.
  const provided = headerSignature.startsWith('sha256=')
    ? headerSignature.slice(7)
    : headerSignature

  const expected = createHmac('sha256', FLOWMERCE_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex')

  if (provided.length !== expected.length) return false

  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
