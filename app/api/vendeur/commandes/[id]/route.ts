import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'
import { tr } from '@/lib/i18n'
import { enregistrerApprobation } from '@/lib/commandes'

// Flux linéaire autorisé pour le vendeur. Une commande EN_ATTENTE passe par
// l'approbation (tous les acteurs doivent approuver) : pas de raccourci ici.
const FLUX_VENDEUR: Record<string, string> = {
  CONFIRMEE:      'EN_PREPARATION',
  EN_PREPARATION: 'EXPEDIEE',
  EXPEDIEE:       'LIVREE',
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

  const { approuver, statut } = body

  // Récupérer la commande avec tous ses items
  const commande = await prisma.order.findFirst({
    where: {
      id,
      items: { some: { product: { vendeurId: vendeur.id } } },
    },
    include: {
      items: {
        include: { product: { select: { vendeurId: true } } },
      },
    },
  })

  if (!commande) {
    return NextResponse.json({ error: t.msg.orderNotFound }, { status: 404 })
  }

  if (commande.statut === 'ANNULEE') {
    return NextResponse.json({ error: t.msg.orderCancelled }, { status: 403 })
  }

  // ── Cas 1 : Approbation (commande EN_ATTENTE) ──────────────────────────
  if (approuver === true) {
    const r = await enregistrerApprobation(id, vendeur.id)
    if (!r.ok) {
      return r.raison === 'introuvable'
        ? NextResponse.json({ error: t.msg.orderNotFound }, { status: 404 })
        : NextResponse.json({ error: t.msg.orderAlreadyProcessed }, { status: 403 })
    }
    return NextResponse.json({
      ...r.commande,
      message: r.tousOk ? t.msg.orderConfirmedAll : t.msg.approvalSaved,
    })
  }

  // ── Cas 2 : Avancer au statut suivant (commande déjà confirmée) ────────
  if (statut) {
    const prochainAttendu = FLUX_VENDEUR[commande.statut]
    if (!prochainAttendu || statut !== prochainAttendu) {
      return NextResponse.json(
        { error: t.msg.actionNotAllowedNext(prochainAttendu ? tr(t.orders.status, prochainAttendu) : t.msg.none) },
        { status: 403 }
      )
    }

    // Écriture conditionnée au statut lu : deux clics simultanés n'avancent pas deux fois
    const { count } = await prisma.order.updateMany({
      where: { id, statut: commande.statut },
      data:  { statut },
    })
    if (count === 0) {
      return NextResponse.json({ error: t.msg.orderAlreadyProcessed }, { status: 409 })
    }

    return NextResponse.json({ id, statut })
  }

  return NextResponse.json({ error: t.msg.approveOrStatusRequired }, { status: 400 })
}