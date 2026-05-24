// app/api/retours/submit/route.ts — CabaStore
//
// Flux complet :
//   1. Vérifie auth + commande LIVREE
//   2. Résout la clé API Flowmerce (vendeur ou fallback admin)
//   3. Appelle POST /api/claims/external → crée le claim (statut EN_ATTENTE, sans décision ML)
//
// Variables .env requises :
//   FLOWMERCE_URL=http://localhost:3000
//   FLOWMERCE_API_KEY=flk_xxxx   ← clé admin CabaStore (fallback pour produits sans vendeur)

import { NextRequest, NextResponse } from 'next/server'
import { auth }   from '@/auth'
import { prisma } from '@/lib/prisma'

const FLOWMERCE_URL     = (process.env.FLOWMERCE_URL     || '').replace(/\/$/, '')
const FLOWMERCE_API_KEY = process.env.FLOWMERCE_API_KEY  || ''   // clé admin — fallback

// ── Raisons FR → codes Flowmerce ──────────────────────────────────────────
const REASON_MAP: Record<string, string> = {
  'Produit défectueux':          'DEFECTIVE',
  'Produit endommagé livraison': 'DEFECTIVE',
  'Panne après utilisation':     'DEFECTIVE',
  'Produit contrefait':          'DESCRIPTION',
  'Mauvaise taille':             'WRONG_ITEM',
  'Ne correspond pas':           'WRONG_ITEM',
  'Erreur de commande vendeur':  'WRONG_ITEM',
  'Pièces manquantes':           'WRONG_ITEM',
  "Changement d'avis":           'CHANGE_MIND',
  'Allergie/Réaction':           'CHANGE_MIND',
}

// ── Catégories CabaStore → catégories Flowmerce ───────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  'Électronique':   'Electronics',
  'Électroménager': 'Appliances',
  'Vêtements':      'Clothing',
  'Chaussures':     'Shoes',
  'Beauté':         'Beauty',
  'Livres':         'Books',
  'Jouets':         'Toys',
  'Sport':          'Sports',
  'Maison':         'Home',
  'Alimentation':   'Food',
}

// ── Méthodes paiement/livraison → libellés Flowmerce ─────────────────────
const PAYMENT_MAP: Record<string, string> = {
  'CARTE':         'Credit Card',
  'ESPECES':       'Cash on Delivery',
  'VIREMENT':      'Bank Transfer',
  'CIB':           'Credit Card',
  'EDAHABIA':      'Credit Card',
}

const SHIPPING_MAP: Record<string, string> = {
  'DOMICILE':    'Home Delivery',
  'BUREAU':      'Office Delivery',
  'POINT_RELAY': 'Relay Point',
  'EXPRESS':     'Express',
}

// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!FLOWMERCE_URL) {
    return NextResponse.json({ error: 'Service retours non configuré (FLOWMERCE_URL manquant)' }, { status: 503 })
  }

  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      id: true, nom: true, prenom: true,
      email: true, telephone: true,
      age: true, genre: true, wilaya: true,
    },
  })
  if (!user) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })

  // ── 2. Parse body ────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 }) }

  const orderId           = String(body.orderId           ?? '').trim()
  const productName       = String(body.productName       ?? '').trim()
  const reason            = String(body.reason            ?? '').trim()
  const desiredResolution = String(body.desiredResolution ?? '').trim().toUpperCase()
  const description       = String(body.description       ?? '').trim()

  if (!orderId || !productName || !reason || !desiredResolution) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }

  // ── 3. Vérifier la commande ──────────────────────────────────────────────
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id, statut: 'LIVREE' },
    include: {
      items: {
        include: {
          product: {
            select: {
              nom:      true,
              prix:     true,
              stock:    true,
              category: { select: { nom: true } },
              vendeur: {
                select: { flowmerceApiKey: true, nomBoutique: true },
              },
            },
          },
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json(
      { error: 'Commande introuvable, non livrée ou ne vous appartient pas' },
      { status: 404 }
    )
  }

  // Bloquer si un retour a déjà été demandé pour cette commande
  if (order.retourDemande) {
    return NextResponse.json(
      { error: 'Une demande de retour a déjà été soumise pour cette commande.' },
      { status: 409 }
    )
  }

  const item = order.items.find(i => i.product.nom === productName) ?? order.items[0]

  // ── 4. Résoudre la clé API Flowmerce ────────────────────────────────────
  // Priorité : clé du vendeur → fallback clé admin (produits sans vendeur)
  const flowmerceApiKey = item?.product?.vendeur?.flowmerceApiKey || FLOWMERCE_API_KEY

  if (!flowmerceApiKey) {
    return NextResponse.json(
      { error: 'Retour indisponible — clé Flowmerce non configurée. Contactez l\'administrateur.' },
      { status: 503 }
    )
  }

  const shopName = item?.product?.vendeur?.nomBoutique ?? 'CabaStore'

  // ── 5. Calculer les jours depuis la commande ─────────────────────────────
  const daysToReturn = Math.max(
    0,
    Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86_400_000)
  )

  // ── 6. Appel Flowmerce : POST /api/claims/external pour le moment ──────────────────────
  const claimPayload = {
    customer_name:      `${user.nom} ${user.prenom}`,
    customer_email:     user.email ?? '',
    customer_phone:     user.telephone ?? '',
    product_name:       productName,
    product_price:      item?.prix ?? 0,
    product_category:   CATEGORY_MAP[item?.product?.category?.nom ?? ''] ?? 'Other',
    order_id:           orderId,
    order_date:         order.createdAt.toISOString().split('T')[0],
    order_total:        order.total,
    reason:             REASON_MAP[reason] ?? 'CHANGE_MIND',
    description:        description || `${reason} — CabaStore`,
    desired_resolution: desiredResolution,
    shop_name:          shopName,
    payment_method:     PAYMENT_MAP[order.modePaiement ?? '']      ?? 'Cash on Delivery',
    shipping_method:    SHIPPING_MAP[order.methodeExpedition ?? ''] ?? 'Home Delivery',
    shipping_cost:      order.fraisLivraison ?? 0,
    external_return_id: `cabastore-${orderId}`,
    external_source:    'CabaStore',
  }

  let flowmerceRes: Response
  try {
    flowmerceRes = await fetch(`${FLOWMERCE_URL}/api/claims/external`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${flowmerceApiKey}`,
      },
      body:    JSON.stringify(claimPayload),
      signal:  AbortSignal.timeout(10_000),
    })
  } catch {
    return NextResponse.json({ error: 'Service Flowmerce indisponible' }, { status: 503 })
  }

  const data = await flowmerceRes.json().catch(() => ({})) as {
    claim?:          { id: string; status: string }
    policy_applied?: { processing_days?: number }
    error?:          string
    code?:           string
  }

  if (flowmerceRes.status === 409) {
    return NextResponse.json(
      { error: 'Une demande de retour existe déjà pour cette commande.' },
      { status: 409 }
    )
  }

  if (!flowmerceRes.ok) {
    return NextResponse.json(
      { error: data.error ?? 'Erreur Flowmerce' },
      { status: flowmerceRes.status }
    )
  }

  // ── Marquer la commande comme "retour déjà demandé" ─────────────────────
  await prisma.order.update({
    where: { id: orderId },
    data:  { retourDemande: true },
  }).catch(() => null) // non bloquant

  return NextResponse.json(
    {
      success:        true,
      claimId:        data.claim?.id,
      processingDays: data.policy_applied?.processing_days ?? 5,
      message:       'Votre demande de retour a été enregistrée. Vous recevrez une décision sous peu.',
    },
    { status: 201 }
  )
}