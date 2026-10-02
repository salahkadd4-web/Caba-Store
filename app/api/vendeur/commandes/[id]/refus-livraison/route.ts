// app/api/vendeur/commandes/[id]/refus-livraison/route.ts — CabaStore
//
// Signale un refus de livraison à Flowmerce (fonctionnalité "refusalReport").
// Proxy serveur vers POST /api/fraud/report-refusal — la FLOWMERCE_API_KEY ne
// quitte jamais le serveur (même clé partagée que submitReturn/getReturnForm :
// elle identifie la boutique Caba Store dans son ensemble chez Flowmerce, pas
// le vendeur marketplace individuel).
//
// Autorisé uniquement quand la commande est EXPEDIEE : c'est le seul moment
// où un refus à la livraison a un sens (avant, rien n'a été expédié ; après
// LIVREE, ce n'est plus un refus mais un retour classique).

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { reportDeliveryRefusal, FlowmerceError } from '@/lib/flowmerce'
import { getI18n } from '@/lib/i18n/server'

const MOTIFS_VALIDES = ['CLIENT_ABSENT', 'CLIENT_A_CHANGE_AVIS', 'CLIENT_A_REFUSE_SANS_MOTIF', 'AUTRE'] as const

const MOTIF_LABELS: Record<(typeof MOTIFS_VALIDES)[number], string> = {
  CLIENT_ABSENT:                'Client absent',
  CLIENT_A_CHANGE_AVIS:         "Client a changé d'avis",
  CLIENT_A_REFUSE_SANS_MOTIF:   'Client a refusé sans motif',
  AUTRE:                        'Autre',
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { t } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  }

  const vendeur = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
  })
  if (!vendeur || vendeur.statut !== 'APPROUVE') {
    return NextResponse.json({ error: t.msg.accountNotApproved }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: t.msg.bodyRequired }, { status: 400 })

  const { motif, details } = body as { motif?: string; details?: string }
  if (!motif || !(MOTIFS_VALIDES as readonly string[]).includes(motif)) {
    return NextResponse.json(
      { error: t.msg.invalidReason(MOTIFS_VALIDES.join(', ')) },
      { status: 400 },
    )
  }
  if (motif === 'AUTRE' && !details?.trim()) {
    return NextResponse.json({ error: t.msg.otherReasonDetailRequired }, { status: 400 })
  }

  // Commande appartenant à ce vendeur (au moins un item de ses produits).
  const commande = await prisma.order.findFirst({
    where: {
      id,
      items: { some: { product: { vendeurId: vendeur.id } } },
    },
    include: { user: { select: { email: true, telephone: true } } },
  })

  if (!commande) {
    return NextResponse.json({ error: t.msg.orderNotFound }, { status: 404 })
  }
  if (commande.statut !== 'EXPEDIEE') {
    return NextResponse.json(
      { error: t.msg.refusalOnlyShipped },
      { status: 403 },
    )
  }
  if (commande.refusLivraisonSignale) {
    return NextResponse.json({ error: t.msg.refusalAlreadyReported }, { status: 409 })
  }
  if (!commande.user.email && !commande.user.telephone) {
    return NextResponse.json(
      { error: t.msg.clientNoContact },
      { status: 422 },
    )
  }

  const reasonText = motif === 'AUTRE' ? details!.trim() : MOTIF_LABELS[motif as keyof typeof MOTIF_LABELS]

  try {
    const result = await reportDeliveryRefusal({
      orderId:       id,
      customerEmail: commande.user.email ?? undefined,
      customerPhone: commande.user.telephone ?? undefined,
      reason:        reasonText,
    })

    await prisma.order.update({
      where: { id },
      data:  { refusLivraisonSignale: true, refusLivraisonRaison: reasonText },
    })

    return NextResponse.json({
      ok: true,
      alreadyReported: result.alreadyReported,
      message: result.alreadyReported
        ? t.msg.refusalAlreadyReportedFlowmerce
        : t.msg.refusalReported,
    })
  } catch (err) {
    if (err instanceof FlowmerceError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[vendeur/refus-livraison] erreur inattendue', err)
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
