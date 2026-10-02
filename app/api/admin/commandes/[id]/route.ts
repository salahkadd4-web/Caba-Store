import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'
import { tr } from '@/lib/i18n'

async function checkAdmin() {
  const token = await getAuthToken()
  return token?.role === 'ADMIN' ? token : null
}

const VALID_STATUTS = ['EN_ATTENTE', 'CONFIRMEE', 'EN_PREPARATION', 'EXPEDIEE', 'LIVREE', 'ANNULEE'] as const

// PATCH /api/admin/commandes/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { t } = await getI18n()
  try {
    const token = await checkAdmin()
    if (!token) return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { statut, approuver } = body

    // ── Cas 1 : l'admin approuve sa part ──────────────────────────────────
    if (approuver === true) {
      const commande = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: { select: { vendeurId: true } },
            },
          },
        },
      })

      if (!commande) return NextResponse.json({ error: t.msg.orderNotFound }, { status: 404 })
      if (commande.statut !== 'EN_ATTENTE') {
        return NextResponse.json({ error: t.msg.orderAlreadyProcessed }, { status: 403 })
      }

      const vendeurIds = [
        ...new Set(
          commande.items
            .map((item: { product: { vendeurId: string | null } }) => item.product.vendeurId)
            .filter((v: string | null): v is string => v !== null)
        ),
      ]
      const aDesProduitsAdmin = commande.items.some(
        (item: { product: { vendeurId: string | null } }) => item.product.vendeurId === null
      )

      const approbations: Record<string, boolean> =
        (commande.approbationsVendeurs as Record<string, boolean>) ?? {}
      if (aDesProduitsAdmin) approbations['admin'] = true

      const tousVendeursOk = (vendeurIds as string[]).every((vid: string) => approbations[vid] === true)
      const adminOk = aDesProduitsAdmin ? approbations['admin'] === true : true
      const tousOk  = tousVendeursOk && adminOk

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

    // ── Cas 2 : l'admin change directement le statut global ───────────────
    if (!statut || !(VALID_STATUTS as readonly string[]).includes(statut)) {
      return NextResponse.json(
        { error: t.msg.invalidStatus(VALID_STATUTS.join(', ')) },
        { status: 400 }
      )
    }

    // ── Cas LIVREE : livrer tout le groupe si groupeId existe ──────────────
    // Le bureau de livraison livre tous les colis du même panier en même temps.
    if (statut === 'LIVREE') {
      const orderRef = await prisma.order.findUnique({
        where: { id },
        select: { groupeId: true },
      })

      if (orderRef?.groupeId) {
        // Livraison groupée : tous les colis du même panier sont livrés ensemble
        await prisma.order.updateMany({
          where: {
            groupeId: orderRef.groupeId,
            statut: { not: 'ANNULEE' },
          },
          data: { statut: 'LIVREE' },
        })
        return NextResponse.json({
          message: t.msg.groupDelivered(orderRef.groupeId.slice(0, 8)),
        })
      }
    }

    // Mise à jour simple (pas de groupeId, ou statut ≠ LIVREE)
    const commande = await prisma.order.update({
      where: { id },
      data:  { statut },
    })

    return NextResponse.json({
      ...commande,
      message: t.msg.statusUpdated(tr(t.orders.status, statut)),
    })
  } catch {
    return NextResponse.json({ error: t.api.serverError }, { status: 500 })
  }
}
