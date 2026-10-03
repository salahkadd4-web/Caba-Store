import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'
import { tr } from '@/lib/i18n'
import {
  APPROBATION_ADMIN, StockInsuffisantError, annulerCommande, enregistrerApprobation, reactiverCommande,
} from '@/lib/commandes'

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
      const r = await enregistrerApprobation(id, APPROBATION_ADMIN)
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

    // ── Cas 2 : l'admin change directement le statut global ───────────────
    if (!statut || !(VALID_STATUTS as readonly string[]).includes(statut)) {
      return NextResponse.json(
        { error: t.msg.invalidStatus(VALID_STATUTS.join(', ')) },
        { status: 400 }
      )
    }

    const actuelle = await prisma.order.findUnique({ where: { id }, select: { statut: true, groupeId: true } })
    if (!actuelle) return NextResponse.json({ error: t.msg.orderNotFound }, { status: 404 })

    // ── Sortie de l'état ANNULEE : le stock restitué à l'annulation est repris ──
    if (actuelle.statut === 'ANNULEE') {
      if (statut !== 'EN_ATTENTE' && statut !== 'CONFIRMEE') {
        return NextResponse.json({ error: t.msg.orderCancelled }, { status: 403 })
      }
      try {
        if (!(await reactiverCommande(id, statut))) {
          return NextResponse.json({ error: t.msg.orderAlreadyProcessed }, { status: 409 })
        }
      } catch (e) {
        if (e instanceof StockInsuffisantError) {
          return NextResponse.json({ error: t.msg.reactivateOutOfStock }, { status: 409 })
        }
        throw e
      }
      return NextResponse.json({ id, statut, message: t.msg.statusUpdated(tr(t.orders.status, statut)) })
    }

    // ── Cas ANNULEE : remise en stock des articles ─────────────────────────
    if (statut === 'ANNULEE') {
      // Une commande livrée ne s'annule pas : elle passe par une demande de retour.
      if (!(await annulerCommande(id))) {
        return NextResponse.json({ error: t.msg.orderAlreadyProcessed }, { status: 403 })
      }
      return NextResponse.json({ id, statut, message: t.msg.statusUpdated(tr(t.orders.status, statut)) })
    }

    // ── Cas LIVREE : livrer tout le groupe si groupeId existe ──────────────
    // Le bureau de livraison livre tous les colis du même panier en même temps.
    if (statut === 'LIVREE') {
      const orderRef = actuelle

      if (orderRef.groupeId) {
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
