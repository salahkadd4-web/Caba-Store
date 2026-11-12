'use client'

/**
 * Page Retours (admin) : réclamations des clients, filtrables par statut,
 * avec décision Accepter / Refuser. Accepter corrige la commission du vendeur.
 */

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, PackageX, Store, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import type { RetourAdmin } from '@/lib/retours-admin'

const STATUT_CLS: Record<string, string> = {
  PENDING:  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  REJECTED: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300',
}

type Filtre = '' | 'PENDING' | 'APPROVED' | 'REJECTED'

function RetourCard({ r }: { r: RetourAdmin }) {
  const { t, fmt } = useI18n()
  const a = t.returns.admin
  const router = useRouter()
  const [saving, setSaving] = useState<'APPROVED' | 'REJECTED' | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const decider = async (decision: 'APPROVED' | 'REJECTED') => {
    setSaving(decision); setMsg(null)
    try {
      const res = await fetch(`/api/admin/retours/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      })
      const data = await res.json().catch(() => ({}))
      setMsg({ ok: res.ok, text: data.message ?? data.error ?? a.genericError })
      if (res.ok) router.refresh()
    } finally { setSaving(null) }
  }

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUT_CLS[r.status] ?? ''}`}>
              {a.status[r.status] ?? r.status}
            </span>
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{a.order(r.orderId.slice(-8).toUpperCase())}</span>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {a.requestedOn(fmt.date(r.createdAt))}
            {r.decideLe && ` · ${a.decidedOn(fmt.date(r.decideLe))}`}
          </p>
        </div>
        <p className="text-lg font-semibold tabular-nums text-stone-900 dark:text-stone-100">{fmt.price(r.montant)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 text-sm">
        <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{a.client}</p>
          <p className="font-medium text-stone-800 dark:text-stone-100">{r.client.nom}</p>
          {r.client.contact && <p className="text-xs text-stone-500 dark:text-stone-400" dir="ltr">{r.client.contact}</p>}
        </div>
        <div className="rounded-xl bg-stone-50 dark:bg-stone-800/70 p-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-0.5">{a.seller}</p>
          {r.vendeur ? (
            <Link href={`/admin/vendeurs?id=${r.vendeur.id}&tab=abonnement`} className="font-medium text-stone-800 dark:text-stone-100 hover:underline inline-flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-stone-400" /> {r.vendeur.nom ?? '—'}
            </Link>
          ) : (
            <p className="font-medium text-stone-800 dark:text-stone-100">{a.adminCatalog}</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">{r.commandeEntiere ? a.wholeOrder : a.product}</p>
        <ul className="space-y-2">
          {r.articles.map((art, i) => (
            <li key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-stone-200 dark:border-stone-700 overflow-hidden shrink-0 relative">
                {art.image && <Image src={art.image} alt="" fill sizes="48px" className="object-contain" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate">{art.nom}</p>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {art.variante ? `${art.variante} · ` : ''}{art.quantite} × {fmt.price(art.prix)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {r.reponses.length > 0 && (
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3">
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-1.5">{a.answers}</p>
          <dl className="space-y-1 text-sm">
            {r.reponses.map(x => (
              <div key={x.cle} className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-stone-500 dark:text-stone-400 shrink-0">{x.cle} :</dt>
                <dd className="text-stone-800 dark:text-stone-100 break-words">{x.valeur}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {msg && (
        <p className={`text-sm font-medium ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{msg.text}</p>
      )}

      {r.status === 'PENDING' ? (
        <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={() => decider('APPROVED')} disabled={!!saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-orange-700 hover:bg-orange-800 active:scale-95 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50">
            <Check className="w-4 h-4" /> {saving === 'APPROVED' ? t.common.saving : a.accept}
          </button>
          <button type="button" onClick={() => decider('REJECTED')} disabled={!!saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-all active:scale-95 disabled:opacity-50">
            <X className="w-4 h-4" /> {saving === 'REJECTED' ? t.common.saving : a.reject}
          </button>
        </div>
        {r.vendeur && <p className="text-xs text-stone-500 dark:text-stone-400">{a.acceptHint}</p>}
        </div>
      ) : r.status === 'APPROVED' && r.vendeur && r.commissionAjustee ? (
        <p className="text-xs text-stone-500 dark:text-stone-400">{a.commissionAdjusted}</p>
      ) : null}
    </div>
  )
}

export default function AdminRetoursList({ retours }: { retours: RetourAdmin[] }) {
  const { t } = useI18n()
  const a = t.returns.admin
  const [filtre, setFiltre] = useState<Filtre>('PENDING')
  const visibles = useMemo(() => retours.filter(r => !filtre || r.status === filtre), [retours, filtre])
  const compte = (s: Filtre) => (s ? retours.filter(r => r.status === s).length : retours.length)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(['PENDING', 'APPROVED', 'REJECTED', ''] as Filtre[]).map(f => (
          <button key={f || 'all'} onClick={() => setFiltre(f)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition ${
              filtre === f
                ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-400'
            }`}>
            {f ? a.status[f] : a.all} ({compte(f)})
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center">
          <PackageX className="w-10 h-10 mx-auto mb-3 text-stone-300 dark:text-stone-600" />
          <p className="text-stone-500 dark:text-stone-400">{a.none}</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibles.map(r => <RetourCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  )
}
