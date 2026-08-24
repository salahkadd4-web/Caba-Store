'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { modalOverlay, modalBox, selectCls, inputCls, btnDangerSolid, btnSecondary } from '@/lib/dashboard-ui'
import type { Commande } from './DashboardCommandesView'

const MOTIFS = [
  { value: 'CLIENT_ABSENT',              label: 'Client absent' },
  { value: 'CLIENT_A_CHANGE_AVIS',       label: "Client a changé d'avis" },
  { value: 'CLIENT_A_REFUSE_SANS_MOTIF', label: 'Client a refusé sans motif' },
  { value: 'AUTRE',                      label: 'Autre' },
] as const

export default function RefusLivraisonModal({
  cmd,
  isAdmin,
  onClose,
  onReported,
}: {
  cmd: Commande
  isAdmin: boolean
  onClose: () => void
  onReported: (message: string) => void
}) {
  const [motif,     setMotif]     = useState<string>('')
  const [details,   setDetails]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const isAutre = motif === 'AUTRE'

  const handleSubmit = async () => {
    if (!motif) { setError('Sélectionnez un motif.'); return }
    if (isAutre && !details.trim()) { setError('Précisez le motif.'); return }

    setSubmitting(true)
    setError(null)
    try {
      const url = isAdmin
        ? `/api/admin/commandes/${cmd.id}/refus-livraison`
        : `/api/vendeur/commandes/${cmd.id}/refus-livraison`
      const res  = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ motif, details: isAutre ? details.trim() : undefined }),
      })
      const data = await res.json().catch(() => ({})) as { message?: string; error?: string }
      if (!res.ok) throw new Error(data.error || 'Erreur lors du signalement')
      onReported(data.message ?? 'Refus signalé à Flowmerce.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur lors du signalement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={modalOverlay} onClick={onClose}>
      <div className={`${modalBox} max-w-md p-6`} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-800 dark:text-stone-100">
                Signaler un refus à la livraison
              </h3>
              <p className="text-xs text-stone-400">Commande #{cmd.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400 mb-4">
          Ce signalement est transmis à Flowmerce et contribue au score anti-fraude du
          client, partagé entre boutiques partenaires. Cette action est définitive.
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">
              Motif du refus
            </label>
            <select
              value={motif}
              onChange={e => setMotif(e.target.value)}
              className={`${selectCls} w-full`}
            >
              <option value="">Sélectionnez un motif…</option>
              {MOTIFS.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {isAutre && (
            <div>
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 block">
                Précisez
              </label>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                rows={3}
                placeholder="Décrivez le motif du refus…"
                className={`${inputCls} resize-none`}
              />
            </div>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button onClick={onClose} disabled={submitting} className={btnSecondary}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={submitting} className={`${btnDangerSolid} flex items-center gap-1.5`}>
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Signaler
          </button>
        </div>
      </div>
    </div>
  )
}
