import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'
import { lireOffre } from '@/lib/billing-offers'
import { choisirOffre, dateEffetProchaineOffre, getEtatFacturation } from '@/lib/seller-billing'

async function vendeurApprouve() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') return null
  return prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true, statut: true },
  })
}

// GET — état de facturation du vendeur connecté
export async function GET() {
  const { t } = await getI18n()
  const vendeur = await vendeurApprouve()
  if (!vendeur) return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  const etat = await getEtatFacturation(vendeur.id)
  if (!etat) return NextResponse.json({ error: t.msg.noSubscription }, { status: 404 })
  return NextResponse.json(etat)
}

// POST — choisir son offre { mode, niveau, periodicite } (prend effet au prochain cycle)
export async function POST(req: NextRequest) {
  const { t, fmt } = await getI18n()
  const vendeur = await vendeurApprouve()
  if (!vendeur || vendeur.statut !== 'APPROUVE')
    return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })

  const offre = lireOffre(await req.json().catch(() => null))
  if (!offre) return NextResponse.json({ error: t.msg.invalidOffer }, { status: 400 })

  const abo = await choisirOffre(vendeur.id, offre)
  if (!abo) return NextResponse.json({ error: t.msg.noSubscription }, { status: 404 })
  return NextResponse.json({
    message: abo.prochainMode ? t.msg.offerSaved(fmt.date(dateEffetProchaineOffre(abo))) : t.msg.offerCancelled,
  })
}
