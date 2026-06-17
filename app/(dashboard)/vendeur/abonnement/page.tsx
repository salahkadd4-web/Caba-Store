import { auth }     from '@/auth'
import { redirect } from 'next/navigation'
import { prisma }   from '@/lib/prisma'
import { AlertTriangle, CheckCircle2, Clock, CreditCard, Percent, Receipt, XCircle } from 'lucide-react'
import SellerInvoiceActions from '@/components/billing/SellerInvoiceActions'
import { SELLER_SALE_FEE_RATE, SELLER_SUBSCRIPTION_PRICING, buildSellerInvoiceRecord, getPlainSellerInvoiceNote, getSellerBillingBreakdown } from '@/lib/seller-billing'

const TARIFS = SELLER_SUBSCRIPTION_PRICING

const NIVEAU_COLOR: Record<string, string> = {
  NIVEAU_1: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  NIVEAU_2: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  NIVEAU_3: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
}

export default async function VendeurAbonnementPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'VENDEUR') redirect('/connexion')

  const profile = await prisma.vendeurProfile.findUnique({
    where: { userId: session.user.id },
    include: {
      abonnement: {
        include: { paiements: { orderBy: { createdAt: 'desc' }, take: 10 } },
      },
    },
  })

  // Le layout (vendeur/layout.tsx) bloque les vendeurs non approuvés avant d'atteindre cette page.
  if (!profile) return null

  const abo = profile.abonnement
  const billing = await getSellerBillingBreakdown(profile.id, abo)
  const sellerName = profile.nomBoutique || `${session.user.name ?? 'Vendeur'}`
  const now = new Date()
  const joursRestants = abo
    ? Math.max(0, Math.ceil((new Date(abo.dateFin).getTime() - now.getTime()) / 86400000))
    : 0

  const statutConfig = {
    GRATUIT:  { label: 'Période gratuite', color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2, bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
    ACTIF:    { label: 'Abonnement actif', color: 'text-teal-600 dark:text-teal-400',       icon: CheckCircle2, bg: 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800' },
    EXPIRE:   { label: 'Abonnement expiré', color: 'text-red-600 dark:text-red-400',        icon: XCircle,      bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' },
    SUSPENDU: { label: 'Suspendu',          color: 'text-orange-600 dark:text-orange-400',  icon: AlertTriangle, bg: 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' },
  }

  const sc   = abo ? statutConfig[abo.statut as keyof typeof statutConfig] : null
  const Icon = sc?.icon ?? Clock

  const progressPct = abo && abo.statut !== 'EXPIRE'
    ? Math.min(100, (joursRestants / 365) * 100)
    : 0

  const invoices = abo?.paiements.map((payment) => buildSellerInvoiceRecord(payment, {
    vendeurId: profile.id,
    niveau: abo.niveau,
    periodicite: abo.periodicite,
    dateDebut: abo.dateDebut,
    dateFin: abo.dateFin,
  })) ?? []

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-stone-800 dark:text-stone-100">Mon Abonnement</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Gérez votre abonnement vendeur</p>
        </div>
      </div>

      {/* Statut actuel */}
      {abo && sc ? (
        <div className={`border rounded-2xl p-5 ${sc.bg}`}>
          <div className="flex items-center gap-3 mb-4">
            <Icon className={`w-6 h-6 ${sc.color}`} />
            <div>
              <p className={`text-lg font-bold ${sc.color}`}>{sc.label}</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                {abo.statut === 'EXPIRE'
                  ? `Expiré le ${new Date(abo.dateFin).toLocaleDateString('fr-DZ')}`
                  : `Expire le ${new Date(abo.dateFin).toLocaleDateString('fr-DZ')} — ${joursRestants} jour${joursRestants > 1 ? 's' : ''} restant${joursRestants > 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>

          {/* Barre de progression */}
          {abo.statut !== 'EXPIRE' && (
            <div className="w-full bg-stone-200 dark:bg-stone-700 rounded-full h-2 mb-4">
              <div
                className={`h-2 rounded-full transition-all ${joursRestants <= 7 ? 'bg-orange-500' : 'bg-teal-500'}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
              <p className="text-stone-500 dark:text-stone-400 text-xs mb-0.5">Niveau</p>
              <p className="font-semibold text-stone-900 dark:text-stone-100">
                {TARIFS[abo.niveau as keyof typeof TARIFS]?.label ?? abo.niveau}
              </p>
              <span className={`mt-1 inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${NIVEAU_COLOR[abo.niveau] ?? ''}`}>
                {TARIFS[abo.niveau as keyof typeof TARIFS]?.desc ?? ''}
              </span>
            </div>
            <div className="bg-white/60 dark:bg-black/20 rounded-xl p-3">
              <p className="text-stone-500 dark:text-stone-400 text-xs mb-0.5">Périodicité</p>
              <p className="font-semibold text-stone-900 dark:text-stone-100 capitalize">
                {abo.periodicite ?? 'Offert'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 p-8 text-center">
          <Clock className="w-10 h-10 mx-auto mb-3 text-stone-300" />
          <p className="text-stone-500 dark:text-stone-400">Aucun abonnement trouvé.</p>
        </div>
      )}

      {/* Alerte renouvellement */}
      {abo && (abo.statut === 'EXPIRE' || joursRestants <= 14) && (
        <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
          <p className="font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2 mb-1 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {abo.statut === 'EXPIRE'
              ? 'Votre abonnement a expiré — vos produits ne sont plus affichés.'
              : `Votre abonnement expire dans ${joursRestants} jour${joursRestants > 1 ? 's' : ''}.`}
          </p>
          <p className="text-sm text-orange-600 dark:text-orange-400">
            Contactez l&apos;administration pour renouveler votre abonnement.
          </p>
        </div>
      )}

      {/* Grille des plans */}
      <div>
        <h2 className="text-base font-bold text-stone-700 dark:text-stone-200 mb-3">Nos plans d&apos;abonnement</h2>
        <div className="grid gap-3">
          {(Object.entries(TARIFS) as [string, typeof TARIFS[keyof typeof TARIFS]][]).map(([key, t]) => {
            const isActuel = abo?.niveau === key
            return (
              <div key={key}
                className={`rounded-2xl border p-4 flex justify-between items-center transition ${
                  isActuel
                    ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-600'
                }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-stone-900 dark:text-stone-100">{t.label}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${NIVEAU_COLOR[key] ?? ''}`}>
                      {t.desc}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    <span className="font-bold text-stone-800 dark:text-stone-100">{t.mensuel.toLocaleString('fr-DZ')} DA</span>
                    {' '}/mois
                    <span className="ml-3 text-xs text-stone-400">ou {t.annuel.toLocaleString('fr-DZ')} DA/an</span>
                  </p>
                </div>
                {isActuel && (
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900 px-3 py-1.5 rounded-full shrink-0">
                    Plan actuel
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-stone-400 mt-3 text-center">
          Pour changer de plan ou renouveler, contactez l&apos;administration.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-[0.18em] mb-2">
            <CreditCard className="w-3.5 h-3.5" /> Abonnement
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{billing.subscriptionAmount.toLocaleString('fr-DZ')} DA</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">Montant du plan actif pour la periode en cours</p>
        </div>
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400 text-xs uppercase tracking-[0.18em] mb-2">
            <Percent className="w-3.5 h-3.5" /> Frais sur ventes
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-100">{billing.salesFee.toLocaleString('fr-DZ')} DA</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">{Math.round(SELLER_SALE_FEE_RATE * 100)}% sur {billing.grossSales.toLocaleString('fr-DZ')} DA de ventes livrees</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs uppercase tracking-[0.18em] mb-2">
            <Receipt className="w-3.5 h-3.5" /> Total a payer
          </div>
          <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">{billing.totalDue.toLocaleString('fr-DZ')} DA</p>
          <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">Abonnement + frais de ventes pour la periode en cours</p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
        <div>
          <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">Detail de facturation</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            {billing.periodStart && billing.periodEnd
              ? `Periode prise en compte : du ${new Date(billing.periodStart).toLocaleDateString('fr-DZ')} au ${new Date(billing.periodEnd).toLocaleDateString('fr-DZ')}`
              : 'Les frais de ventes sont calcules sur les commandes livrees de la periode d abonnement en cours.'}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Ventes livrees</p>
            <p className="text-lg font-semibold text-stone-900 dark:text-stone-100">{billing.grossSales.toLocaleString('fr-DZ')} DA</p>
            <p className="text-xs text-stone-400 mt-1">{billing.deliveredOrdersCount} commande(s) livree(s) · {billing.soldItemsCount} ligne(s) vendue(s)</p>
          </div>
          <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Formule de calcul</p>
            <p className="text-sm text-stone-800 dark:text-stone-100 font-medium">{billing.subscriptionAmount.toLocaleString('fr-DZ')} DA + {billing.salesFee.toLocaleString('fr-DZ')} DA</p>
            <p className="text-xs text-stone-400 mt-1">Abonnement selectionne + commission de {Math.round(SELLER_SALE_FEE_RATE * 100)}%</p>
          </div>
        </div>
      </div>

      {/* Historique paiements */}
      {abo && abo.paiements.length > 0 && (
        <div>
          <h2 className="text-base font-bold text-stone-700 dark:text-stone-200 mb-3">Historique de facturation</h2>
          <div className="space-y-3">
            {invoices.map((invoice, idx) => (
              <div key={invoice.paymentId} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 md:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2 min-w-0">
                    <div>
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-stone-400">Reglee le {new Date(invoice.paymentDate).toLocaleDateString('fr-DZ')} · {invoice.methode}</p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Periode</p>
                        <p className="font-medium text-stone-800 dark:text-stone-100">
                          {invoice.periodStart && invoice.periodEnd
                            ? `${new Date(invoice.periodStart).toLocaleDateString('fr-DZ')} - ${new Date(invoice.periodEnd).toLocaleDateString('fr-DZ')}`
                            : 'Non definie'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Total facture</p>
                        <p className="font-medium text-stone-800 dark:text-stone-100">{invoice.totalDue.toLocaleString('fr-DZ')} DA</p>
                      </div>
                      <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Abonnement</p>
                        <p className="font-medium text-stone-800 dark:text-stone-100">{invoice.subscriptionAmount.toLocaleString('fr-DZ')} DA</p>
                      </div>
                      <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">Frais ventes</p>
                        <p className="font-medium text-stone-800 dark:text-stone-100">{invoice.salesFee.toLocaleString('fr-DZ')} DA</p>
                      </div>
                    </div>
                    {(invoice.reference || invoice.adminNote || abo.paiements[idx]?.note) && (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {invoice.reference ? `Ref. ${invoice.reference}` : ''}
                        {invoice.reference && (invoice.adminNote || abo.paiements[idx]?.note) ? ' · ' : ''}
                        {invoice.adminNote || getPlainSellerInvoiceNote(abo.paiements[idx]?.note)}
                      </p>
                    )}
                  </div>

                  <SellerInvoiceActions invoice={{
                    invoiceNumber: invoice.invoiceNumber,
                    sellerName,
                    levelLabel: TARIFS[invoice.level as keyof typeof TARIFS]?.label ?? invoice.level,
                    periodiciteLabel: invoice.periodicite ?? 'Offert',
                    paymentDateLabel: new Date(invoice.paymentDate).toLocaleDateString('fr-DZ'),
                    periodLabel: invoice.periodStart && invoice.periodEnd
                      ? `${new Date(invoice.periodStart).toLocaleDateString('fr-DZ')} - ${new Date(invoice.periodEnd).toLocaleDateString('fr-DZ')}`
                      : 'Non definie',
                    paymentMethodLabel: invoice.methode,
                    reference: invoice.reference,
                    adminNote: invoice.adminNote,
                    grossSalesLabel: `${invoice.grossSales.toLocaleString('fr-DZ')} DA`,
                    salesFeeLabel: `${invoice.salesFee.toLocaleString('fr-DZ')} DA`,
                    subscriptionAmountLabel: `${invoice.subscriptionAmount.toLocaleString('fr-DZ')} DA`,
                    totalDueLabel: `${invoice.totalDue.toLocaleString('fr-DZ')} DA`,
                    deliveredOrdersCount: invoice.deliveredOrdersCount,
                    soldItemsCount: invoice.soldItemsCount,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
