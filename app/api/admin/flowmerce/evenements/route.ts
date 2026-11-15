import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthToken } from '@/lib/getAuthToken'
import { getI18n } from '@/lib/i18n/server'

/**
 * GET /api/admin/flowmerce/evenements?etat=ECHEC|EN_ATTENTE|LIVRE&orderId=…
 * Consultation de la file d'envoi des statuts vers Flowmerce (admin).
 * Par défaut : les événements en échec définitif, les plus récents d'abord.
 */
export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  const token = await getAuthToken()
  if (token?.role !== 'ADMIN') return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })

  const params  = req.nextUrl.searchParams
  const etatBrut = params.get('etat') ?? 'ECHEC'
  const etat    = (['ECHEC', 'EN_ATTENTE', 'LIVRE'] as const).find(e => e === etatBrut)
  if (!etat) return NextResponse.json({ error: 'etat : ECHEC, EN_ATTENTE ou LIVRE' }, { status: 400 })
  const orderId = params.get('orderId') || undefined

  const evenements = await prisma.flowmerceStatusEvent.findMany({
    where:   { etat, ...(orderId ? { orderId } : {}) },
    orderBy: { createdAt: 'desc' },
    take:    100,
    select: {
      id: true, orderId: true, statut: true, etat: true, tentatives: true, prochainEssai: true,
      dernierCode: true, derniereErreur: true, livreLe: true, createdAt: true,
    },
  })
  return NextResponse.json(evenements)
}
