import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { getI18n } from '@/lib/i18n/server'
import { METHODES_PAIEMENT, lireOffre } from '@/lib/billing-offers'
import {
  choisirOffre, confirmerPaiementFacture, dateEffetProchaineOffre, getEtatFacturation,
} from '@/lib/seller-billing'

async function adminOnly() {
  const session = await auth()
  return session?.user?.role === 'ADMIN'
}

// GET — état de facturation du vendeur (offre, cycle, factures)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { t } = await getI18n()
  if (!(await adminOnly())) return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  const { id } = await params
  return NextResponse.json(await getEtatFacturation(id))
}

// POST — confirmer le règlement d'une facture { factureId, methode, reference?, note? }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { t } = await getI18n()
  if (!(await adminOnly())) return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  const { id } = await params
  const { factureId, methode, reference, note } = await req.json().catch(() => ({}))

  if (typeof factureId !== 'string' || !(METHODES_PAIEMENT as readonly string[]).includes(methode))
    return NextResponse.json({ error: t.api.invalidData }, { status: 400 })

  // La facture doit appartenir à ce vendeur.
  const facture = await prisma.facture.findFirst({ where: { id: factureId, abonnement: { vendeurId: id } }, select: { id: true } })
  if (!facture) return NextResponse.json({ error: t.msg.invoiceNotFound }, { status: 404 })

  const r = await confirmerPaiementFacture(facture.id, {
    methode,
    reference: typeof reference === 'string' ? reference.trim().slice(0, 100) : null,
    note: typeof note === 'string' ? note.trim().slice(0, 500) : null,
  })
  if (!r) return NextResponse.json({ error: t.msg.invoiceNotFound }, { status: 409 })
  return NextResponse.json({ message: r.debloque ? t.msg.paymentConfirmedUnblocked : t.msg.paymentConfirmed })
}

// PATCH — changer l'offre du vendeur { mode, niveau, periodicite } (prend effet au prochain cycle)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { t, fmt } = await getI18n()
  if (!(await adminOnly())) return NextResponse.json({ error: t.api.unauthorized }, { status: 403 })
  const { id } = await params
  const offre = lireOffre(await req.json().catch(() => null))
  if (!offre) return NextResponse.json({ error: t.msg.invalidOffer }, { status: 400 })

  const abo = await choisirOffre(id, offre)
  if (!abo) return NextResponse.json({ error: t.msg.subscriptionNotFound }, { status: 404 })
  return NextResponse.json({
    message: abo.prochainMode ? t.msg.offerSaved(fmt.date(dateEffetProchaineOffre(abo))) : t.msg.offerCancelled,
  })
}
