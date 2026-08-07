// app/api/retours/submit/route.ts — CabaStore
//
// Proxy serveur vers Flowmerce — POST /api/v1/returns.
// La FLOWMERCE_API_KEY ne quitte jamais le serveur.
//
// Flowmerce est l'unique source de vérité pour la politique de retour :
//   - les réponses du formulaire (answers) sont transmises telles quelles
//   - la validation métier (éligibilité, motifs, fichiers…) est 100 % Flowmerce
//   - aucun identifiant de boutique n'est envoyé : la clé API identifie le
//     Vendor et sa ReturnPolicy chez Flowmerce
//   - Caba Store ne stocke que la trace locale du claim (orderId, claimId, statut)
//
// Étapes :
//   1. Auth NextAuth (refus si non connecté)
//   2. Charger la commande + vérifier ownership (sinon 404)
//   3. Persister ReturnRequest PENDING en local (lock applicatif via unique orderId)
//   4. POST vers FLOWMERCE_API_URL/api/v1/returns (Bearer)
//   5. Update ReturnRequest avec flowmerceClaimId / rollback si échec
//   6. Retourner uniquement { success, status, claimId }

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { submitReturn, FlowmerceError } from '@/lib/flowmerce'
import { rateLimit, rateLimits } from '@/lib/security'

const PRISMA_UNIQUE_VIOLATION = 'P2002'

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, rateLimits.api)
  if (limited) return limited

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const token = await getAuthToken()
  if (!token?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }

  const orderId   = String(body.orderId ?? '').trim()
  const productId = String(body.productId ?? '').trim()
  const answers   = body.answers

  if (!orderId || !productId) {
    return NextResponse.json({ error: 'Champs obligatoires manquants : orderId, productId' }, { status: 400 })
  }
  if (answers === undefined || answers === null || typeof answers !== 'object' || Array.isArray(answers)) {
    return NextResponse.json({ error: 'Champ answers invalide' }, { status: 400 })
  }

  // ── 3. Charger la commande + vérifier ownership ────────────────────────────
  // (404 plutôt que 403 pour ne pas leak l'existence de commandes d'autres users.)
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: token.id },
    include: { items: { select: { id: true, productId: true } } },
  })

  if (!order) {
    return NextResponse.json(
      { error: 'Commande introuvable' },
      { status: 404 }
    )
  }

  const item = order.items.find(i => i.productId === productId)
  if (!item) {
    return NextResponse.json(
      { error: 'Article introuvable dans la commande' },
      { status: 400 }
    )
  }

  // ── 4. Persist AVANT fetch — la contrainte unique sur orderId agit
  //      comme un lock applicatif. Seule la première requête crée la ligne.
  let returnRequest
  try {
    returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        flowmerceClaimId: null,
        status:           'PENDING',
        reason:           null,
        description:      null,
      },
    })
  } catch (err) {
    const code = (err as { code?: string })?.code
    if (code === PRISMA_UNIQUE_VIOLATION) {
      return NextResponse.json(
        { error: 'Une demande de retour existe déjà pour cette commande.' },
        { status: 409 }
      )
    }
    throw err
  }

  // ── 5. POST Flowmerce ──────────────────────────────────────────────────────
  let result
  try {
    result = await submitReturn({
      orderId,
      productId,
      answers:  answers as Record<string, unknown>,
    })
  } catch (err) {
    // Réseau / timeout / HTTP Flowmerce : rollback pour permettre un retry.
    await rollback(returnRequest.id)

    if (err instanceof FlowmerceError) {
      if (err.status === 409) {
        return NextResponse.json(
          { error: 'Une demande de retour existe déjà pour cette commande.' },
          { status: 409 }
        )
      }
      if (err.status === 422) {
        // Flowmerce a rejeté la demande (hors politique, validation, etc.).
        return NextResponse.json({ error: err.message }, { status: 422 })
      }
      if (err.status === 429) {
        return NextResponse.json({ error: err.message }, { status: 429 })
      }
      return NextResponse.json({ error: err.message }, { status: err.status })
    }

    console.error('[retours/submit] erreur inattendue', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }

  // ── 6. Succès — UPDATE avec flowmerceClaimId + marquer la commande ────────
  const claimId     = result.claimId
  const rawStatus   = String(result.status ?? '').toUpperCase()
  const localStatus =
    rawStatus === 'APPROVED' ? 'APPROVED' :
    rawStatus === 'REJECTED' ? 'REJECTED' : 'PENDING'

  try {
    await prisma.$transaction([
      prisma.returnRequest.update({
        where: { id: returnRequest.id },
        data:  { flowmerceClaimId: claimId, status: localStatus },
      }),
      prisma.order.update({
        where: { id: orderId },
        data:  { retourDemande: true },
      }),
    ])
  } catch (err) {
    // Le claim existe déjà chez Flowmerce. On ne ment pas au client : succès.
    // Le webhook /api/retours/webhook réconciliera l'état plus tard.
    console.error('[retours/submit] persist post-succès KO', { claimId, returnRequestId: returnRequest.id, err })
  }

  return NextResponse.json(
    { success: true, status: localStatus, claimId },
    { status: 201 }
  )
}

// ─────────────────────────────────────────────────────────────────────────────

async function rollback(returnRequestId: string): Promise<void> {
  try {
    await prisma.returnRequest.delete({ where: { id: returnRequestId } })
  } catch (err) {
    console.error('[retours/submit] rollback ReturnRequest KO', { returnRequestId, err })
  }
}
