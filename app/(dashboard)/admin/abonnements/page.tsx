'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Clock, CreditCard, RefreshCw, XCircle } from 'lucide-react'
import {
  heading, kpiCard, tableWrapper, tableHead, tableTh, tableTd, tableRow, loadingPage,
} from '@/lib/dashboard-ui'

interface AbonnementRow {
  id: string; vendeurId: string; niveau: string; statut: string
  dateFin: string; periodicite: string | null; joursRestants: number
  vendeur: { nomBoutique: string | null; user: { nom: string; prenom: string; email: string | null } }
}

const NIVEAU_LABELS: Record<string, { label: string; color: string }> = {
  NIVEAU_1: { label: 'Niveau 1', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  NIVEAU_2: { label: 'Niveau 2', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'         },
  NIVEAU_3: { label: 'Niveau 3', color: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'     },
}
const STATUT_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  GRATUIT:  { label: 'Gratuit',  color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',     icon: CheckCircle2 },
  ACTIF:    { label: 'Actif',    color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',         icon: CheckCircle2 },
  EXPIRE:   { label: 'Expiré',   color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',             icon: XCircle      },
  SUSPENDU: { label: 'Suspendu', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', icon: AlertTriangle },
}

export default function AdminAbonnementsPage() {
  const [rows,        setRows]    = useState<AbonnementRow[]>([])
  const [loading,     setLoading] = useState(true)
  const [filterStatut,setFilter]  = useState('')
  const [refreshKey,  setRefresh] = useState(0)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/admin/abonnements${filterStatut ? `?statut=${filterStatut}` : ''}`)
        const data = await res.json()
        if (!cancelled) setRows(data)
      } finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [filterStatut, refreshKey])

  const expirentBientot = rows.filter(r => r.joursRestants <= 7 && r.statut !== 'EXPIRE')
  const expires         = rows.filter(r => r.statut === 'EXPIRE')
  const actifs          = rows.filter(r => r.statut === 'ACTIF')
  const gratuits        = rows.filter(r => r.statut === 'GRATUIT')

  const kpis = [
    { label: 'Actifs',         value: actifs.length,          color: 'text-teal-600 dark:text-teal-400',   bg: 'bg-teal-50 dark:bg-teal-950/40',     Icon: CheckCircle2  },
    { label: 'Gratuits',       value: gratuits.length,        color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40',   Icon: Clock         },
    { label: 'Expirés',        value: expires.length,         color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-50 dark:bg-red-950/40',       Icon: XCircle       },
    { label: 'Expirent ≤ 7j',  value: expirentBientot.length, color: 'text-orange-600 dark:text-orange-400',bg: 'bg-orange-50 dark:bg-orange-950/40', Icon: AlertTriangle },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className={heading}>Abonnements</h1>
        <button onClick={() => setRefresh(k => k + 1)}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800">
          <RefreshCw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className={kpiCard}>
            <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-1`}>
              <k.Icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Alerte expirations proches */}
      {expirentBientot.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
          <p className="font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2 mb-2 text-sm">
            <AlertTriangle className="w-4 h-4" /> {expirentBientot.length} abonnement{expirentBientot.length > 1 ? 's' : ''} expirent dans moins de 7 jours
          </p>
          <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
            {expirentBientot.map(r => (
              <li key={r.id} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-orange-400" />
                <strong>{r.vendeur.nomBoutique ?? `${r.vendeur.user.prenom} ${r.vendeur.user.nom}`}</strong>
                {' '}— expire dans <strong>{r.joursRestants}j</strong>
                <span className="text-orange-400">({new Date(r.dateFin).toLocaleDateString('fr-DZ')})</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {['', 'GRATUIT', 'ACTIF', 'EXPIRE', 'SUSPENDU'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium border transition ${
              filterStatut === s
                ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-400'
            }`}>
            {s === '' ? 'Tous' : STATUT_LABELS[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className={tableWrapper}>
        {loading ? (
          <div className={loadingPage}>Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-stone-400">Aucun abonnement trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-160">
              <thead className={tableHead}>
                <tr>
                  <th className={tableTh}>Boutique / Vendeur</th>
                  <th className={tableTh}>Statut</th>
                  <th className={tableTh}>Niveau</th>
                  <th className={tableTh}>Expiration</th>
                  <th className={tableTh}>Jours restants</th>
                  <th className={tableTh}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const statut = STATUT_LABELS[r.statut]
                  const Icon   = statut?.icon ?? CheckCircle2
                  const urgent = r.joursRestants <= 7 && r.statut !== 'EXPIRE'
                  return (
                    <tr key={r.id} className={tableRow}>
                      <td className={tableTd}>
                        <p className="font-medium text-stone-800 dark:text-stone-100">{r.vendeur.nomBoutique ?? '—'}</p>
                        <p className="text-xs text-stone-400">{r.vendeur.user.prenom} {r.vendeur.user.nom}</p>
                      </td>
                      <td className={tableTd}>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statut?.color}`}>
                          <Icon className="w-3 h-3" /> {statut?.label}
                        </span>
                      </td>
                      <td className={tableTd}>
                        {NIVEAU_LABELS[r.niveau]
                          ? <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${NIVEAU_LABELS[r.niveau].color}`}>{NIVEAU_LABELS[r.niveau].label}</span>
                          : '—'}
                      </td>
                      <td className={`${tableTd} text-stone-600 dark:text-stone-300 whitespace-nowrap`}>
                        {new Date(r.dateFin).toLocaleDateString('fr-DZ')}
                      </td>
                      <td className={tableTd}>
                        <span className={`font-semibold ${urgent ? 'text-orange-500' : r.statut === 'EXPIRE' ? 'text-red-500' : 'text-stone-700 dark:text-stone-200'}`}>
                          {r.statut === 'EXPIRE' ? 'Expiré' : `${r.joursRestants}j`}
                        </span>
                      </td>
                      <td className={`${tableTd} text-right`}>
                        <Link href={`/admin/vendeurs?id=${r.vendeurId}`}
                          className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline whitespace-nowrap">
                          <CreditCard className="w-3 h-3" /> Gérer
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
