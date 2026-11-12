'use client'

import type { ReactNode } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { tr } from '@/lib/i18n'
import { joursAvant } from '@/lib/billing-offers'
import type { FactureVue } from '@/lib/seller-billing'
import SellerInvoiceActions from '@/components/billing/SellerInvoiceActions'
import { FACTURE_STATUT_CLS, libelleOffre } from '@/components/billing/labels'

/** Une facture vendeur : montant, période, détail, échéance ou règlement. */
export default function FactureCard({
  facture: f, sellerName, children,
}: {
  facture: FactureVue
  sellerName: string
  children?: ReactNode
}) {
  const { t, fmt } = useI18n()
  const b = t.billing
  const jours = f.echeance ? joursAvant(f.echeance) : null

  const detail = f.type === 'COMMISSION'
    ? b.commissionDetail(Math.round((f.taux ?? 0) * 100), fmt.price(f.ventesBrutes), f.nbCommandes)
    : b.forfaitLabel(b.durations[f.periodicite ?? 'mensuel'] ?? '')

  let suivi: { text: string; cls: string } | null = null
  if (f.statut === 'PAYEE' && f.payeeLe)
    suivi = { text: b.paidOn(fmt.date(f.payeeLe), f.methode ? tr(b.methods, f.methode) : ''), cls: 'text-stone-500 dark:text-stone-400' }
  else if (f.statut === 'EN_ATTENTE' && f.echeance)
    suivi = jours && jours > 0
      ? { text: b.dueBefore(fmt.date(f.echeance), jours), cls: jours <= 3 ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-stone-600 dark:text-stone-300' }
      : { text: b.overdue, cls: 'text-red-600 dark:text-red-400 font-medium' }
  else if (f.statut === 'A_VENIR')
    suivi = { text: b.forfaitPendingShort, cls: 'text-stone-500 dark:text-stone-400' }

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{f.numero}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${FACTURE_STATUT_CLS[f.statut] ?? ''}`}>
              {b.invoiceStatus[f.statut] ?? f.statut}
            </span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {libelleOffre(t, f)} · {b.periodRange(fmt.date(f.periodeDebut), fmt.date(f.periodeFin))}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">{detail}</p>
          {f.avoirDeduit > 0 && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{b.creditDeducted(fmt.price(f.avoirDeduit))}</p>
          )}
        </div>
        <p className="text-xl font-semibold tabular-nums text-stone-900 dark:text-stone-100 shrink-0">{fmt.price(f.montant)}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {suivi ? <p className={`text-xs ${suivi.cls}`}>{suivi.text}</p> : <span />}
        {f.statut !== 'ANNULEE' && f.statut !== 'A_VENIR' && <SellerInvoiceActions facture={f} sellerName={sellerName} />}
      </div>
      {(f.reference || f.note) && (
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {[f.reference ? b.ref(f.reference) : null, f.note].filter(Boolean).join(' · ')}
        </p>
      )}
      {children}
    </div>
  )
}
