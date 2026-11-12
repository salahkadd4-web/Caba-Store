'use client'

/**
 * Choix de l'offre vendeur (8 offres : 4 niveaux × commission / forfait, + durée du forfait).
 * Utilisé par le vendeur (/vendeur/abonnement, POST) et par l'admin (fiche vendeur, PATCH).
 * L'offre choisie prend effet au prochain cycle — ou à la fin du forfait en cours.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import {
  DUREES, DUREES_FORFAIT, FORFAIT_MENSUEL, MODES_FACTURATION, NIVEAUX_VENDEUR, TAUX_COMMISSION,
  prixForfait, type DureeForfait, type ModeFacturation, type NiveauVendeur,
} from '@/lib/billing-offers'
import { libelleOffre } from '@/components/billing/labels'

type Offre = { mode: string; niveau: string; periodicite: string | null }

const memeOffre = (a: Offre, b: Offre) =>
  a.mode === b.mode && a.niveau === b.niveau && (a.mode === 'COMMISSION' || a.periodicite === b.periodicite)

export default function OffreChooser({
  endpoint, method, actuelle, prochaine, dateEffet, onSaved,
}: {
  endpoint: string
  method: 'POST' | 'PATCH'
  actuelle: Offre
  prochaine: Offre | null
  dateEffet: string
  onSaved?: () => void
}) {
  const { t, fmt } = useI18n()
  const b = t.billing
  const router = useRouter()
  const base = prochaine ?? actuelle
  const [mode, setMode] = useState<ModeFacturation>(base.mode === 'FORFAIT' ? 'FORFAIT' : 'COMMISSION')
  const [niveau, setNiveau] = useState<NiveauVendeur>(
    (NIVEAUX_VENDEUR as readonly string[]).includes(base.niveau) ? base.niveau as NiveauVendeur : 'NIVEAU_4',
  )
  const [duree, setDuree] = useState<DureeForfait>(
    (DUREES as string[]).includes(base.periodicite ?? '') ? base.periodicite as DureeForfait : 'mensuel',
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const choix: Offre = { mode, niveau, periodicite: mode === 'FORFAIT' ? duree : null }
  const dejaChoisie = memeOffre(choix, prochaine ?? actuelle)

  const envoyer = async (offre: Offre) => {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offre),
      })
      const data = await res.json().catch(() => ({}))
      setMsg({ ok: res.ok, text: data.message ?? data.error ?? b.genericError })
      if (res.ok) { router.refresh(); onSaved?.() }
    } finally {
      setSaving(false)
    }
  }

  const segment = (actif: boolean) =>
    `flex-1 px-3 py-2 rounded-xl text-sm font-medium transition ${
      actif
        ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
        : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200'
    }`

  return (
    <div className="space-y-4">
      {prochaine && (
        <div className="rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-blue-800 dark:text-blue-300">
            {b.nextOffer(libelleOffre(t, prochaine), fmt.date(dateEffet))}
          </p>
          <button type="button" disabled={saving} onClick={() => envoyer(actuelle)}
            className="text-sm font-medium text-blue-800 dark:text-blue-300 hover:underline disabled:opacity-50 shrink-0 text-start">
            {b.cancelChange}
          </button>
        </div>
      )}

      {/* Formule */}
      <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800" role="tablist">
        {MODES_FACTURATION.map(m => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={segment(mode === m)}>
            {b.modes[m]}
          </button>
        ))}
      </div>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {mode === 'COMMISSION' ? b.commissionIntro : b.forfaitIntro}
      </p>

      {/* Durée du forfait */}
      {mode === 'FORFAIT' && (
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1.5">{b.durationLabel}</p>
          <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
            {DUREES.map(d => (
              <button key={d} type="button" onClick={() => setDuree(d)} className={segment(duree === d)}>
                {b.durations[d]}
                {DUREES_FORFAIT[d].remise > 0 && (
                  <span className="ms-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    −{Math.round(DUREES_FORFAIT[d].remise * 100)} %
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Niveaux */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {NIVEAUX_VENDEUR.map(n => {
          const selected = niveau === n
          const estActuelle = memeOffre({ mode, niveau: n, periodicite: mode === 'FORFAIT' ? duree : null }, actuelle)
          return (
            <button key={n} type="button" onClick={() => setNiveau(n)} aria-pressed={selected}
              className={`text-start rounded-2xl border p-4 transition ${
                selected
                  ? 'border-orange-600 dark:border-orange-500 ring-1 ring-orange-600 dark:ring-orange-500 bg-white dark:bg-stone-900'
                  : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-stone-300 dark:hover:border-stone-600'
              }`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100">{b.levels[n].label}</p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">{b.levels[n].desc}</p>
                </div>
                {selected
                  ? <span className="w-5 h-5 rounded-full bg-orange-700 text-white flex items-center justify-center shrink-0"><Check className="w-3 h-3" /></span>
                  : <span className="w-5 h-5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0" />}
              </div>
              <p className="mt-3 text-lg font-semibold tabular-nums text-stone-900 dark:text-stone-100">
                {mode === 'COMMISSION'
                  ? `${Math.round(TAUX_COMMISSION[n] * 100)} %`
                  : <>{fmt.price(FORFAIT_MENSUEL[n])}<span className="text-sm font-normal text-stone-500 dark:text-stone-400"> {b.perMonth}</span></>}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {mode === 'COMMISSION' ? b.perOrder : b.forfaitTotal(fmt.price(prixForfait(n, duree)), b.durations[duree])}
              </p>
              {estActuelle && (
                <span className="mt-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                  {b.currentOffer}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-stone-500 dark:text-stone-400">{b.priorityNote}</p>

      {msg && (
        <p className={`text-sm font-medium ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
          {msg.text}
        </p>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <p className="text-xs text-stone-500 dark:text-stone-400">{b.takesEffect(fmt.date(dateEffet))}</p>
        <button type="button" disabled={saving || dejaChoisie} onClick={() => envoyer(choix)}
          className="bg-orange-700 hover:bg-orange-800 active:scale-95 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:active:scale-100">
          {saving ? t.common.saving : b.confirmChoice}
        </button>
      </div>
    </div>
  )
}
