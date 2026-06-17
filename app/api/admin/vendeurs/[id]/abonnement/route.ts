import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  buildSellerInvoiceRecord,
  createSellerInvoiceNote,
  getSellerBillingBreakdown,
  getSellerInvoiceNumber,
  getPlainSellerInvoiceNote,
  getSubscriptionAmount,
} from '@/lib/seller-billing'

const NIVEAU_TO_PRIORITE: Record<string, number> = {
  NIVEAU_0: 0, NIVEAU_1: 1, NIVEAU_2: 2, NIVEAU_3: 3,
}

// GET — détail abonnement
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  const abonnement = await prisma.abonnement.findUnique({
    where: { vendeurId: id },
    include: { paiements: { orderBy: { createdAt: 'desc' }, take: 10 } },
  })
  if (!abonnement) return NextResponse.json(null)

  const billing = await getSellerBillingBreakdown(id, abonnement)
  const invoices = abonnement.paiements.map((payment) => {
    const invoice = buildSellerInvoiceRecord(payment, abonnement)
    return {
      ...invoice,
      paymentDate: invoice.paymentDate.toISOString(),
      periodStart: invoice.periodStart?.toISOString() ?? null,
      periodEnd: invoice.periodEnd?.toISOString() ?? null,
    }
  })

  return NextResponse.json({
    ...abonnement,
    billing,
    paiements: abonnement.paiements.map((payment) => ({
      ...payment,
      note: getPlainSellerInvoiceNote(payment.note),
    })),
    invoices,
  })
}

// POST — renouveler / changer de niveau + confirmer paiement
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const { niveau, periodicite, montant, methode, reference, note } = body
  // niveau: "NIVEAU_1"|"NIVEAU_2"|"NIVEAU_3"
  // periodicite: "mensuel"|"annuel"

  const abonnement = await prisma.abonnement.findUnique({ where: { vendeurId: id } })
  if (!abonnement)
    return NextResponse.json({ error: 'Abonnement introuvable' }, { status: 404 })

  // Calculer nouvelle dateFin
  const base = abonnement.statut === 'EXPIRE' ? new Date() : new Date(abonnement.dateFin)
  const dateDebut = new Date(base)
  const dateFin = new Date(base)
  if (periodicite === 'annuel') dateFin.setFullYear(dateFin.getFullYear() + 1)
  else dateFin.setMonth(dateFin.getMonth() + 1)

  const priorite = NIVEAU_TO_PRIORITE[niveau] ?? 3
  const billing = await getSellerBillingBreakdown(id, {
    niveau,
    periodicite,
    dateDebut,
    dateFin,
  })
  const subscriptionAmount = getSubscriptionAmount(niveau, periodicite)
  const totalDue = montant ?? billing.totalDue

  const paymentDate = new Date()
  let paymentId = ''

  await prisma.$transaction(async (tx) => {
    await tx.abonnement.update({
      where: { id: abonnement.id },
      data: { niveau, statut: 'ACTIF', dateDebut, dateFin, periodicite, notifsSent: [] },
    })

    await tx.vendeurProfile.update({
      where: { id },
      data: { prioriteAffichage: priorite },
    })

    const createdPayment = await tx.paiement.create({
      data: {
        abonnementId: abonnement.id,
        montant: totalDue,
        methode,
        reference: reference || null,
        note: createSellerInvoiceNote({
          version: 'seller_invoice_v1',
          invoiceNumber: getSellerInvoiceNumber(`tmp_${abonnement.id}`, paymentDate),
          sellerId: id,
          level: niveau,
          periodicite,
          paymentId: '',
          paidAt: paymentDate.toISOString(),
          methode,
          reference: reference || null,
          adminNote: note || null,
          ...billing,
          subscriptionAmount,
          totalDue,
        }),
        confirmeParAdmin: true,
        dateReglement: paymentDate,
      },
    })

    paymentId = createdPayment.id

    await tx.paiement.update({
      where: { id: createdPayment.id },
      data: {
        note: createSellerInvoiceNote({
          version: 'seller_invoice_v1',
          invoiceNumber: getSellerInvoiceNumber(createdPayment.id, paymentDate),
          sellerId: id,
          level: niveau,
          periodicite,
          paymentId: createdPayment.id,
          paidAt: paymentDate.toISOString(),
          methode,
          reference: reference || null,
          adminNote: note || null,
          ...billing,
          subscriptionAmount,
          totalDue,
        }),
      },
    })
  })

  return NextResponse.json({
    message: `Abonnement ${niveau} active jusqu'au ${dateFin.toLocaleDateString('fr-DZ')}`,
    billing: {
      ...billing,
      subscriptionAmount,
      totalDue,
    },
    paymentId,
  })
}

// PATCH — changer niveau uniquement (sans paiement supplémentaire)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { id } = await params
  const { niveau } = await req.json()
  const priorite = NIVEAU_TO_PRIORITE[niveau] ?? 3

  await prisma.$transaction([
    prisma.abonnement.update({ where: { vendeurId: id }, data: { niveau } }),
    prisma.vendeurProfile.update({ where: { id }, data: { prioriteAffichage: priorite } }),
  ])

  return NextResponse.json({ message: 'Niveau mis à jour' })
}
