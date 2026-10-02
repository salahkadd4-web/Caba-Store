import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'
import { tr } from '@/lib/i18n'

// Flux linéaire autorisé pour le vendeur
const FLUX_VENDEUR: Record<string, string> = {
  EN_ATTENTE:     'EN_PREPARATION',
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
    if (commande.statut !== 'EN_ATTENTE') {
      return NextResponse.json({ error: t.msg.orderAlreadyProcessed }, { status: 403 })
    }

    // Tous les acteurs qui doivent approuver
    const vendeurIds = [
      ...new Set(
        commande.items
          .map(i => i.product.vendeurId)
          .filter((v): v is string => v !== null)
      ),
    ]
    const aDesProduitsAdmin = commande.items.some(i => i.product.vendeurId === null)

    // Enregistrer l'approbation de ce vendeur
    const approbations = ((commande.approbationsVendeurs as Record<string, boolean>) ?? {})
    approbations[vendeur.id] = true

    // Vérifier si tous ont approuvé
    const tousVendeursOk = vendeurIds.every(vid => approbations[vid] === true)
    const adminOk        = aDesProduitsAdmin ? approbations['admin'] === true : true
    const tousOk         = tousVendeursOk && adminOk

    const updated = await prisma.order.update({
      where: { id },
      data: {
        approbationsVendeurs: approbations,
        ...(tousOk ? { statut: 'CONFIRMEE' } : {}),
      },
    })

    return NextResponse.json({
      ...updated,
      message: tousOk
        ? t.msg.orderConfirmedAll
        : t.msg.approvalSaved,
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

    const updated = await prisma.order.update({
      where: { id },
      data:  { statut },
    })

    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: t.msg.approveOrStatusRequired }, { status: 400 })
}