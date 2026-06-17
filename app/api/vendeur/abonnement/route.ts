import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import {
  SELLER_SUBSCRIPTION_PRICING,
  buildSellerInvoiceRecord,
  getPlainSellerInvoiceNote,
  getSellerBillingBreakdown,
} from '@/lib/seller-billing'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const profile = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      abonnement: {
        include: {
          paiements: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      },
    },
  })

  if (!profile?.abonnement)
    return NextResponse.json({ error: 'Aucun abonnement trouvé' }, { status: 404 })

  const { abonnement } = profile
  const maintenant = new Date()
  const joursRestants = Math.ceil(
    (new Date(abonnement.dateFin).getTime() - maintenant.getTime()) / (1000 * 60 * 60 * 24)
  )
  const billing = await getSellerBillingBreakdown(profile.id, abonnement)
  const invoices = abonnement.paiements.map((payment) => {
    const invoice = buildSellerInvoiceRecord(payment, {
      vendeurId: profile.id,
      niveau: abonnement.niveau,
      periodicite: abonnement.periodicite,
      dateDebut: abonnement.dateDebut,
      dateFin: abonnement.dateFin,
    })

    return {
      ...invoice,
      paymentDate: invoice.paymentDate.toISOString(),
      periodStart: invoice.periodStart?.toISOString() ?? null,
      periodEnd: invoice.periodEnd?.toISOString() ?? null,
    }
  })

  return NextResponse.json({
    ...abonnement,
    joursRestants: Math.max(0, joursRestants),
    tarifs: SELLER_SUBSCRIPTION_PRICING,
    billing,
    paiements: abonnement.paiements.map((payment) => ({
      ...payment,
      note: getPlainSellerInvoiceNote(payment.note),
    })),
    invoices,
  })
}
