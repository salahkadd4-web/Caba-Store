'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertTriangle, CreditCard, Lock, Percent, Receipt, RefreshCw, Wallet } from 'lucide-react'
import {
  heading, kpiCard, tableWrapper, tableHead, tableTh, tableTd, tableRow, loadingPage,
} from '@/lib/dashboard-ui'
import { useI18n } from '@/components/I18nProvider'
import type { LigneAbonnementAdmin } from '@/lib/seller-billing'
import { ABO_STATUT_CLS, libelleOffre } from '@/components/billing/labels'

type Filtre = '' | 'impayes' | 'BLOQUE' | 'COMMISSION' | 'FORFAIT'

export default function AbonnementsClient({ initialData }: { initialData: LigneAbonnementAdmin[] }) {
  const { t, fmt } = useI18n()
  const s_ = t.admin.subs
  const [rows, setRows] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [filtre, setFiltre] = useState<Filtre>('')

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/abonnements')
      if (res.ok) setRows(await res.json())
    } finally { setLoading(false) }
  }

  const visibles = useMemo(() => rows.filter(r =>
    filtre === '' ? true
      : filtre === 'impayes' ? r.aPayer > 0
      : filtre === 'BLOQUE' ? r.statut === 'BLOQUE'
      : r.mode === filtre,
  ), [rows, filtre])

  const aEncaisser = rows.reduce((s, r) => s + r.aPayer, 0)
  const bientot = rows.filter(r => r.statut !== 'BLOQUE' && r.joursRestants !== null && r.joursRestants <= 3)

  const kpis = [
    { label: s_.commission, value: String(rows.filter(r => r.mode === 'COMMISSION').length), Icon: Percent, tone: 'text-stone-800 dark:text-stone-100' },
    { label: s_.forfait, value: String(rows.filter(r => r.mode === 'FORFAIT').length), Icon: CreditCard, tone: 'text-stone-800 dark:text-stone-100' },
    { label: s_.toCollect, value: fmt.price(aEncaisser), Icon: Wallet, tone: 'text-stone-800 dark:text-stone-100' },
    { label: s_.blocked, value: String(rows.filter(r => r.statut === 'BLOQUE').length), Icon: Lock, tone: 'text-red-600 dark:text-red-400' },
  ]

  const filtres: { key: Filtre; label: string }[] = [
    { key: '', label: s_.all },
    { key: 'impayes', label: s_.unpaid },
    { key: 'BLOQUE', label: s_.blocked },
    { key: 'COMMISSION', label: t.billing.modes.COMMISSION },
    { key: 'FORFAIT', label: t.billing.modes.FORFAIT },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className={heading}>{s_.title}</h1>
        <button onClick={refresh}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800">
          <RefreshCw className="w-3.5 h-3.5" /> {s_.refresh}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={kpiCard}>
            <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-1">
              <k.Icon className="w-4 h-4 text-stone-600 dark:text-stone-300" />
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">{k.label}</p>
            <p className={`text-2xl font-semibold tabular-nums ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {bientot.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
          <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-2 text-sm">
            <AlertTriangle className="w-4 h-4" /> {s_.dueSoonAlert(bientot.length)}
          </p>
          <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
            {bientot.map(r => (
              <li key={r.id}>
                <strong>{r.nomBoutique ?? r.nom}</strong> — {fmt.price(r.aPayer)} · {s_.daysLeft(r.joursRestants ?? 0)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {filtres.map(f => (
          <button key={f.key} onClick={() => setFiltre(f.key)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition ${
              filtre === f.key
                ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-400'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className={tableWrapper}>
        {loading ? (
          <div className={loadingPage}>{t.common.loading}</div>
        ) : visibles.length === 0 ? (
          <div className="p-10 text-center text-stone-400">{s_.none}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-160">
              <thead className={tableHead}>
                <tr>
                  <th className={tableTh}>{s_.colShop}</th>
                  <th className={tableTh}>{s_.colOffer}</th>
                  <th className={tableTh}>{s_.colStatus}</th>
                  <th className={tableTh}>{s_.colToPay}</th>
                  <th className={tableTh}>{s_.colDue}</th>
                  <th className={tableTh}></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map(r => (
                  <tr key={r.id} className={tableRow}>
                    <td className={tableTd}>
                      <p className="font-medium text-stone-800 dark:text-stone-100">{r.nomBoutique ?? '—'}</p>
                      <p className="text-xs text-stone-400">{r.nom}</p>
                    </td>
                    <td className={`${tableTd} text-stone-700 dark:text-stone-200`}>
                      {libelleOffre(t, r)}
                      {r.mode === 'FORFAIT' && r.forfaitFin && (
                        <p className="text-xs text-stone-400">{s_.until(fmt.date(r.forfaitFin))}</p>
                      )}
                    </td>
                    <td className={tableTd}>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ABO_STATUT_CLS[r.statut] ?? ''}`}>
                        {t.billing.status[r.statut] ?? r.statut}
                      </span>
                    </td>
                    <td className={`${tableTd} font-semibold tabular-nums text-stone-800 dark:text-stone-100`}>
                      {r.aPayer > 0 ? fmt.price(r.aPayer) : '—'}
                      {r.forfaitAVenir && <p className="text-xs font-normal text-stone-400">{s_.forfaitUpcoming}</p>}
                    </td>
                    <td className={`${tableTd} whitespace-nowrap`}>
                      {r.echeance ? (
                        <>
                          <p className="text-stone-700 dark:text-stone-200">{fmt.date(r.echeance)}</p>
                          <p className={`text-xs ${r.joursRestants === 0 ? 'text-red-600 dark:text-red-400 font-medium' : (r.joursRestants ?? 99) <= 3 ? 'text-amber-700 dark:text-amber-400' : 'text-stone-400'}`}>
                            {r.joursRestants === 0 ? t.billing.overdue : s_.daysLeft(r.joursRestants ?? 0)}
                          </p>
                        </>
                      ) : '—'}
                    </td>
                    <td className={`${tableTd} text-end`}>
                      <Link href={`/admin/vendeurs?id=${r.vendeurId}&tab=abonnement`}
                        className="inline-flex items-center gap-1 text-xs text-orange-700 dark:text-orange-400 hover:underline whitespace-nowrap">
                        <Receipt className="w-3 h-3" /> {s_.manage}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
