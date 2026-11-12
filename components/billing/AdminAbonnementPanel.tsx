'use client'

/**
 * Onglet « Abonnement » de la fiche vendeur (admin) : offre, commission en cours,
 * factures à encaisser (avec confirmation du paiement), changement d'offre, historique.
 */

import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/components/I18nProvider'
import { METHODES_PAIEMENT, prioriteDuNiveau } from '@/lib/billing-offers'
import type { EtatFacturation, FactureVue } from '@/lib/seller-billing'
import FactureCard from '@/components/billing/FactureCard'
import OffreChooser from '@/components/billing/OffreChooser'
import { ABO_STATUT_CLS, libelleOffre } from '@/components/billing/labels'

const field = 'w-full rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 px-3 py-2 text-sm text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-400 transition'

function PaiementForm({ vendeurId, facture, onDone }: { vendeurId: string; facture: FactureVue; onDone: (msg: string) => void }) {
  const { t, fmt } = useI18n()
  const s_ = t.admin.subs
  const [form, setForm] = useState({ methode: 'virement', reference: '', note: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/admin/vendeurs/${vendeurId}/abonnement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factureId: facture.id, ...form }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) onDone(data.message)
      else setError(data.error ?? t.billing.genericError)
    } finally { setSaving(false) }
  }

  return (
    <div className="border-t border-stone-100 dark:border-stone-800 pt-3 space-y-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={form.methode} onChange={e => setForm(f => ({ ...f, methode: e.target.value }))} className={field} aria-label={s_.method}>
          {METHODES_PAIEMENT.map(m => <option key={m} value={m}>{t.billing.methods[m]}</option>)}
        </select>
        <input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
          placeholder={s_.referencePlaceholder} className={field} aria-label={s_.reference} />
        <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          placeholder={s_.notePlaceholder} className={field} aria-label={s_.note} />
      </div>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button type="button" onClick={submit} disabled={saving}
        className="w-full bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl text-sm transition active:scale-95">
        {saving ? t.common.saving : s_.confirmPayment(fmt.price(facture.montant))}
      </button>
    </div>
  )
}

export default function AdminAbonnementPanel({ vendeurId, sellerName }: { vendeurId: string; sellerName: string }) {
  const { t, fmt } = useI18n()
  const b = t.billing
  const s_ = t.admin.subs
  const [etat, setEtat] = useState<EtatFacturation | null>(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)

  const [reloadKey, setReloadKey] = useState(0)
  const load = useCallback(() => setReloadKey(k => k + 1), [])

  useEffect(() => {
    let cancelled = false
    fetch(`/api/admin/vendeurs/${vendeurId}/abonnement`)
      .then(res => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data: EtatFacturation | null) => {
        if (cancelled) return
        setEtat(data)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [vendeurId, reloadKey])

  const done = (m: string) => { setMsg(m); load(); setTimeout(() => setMsg(null), 4000) }

  if (loading) return <p className="text-sm text-stone-400 text-center py-8">{t.common.loading}</p>
  if (!etat) return <p className="text-sm text-stone-400 text-center py-8">{s_.noSubscription}</p>

  const aEncaisser = [...etat.aPayer, ...(etat.forfaitAVenir ? [etat.forfaitAVenir] : [])]

  return (
    <div className="space-y-4">
      {msg && <p className="text-sm text-center font-medium text-emerald-700 dark:text-emerald-400">{msg}</p>}

      <div className="bg-stone-50 dark:bg-stone-800 rounded-xl p-4 space-y-2.5 text-sm">
        {[
          { label: s_.colStatus, value: <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ABO_STATUT_CLS[etat.statut] ?? ''}`}>{b.status[etat.statut] ?? etat.statut}</span> },
          { label: s_.colOffer, value: <span className="font-semibold text-stone-800 dark:text-stone-100 text-end">{libelleOffre(t, etat)}</span> },
          { label: b.displayPriority, value: <span className="font-semibold text-stone-800 dark:text-stone-100">{b.priorityN(prioriteDuNiveau(etat.niveau))}</span> },
          etat.mode === 'FORFAIT' && etat.forfaitFin
            ? { label: b.forfaitEnds, value: <span className="font-semibold text-stone-800 dark:text-stone-100">{fmt.date(etat.forfaitFin)}</span> }
            : { label: b.currentCycle, value: <span className="font-semibold text-stone-800 dark:text-stone-100 text-end">{b.periodRange(fmt.date(etat.cycleDebut), fmt.date(etat.cycleFin))}</span> },
          { label: b.toPay, value: <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-100">{fmt.price(etat.totalAPayer)}</span> },
          ...(etat.avoir > 0 ? [{ label: b.invoice.credit, value: <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{fmt.price(etat.avoir)}</span> }] : []),
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center gap-3">
            <span className="text-stone-500">{label}</span>
            {value}
          </div>
        ))}
      </div>

      {etat.commissionEnCours && (
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-4 text-sm">
          <p className="text-xs text-stone-500 mb-1">{b.commissionThisCycle}</p>
          <p className="text-lg font-semibold tabular-nums text-stone-900 dark:text-white">{fmt.price(etat.commissionEnCours.montant)}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {b.commissionDetail(Math.round(etat.commissionEnCours.taux * 100), fmt.price(etat.commissionEnCours.ventesBrutes), etat.commissionEnCours.nbCommandes)}
          </p>
        </div>
      )}

      <div>
        <p className="font-semibold text-sm text-stone-800 dark:text-stone-100 mb-2">{s_.toCollectTitle}</p>
        {aEncaisser.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">{b.nothingToPay}</p>
        ) : (
          <div className="space-y-3">
            {aEncaisser.map(f => (
              <FactureCard key={f.id} facture={f} sellerName={sellerName}>
                <PaiementForm vendeurId={vendeurId} facture={f} onDone={done} />
              </FactureCard>
            ))}
          </div>
        )}
      </div>

      <div className="border border-stone-200 dark:border-stone-700 rounded-xl p-4">
        <p className="font-semibold text-sm text-stone-800 dark:text-stone-100 mb-3">{s_.changeOffer}</p>
        <OffreChooser
          key={`${etat.prochaineOffre?.mode}-${etat.prochaineOffre?.niveau}-${etat.prochaineOffre?.periodicite}`}
          endpoint={`/api/admin/vendeurs/${vendeurId}/abonnement`}
          method="PATCH"
          actuelle={{ mode: etat.mode, niveau: etat.niveau, periodicite: etat.periodicite }}
          prochaine={etat.prochaineOffre}
          dateEffet={etat.prochaineOffre?.dateEffet ?? etat.dateEffetChangement}
          onSaved={load}
        />
      </div>

      {etat.historique.length > 0 && (
        <div>
          <p className="font-semibold text-sm text-stone-800 dark:text-stone-100 mb-2">{b.history}</p>
          <div className="space-y-2">
            {etat.historique.map(f => <FactureCard key={f.id} facture={f} sellerName={sellerName} />)}
          </div>
        </div>
      )}
    </div>
  )
}
