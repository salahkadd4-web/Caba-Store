// app/api/retours/submit/route.ts — CabaStore
//
// Proxy serveur vers Flowmerce — POST /api/claims/external.
// La FLOWMERCE_API_KEY ne quitte jamais le serveur.
//
// Etapes :
//   1. Auth NextAuth (refus si non connecte)
//   2. Charger la commande + verifier ownership (sinon 404)
//   3. Persister ReturnRequest PENDING en local (lock applicatif via unique orderId)
//   4. Mapper local -> snake_case Flowmerce
//   5. POST vers FLOWMERCE_API_URL/api/claims/external (Bearer + Idempotency-Key)
//   6. Update ReturnRequest avec flowmerceClaimId / rollback si echec
//   7. Retourner uniquement { success, status, claimId }

import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { auth }       from '@/auth'
import { prisma }     from '@/lib/prisma'
import { mapReason }  from '@/lib/flowmerce'

const FLOWMERCE_API_URL = (process.env.FLOWMERCE_API_URL || '').replace(/\/$/, '')
const FLOWMERCE_API_KEY = process.env.FLOWMERCE_API_KEY  || ''
const FLOWMERCE_SHOP_ID = process.env.FLOWMERCE_SHOP_ID  || 'cabastore'

// Diagnostic au boot du module — visible une seule fois dans les logs serveur.
console.log('[flowmerce] boot', {
  url:       FLOWMERCE_API_URL || '(vide)',
  keyLength: FLOWMERCE_API_KEY.length,
  keyPrefix: FLOWMERCE_API_KEY.slice(0, 4) || '(vide)',
})

const GENDER_MAP: Record<string, 'Male' | 'Female'> = {
  HOMME: 'Male', FEMME: 'Female', MALE: 'Male', FEMALE: 'Female', M: 'Male', F: 'Female',
}

// Code d'erreur Prisma pour unique constraint violation.
const PRISMA_UNIQUE_VIOLATION = 'P2002'

export async function POST(req: NextRequest) {
  if (!FLOWMERCE_API_URL || !FLOWMERCE_API_KEY) {
    console.error('[flowmerce] 503 — env manquante', {
      hasUrl: !!FLOWMERCE_API_URL,
      hasKey: !!FLOWMERCE_API_KEY,
    })
    return NextResponse.json(
      { error: 'Service retours non configuré' },
      { status: 503 }
    )
  }

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }

  const orderId     = String(body.orderId     ?? '').trim()
  const orderItemId = String(body.orderItemId ?? '').trim()
  const productName = String(body.productName ?? '').trim()
  const reasonFr    = String(body.reason      ?? '').trim()
  const resolution  = String(body.resolution  ?? '').trim().toUpperCase()
  const description = String(body.description ?? '').trim()

  // orderItemId est le moyen fiable (UUID). productName reste accepte en fallback
  // historique mais peut etre ambigu si plusieurs articles ont le meme nom.
  if (!orderId || (!orderItemId && !productName) || !reasonFr || description.length < 10) {
    return NextResponse.json({ error: 'Champs obligatoires manquants ou invalides' }, { status: 400 })
  }

  // Flowmerce exige desired_resolution. On valide cote serveur pour eviter un aller-retour.
  if (resolution !== 'REFUND' && resolution !== 'EXCHANGE' && resolution !== 'REPAIR') {
    return NextResponse.json(
      { error: 'Champ requis manquant : desired_resolution' },
      { status: 400 }
    )
  }

  // ── 3. Charger user + commande + verifier ownership ───────────────────────
  const [user, order] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: session.user.id },
      select: { id: true, nom: true, prenom: true, email: true, telephone: true, age: true, genre: true, wilaya: true, adresse: true },
    }),
    prisma.order.findFirst({
      where: { id: orderId, userId: session.user.id, statut: 'LIVREE' },
      include: {
        items: {
          include: {
            product: { select: { nom: true, category: { select: { nom: true } } } },
          },
        },
      },
    }),
  ])

  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  if (!order) {
    // 404 plutot que 403 pour ne pas leak l'existence de commandes d'autres users.
    return NextResponse.json(
      { error: 'Commande introuvable ou non éligible au retour' },
      { status: 404 }
    )
  }

  // Selection de l'item : priorite a orderItemId (sans ambiguite).
  const item = orderItemId
    ? order.items.find(i => i.id === orderItemId)
    : order.items.find(i => i.product.nom === productName) ?? order.items[0]

  if (!item) {
    return NextResponse.json({ error: 'Article introuvable dans la commande' }, { status: 400 })
  }

  const resolvedProductName = item.product.nom
  const reasonCode          = mapReason(reasonFr)

  // ── 4. Persist AVANT fetch — la contrainte unique sur orderId agit
  //      comme un lock applicatif. Si deux requetes concurrentes arrivent,
  //      seule la premiere cree la ligne ; la seconde recoit P2002 -> 409.
  let returnRequest
  try {
    returnRequest = await prisma.returnRequest.create({
      data: {
        orderId,
        flowmerceClaimId: null,
        status:           'PENDING',
        reason:           reasonCode,
        description,
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

  // ── 5. Mapper -> snake_case Flowmerce ─────────────────────────────────────
  const customerGender = GENDER_MAP[String(user.genre ?? '').toUpperCase()]

  const flowmercePayload: Record<string, unknown> = {
    shop_id:         FLOWMERCE_SHOP_ID,
    order_id:        orderId,
    customer_name:   `${user.prenom} ${user.nom}`.trim(),
    customer_email:  user.email ?? '',
    product_name:       resolvedProductName,
    reason:             reasonCode,
    desired_resolution: resolution,
    description,
    external_source:    'CabaStore',

    ...(user.telephone && { customer_phone: user.telephone }),
    ...(user.age != null && { customer_age: user.age }),
    ...(customerGender && { customer_gender: customerGender }),
    ...(user.wilaya && { customer_wilaya: user.wilaya }),
    ...(item.product.category?.nom && { product_category: item.product.category.nom }),
    product_price:    item.prix,
    product_quantity: item.quantite,
    order_total:      order.total,
    payment_method:   order.modePaiement,
    shipping_method:  order.methodeExpedition,
    shipping_cost:    order.fraisLivraison,
    order_date:       order.createdAt.toISOString(),
    order_address:    order.adresse,
  }

  // ── 6. POST Flowmerce avec Idempotency-Key ────────────────────────────────
  let flowmerceRes: Response
  try {
    flowmerceRes = await fetch(`${FLOWMERCE_API_URL}/api/claims/create`, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       FLOWMERCE_API_KEY,
        'Idempotency-Key': returnRequest.id,
      },
      body: JSON.stringify(flowmercePayload),
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    // Reseau / timeout : rollback du ReturnRequest pour permettre un retry.
    await rollback(returnRequest.id)
    return NextResponse.json({ error: 'Service Flowmerce indisponible' }, { status: 503 })
  }

  const data = await flowmerceRes.json().catch(() => ({})) as {
    success?:  boolean
    claim_id?: string
    status?:   string
    error?:    string
  }

  // ── 7. Mapping erreurs Flowmerce (avec rollback systematique sur echec) ──
  if (!flowmerceRes.ok || !data.claim_id) {
    await rollback(returnRequest.id)

    if (flowmerceRes.status === 409) {
      return NextResponse.json(
        { error: 'Une demande de retour existe déjà pour cette commande.' },
        { status: 409 }
      )
    }
    if (flowmerceRes.status === 401) {
      console.error('[flowmerce] 401 — verifier FLOWMERCE_API_KEY')
      return NextResponse.json({ error: 'Service retours indisponible' }, { status: 503 })
    }
    if (flowmerceRes.status === 422) {
      return NextResponse.json(
        { error: data.error ?? 'Retour refusé : hors politique de retour' },
        { status: 422 }
      )
    }
    if (flowmerceRes.status === 429) {
      return NextResponse.json({ error: 'Trop de demandes, réessayez plus tard' }, { status: 429 })
    }
    return NextResponse.json(
      { error: data.error ?? 'Erreur lors de la création du retour' },
      { status: flowmerceRes.status >= 500 ? 503 : 400 }
    )
  }

  // ── 8. Succes — UPDATE avec flowmerceClaimId + marquer la commande ───────
  const claimId = data.claim_id
  const status  = data.status?.toUpperCase()
  const localStatus =
    status === 'APPROVED' ? 'APPROVED' :
    status === 'REJECTED' ? 'REJECTED' : 'PENDING'

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
    // Le claim existe deja chez Flowmerce. On ne ment pas au client : succes.
    // Le webhook /api/retours/webhook reconciliera l'etat plus tard.
    console.error('[flowmerce] persist post-succes KO', {
      claimId,
      returnRequestId: returnRequest.id,
      err,
    })
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
    console.error('[flowmerce] rollback ReturnRequest KO', { returnRequestId, err })
  }
}
