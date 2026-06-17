import { prisma } from '@/lib/prisma'

export const SELLER_SALE_FEE_RATE = 0.01
const SELLER_INVOICE_PREFIX = '__SELLER_INVOICE__'

export const SELLER_SUBSCRIPTION_PRICING = {
  NIVEAU_1: { mensuel: 5000, annuel: 50000, label: 'Niveau 1', desc: 'Priorite haute' },
  NIVEAU_2: { mensuel: 4000, annuel: 40000, label: 'Niveau 2', desc: 'Priorite moyenne' },
  NIVEAU_3: { mensuel: 3000, annuel: 30000, label: 'Niveau 3', desc: 'Priorite standard' },
} as const

export type SellerSubscriptionLevel = keyof typeof SELLER_SUBSCRIPTION_PRICING

export interface SellerBillingBreakdown {
  rate: number
  subscriptionAmount: number
  grossSales: number
  salesFee: number
  totalDue: number
  soldItemsCount: number
  deliveredOrdersCount: number
  periodStart: Date | null
  periodEnd: Date | null
}

export interface SellerInvoicePayload extends SellerBillingBreakdown {
  version: 'seller_invoice_v1'
  invoiceNumber: string
  sellerId: string
  level: string
  periodicite: string | null
  paymentId: string
  paidAt: string
  methode: string
  reference: string | null
  adminNote: string | null
}

export interface SellerInvoiceRecord extends SellerInvoicePayload {
  amount: number
  paymentDate: Date
}

export function getSubscriptionAmount(
  niveau: string,
  periodicite: string | null | undefined,
) {
  const pricing = SELLER_SUBSCRIPTION_PRICING[niveau as SellerSubscriptionLevel]
  const cycle = periodicite === 'annuel' ? 'annuel' : 'mensuel'

  if (!pricing) return 0
  return pricing[cycle]
}

export function getSellerInvoiceNumber(paymentId: string, paidAt: Date) {
  const stamp = paidAt.toISOString().slice(0, 10).replace(/-/g, '')
  return `FAC-${stamp}-${paymentId.slice(-6).toUpperCase()}`
}

export function createSellerInvoiceNote(payload: SellerInvoicePayload) {
  return `${SELLER_INVOICE_PREFIX}${JSON.stringify(payload)}`
}

export function parseSellerInvoiceNote(note: string | null | undefined): SellerInvoicePayload | null {
  if (!note || !note.startsWith(SELLER_INVOICE_PREFIX)) return null

  try {
    return JSON.parse(note.slice(SELLER_INVOICE_PREFIX.length)) as SellerInvoicePayload
  } catch {
    return null
  }
}

export function getPlainSellerInvoiceNote(note: string | null | undefined) {
  const parsed = parseSellerInvoiceNote(note)
  if (parsed) return parsed.adminNote
  return note ?? null
}

export function buildSellerInvoiceRecord(
  payment: {
    id: string
    montant: number
    methode: string
    reference: string | null
    note: string | null
    dateReglement: Date
  },
  abonnement?: {
    vendeurId: string
    niveau: string
    periodicite: string | null
    dateDebut: Date
    dateFin: Date
  } | null,
) {
  const parsed = parseSellerInvoiceNote(payment.note)

  if (parsed) {
    return {
      ...parsed,
      amount: payment.montant,
      paymentDate: payment.dateReglement,
    } satisfies SellerInvoiceRecord
  }

  const periodStart = abonnement?.dateDebut ?? null
  const periodEnd = abonnement?.dateFin ?? null
  const subscriptionAmount = abonnement
    ? getSubscriptionAmount(abonnement.niveau, abonnement.periodicite)
    : payment.montant

  return {
    version: 'seller_invoice_v1',
    invoiceNumber: getSellerInvoiceNumber(payment.id, payment.dateReglement),
    sellerId: abonnement?.vendeurId ?? '',
    level: abonnement?.niveau ?? 'NIVEAU_3',
    periodicite: abonnement?.periodicite ?? null,
    paymentId: payment.id,
    paidAt: payment.dateReglement.toISOString(),
    methode: payment.methode,
    reference: payment.reference,
    adminNote: getPlainSellerInvoiceNote(payment.note),
    rate: SELLER_SALE_FEE_RATE,
    subscriptionAmount,
    grossSales: 0,
    salesFee: Number((payment.montant - subscriptionAmount).toFixed(2)),
    totalDue: payment.montant,
    soldItemsCount: 0,
    deliveredOrdersCount: 0,
    periodStart,
    periodEnd,
    amount: payment.montant,
    paymentDate: payment.dateReglement,
  } satisfies SellerInvoiceRecord
}

export async function getSellerBillingBreakdown(
  vendeurId: string,
  abonnement?: {
    niveau: string
    periodicite: string | null
    dateDebut: Date
    dateFin: Date
  } | null,
) {
  const periodStart = abonnement?.dateDebut ?? null
  const periodEnd = abonnement?.dateFin ?? null

  const rows = await prisma.$queryRaw<Array<{
    gross: number | null
    items_count: number | null
    orders_count: number | null
  }>>`
    SELECT
      COALESCE(SUM(oi.prix * oi.quantite), 0)::float AS gross,
      COUNT(oi.id)::int AS items_count,
      COUNT(DISTINCT oi."orderId")::int AS orders_count
    FROM "OrderItem" oi
    JOIN "Product" p ON p.id = oi."productId"
    JOIN "Order" o ON o.id = oi."orderId"
    WHERE p."vendeurId" = ${vendeurId}
      AND o.statut = 'LIVREE'
      AND (${periodStart}::timestamp IS NULL OR o."createdAt" >= ${periodStart})
      AND (${periodEnd}::timestamp IS NULL OR o."createdAt" <= ${periodEnd})
  `

  const grossSales = rows[0]?.gross ?? 0
  const soldItemsCount = rows[0]?.items_count ?? 0
  const deliveredOrdersCount = rows[0]?.orders_count ?? 0
  const salesFee = Number((grossSales * SELLER_SALE_FEE_RATE).toFixed(2))
  const subscriptionAmount = abonnement
    ? getSubscriptionAmount(abonnement.niveau, abonnement.periodicite)
    : 0
  const totalDue = Number((subscriptionAmount + salesFee).toFixed(2))

  return {
    rate: SELLER_SALE_FEE_RATE,
    subscriptionAmount,
    grossSales,
    salesFee,
    totalDue,
    soldItemsCount,
    deliveredOrdersCount,
    periodStart,
    periodEnd,
  } satisfies SellerBillingBreakdown
}
