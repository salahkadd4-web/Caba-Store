import { NextRequest, NextResponse } from 'next/server'
import { getI18n } from '@/lib/i18n/server'
import { declarerStatuts, envoyerEvenementsEnAttente } from '@/lib/flowmerce-statut'

/**
 * GET /api/cron/flowmerce — Vercel Cron (vercel.json).
 * Renvoie les changements de statut non encore livrés à Flowmerce (relances
 * après échec temporaire, envois interrompus), puis redéclare la liste des
 * statuts de la boutique (idempotent). Cf. lib/flowmerce-statut.
 */
export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  // Refus si CRON_SECRET n'est pas défini : sinon `Bearer undefined` passerait (CWE-1188).
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })
  }

  const bilan = await envoyerEvenementsEnAttente(100)
  // Après l'envoi : ne lève jamais, un échec est journalisé.
  const declaration = await declarerStatuts()
  return NextResponse.json({
    ...bilan,
    declarationStatuts: declaration.issue === 'declare'
      ? { issue: 'declare', declaredAt: declaration.declaredAt, nonReconnus: declaration.nonReconnus }
      : declaration,
    traiteLe: new Date().toISOString(),
  })
}
