import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'
import { ajusterCommissionApresRetour, type EffetRetour } from '@/lib/seller-billing'

/**
 * PATCH /api/admin/retours/[id] — { decision: 'APPROVED' | 'REJECTED' }
 * Décision de l'admin sur une réclamation en attente. Un retour accepté corrige
 * la commission du vendeur (facture recalculée, ou avoir si elle est déjà payée).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { t, fmt } = await getI18n()
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })

  const { id } = await params
  const { decision } = await req.json().catch(() => ({}))
  if (decision !== 'APPROVED' && decision !== 'REJECTED')
    return NextResponse.json({ error: t.api.invalidData }, { status: 400 })

  const now = new Date()
  const effet = await prisma.$transaction(async (tx): Promise<EffetRetour | null> => {
    // Écriture conditionnée : deux clics simultanés ne décident pas deux fois.
    const { count } = await tx.returnRequest.updateMany({
      where: { id, status: 'PENDING' },
      data: { status: decision, decideLe: now },
    })
    if (count === 0) return null
    return decision === 'APPROVED' ? ajusterCommissionApresRetour(tx, id, now) : { type: 'aucun' }
  })
  if (!effet) return NextResponse.json({ error: t.msg.returnAlreadyDecided }, { status: 409 })

  const r = t.returns.admin
  const detail =
    effet.type === 'facture_reduite'
      ? r.effectInvoice(effet.numero, fmt.price(effet.avant), fmt.price(effet.apres)) + (effet.debloque ? ` ${r.effectUnblocked}` : '')
      : effet.type === 'avoir' ? r.effectCredit(fmt.price(effet.montant), effet.numero)
      : effet.type === 'cycle_en_cours' ? r.effectCurrentCycle
      : null
  const base = decision === 'APPROVED' ? r.approved : r.rejected
  return NextResponse.json({ message: detail ? `${base} ${detail}` : base })
}
