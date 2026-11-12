import { NextRequest, NextResponse } from 'next/server'
import { getI18n } from '@/lib/i18n/server'
import { traiterAbonnements } from '@/lib/billing-cron'

/**
 * GET /api/cron/abonnements — Vercel Cron, une fois par jour (vercel.json).
 * Clôture des cycles, factures de commission, forfaits exigibles, rappels,
 * blocage des impayés : voir lib/billing-cron.ts.
 */
export async function GET(req: NextRequest) {
  const { t } = await getI18n()
  // Refus si CRON_SECRET n'est pas défini : sinon `Bearer undefined` passerait (CWE-1188).
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: t.api.unauthorized }, { status: 401 })
  }

  const now = new Date()
  const resultat = await traiterAbonnements(now)
  return NextResponse.json({ ...resultat, traiteLe: now.toISOString() })
}
