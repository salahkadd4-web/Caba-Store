'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle2, Clock, CreditCard, RefreshCw, XCircle } from 'lucide-react'

interface AbonnementRow {
  id: string
  vendeurId: string
  niveau: string
  statut: string
  dateFin: string
  periodicite: string | null
  joursRestants: number
  vendeur: {
    nomBoutique: string | null
    user: { nom: string; prenom: string; email: string | null }
  }
}

const NIVEAU_LABELS: Record<string, { label: string; color: string }> = {
  NIVEAU_1: { label: 'Niveau 1', color: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  NIVEAU_2: { label: 'Niveau 2', color: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  NIVEAU_3: { label: 'Niveau 3', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' },
}

const STATUT_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  GRATUIT:  { label: 'Gratuit',  color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',     icon: CheckCircle2 },
  ACTIF:    { label: 'Actif',    color: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',         icon: CheckCircle2 },
  EXPIRE:   { label: 'Expiré',   color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',             icon: XCircle },
  SUSPENDU: { label: 'Suspendu', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300', icon: AlertTriangle },
}

export default function AdminAbonnementsPage() {
  const [rows, setRows]           = useState<AbonnementRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterStatut, setFilter] = useState('')

  // ✅ Après — un seul useEffect, pas de useCallback
const [refreshKey, setRefreshKey] = useState(0) // pour le bouton Actualiser

useEffect(() => {
  let cancelled = false // évite les race conditions si le filtre change vite

  const load = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/abonnements${filterStatut ? `?statut=${filterStatut}` : ''}`)
      const data = await res.json()
      if (!cancelled) setRows(data)
    } finally {
      if (!cancelled) setLoading(false)
    }
  }

  load()
  return () => { cancelled = true }
}, [filterStatut, refreshKey])

  const expirentBientot = rows.filter(r => r.joursRestants <= 7 && r.statut !== 'EXPIRE')
  const expires         = rows.filter(r => r.statut === 'EXPIRE')
  const actifs          = rows.filter(r => r.statut === 'ACTIF')
  const gratuits        = rows.filter(r => r.statut === 'GRATUIT')

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Abonnements</h1>
        <button onClick={() => setRefreshKey(k => k + 1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition">
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: 'Actifs',        value: actifs.length,          color: 'text-teal-600',   icon: CheckCircle2 },
          { label: 'Gratuits',      value: gratuits.length,        color: 'text-green-600',  icon: Clock },
          { label: 'Expirés',       value: expires.length,         color: 'text-red-600',    icon: XCircle },
          { label: 'Expirent ≤ 7j', value: expirentBientot.length, color: 'text-orange-600', icon: AlertTriangle },
        ].map(k => (
          <div key={k.label} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 flex items-center gap-3">
            <k.icon className={`${k.color} shrink-0`} size={22} />
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Alerte expirations proches */}
      {expirentBientot.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
          <p className="font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-2 mb-2">
            <AlertTriangle size={16} /> {expirentBientot.length} abonnement(s) expirent dans moins de 7 jours
          </p>
          <ul className="text-sm text-orange-600 dark:text-orange-400 space-y-1">
            {expirentBientot.map(r => (
              <li key={r.id}>
                • <strong>{r.vendeur.nomBoutique ?? `${r.vendeur.user.prenom} ${r.vendeur.user.nom}`}</strong>
                {' '}— expire dans <strong>{r.joursRestants}j</strong> ({new Date(r.dateFin).toLocaleDateString('fr-DZ')})
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {['', 'GRATUIT', 'ACTIF', 'EXPIRE', 'SUSPENDU'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition
              ${filterStatut === s
                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400'
              }`}
          >
            {s === '' ? 'Tous' : STATUT_LABELS[s]?.label ?? s}
          </button>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-400">Chargement…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-gray-400">Aucun abonnement trouvé</div>
        ) : (
          /* ── Scrollbar horizontal sur mobile (identique à admin/clients) ── */
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-160">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">Boutique / Vendeur</th>
                  <th className="text-left px-4 py-3">Statut</th>
                  <th className="text-left px-4 py-3">Niveau</th>
                  <th className="text-left px-4 py-3">Expiration</th>
                  <th className="text-left px-4 py-3">Jours restants</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map(r => {
                  const statut = STATUT_LABELS[r.statut]
                  const Icon   = statut?.icon ?? CheckCircle2
                  const urgent = r.joursRestants <= 7 && r.statut !== 'EXPIRE'
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{r.vendeur.nomBoutique ?? '—'}</p>
                        <p className="text-gray-400 text-xs">{r.vendeur.user.prenom} {r.vendeur.user.nom}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statut?.color}`}>
                          <Icon size={11} /> {statut?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {NIVEAU_LABELS[r.niveau] ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${NIVEAU_LABELS[r.niveau].color}`}>
                            {NIVEAU_LABELS[r.niveau].label}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {new Date(r.dateFin).toLocaleDateString('fr-DZ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${urgent ? 'text-orange-500' : r.statut === 'EXPIRE' ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                          {r.statut === 'EXPIRE' ? 'Expiré' : `${r.joursRestants}j`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/vendeurs?id=${r.vendeurId}`}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline whitespace-nowrap"
                        >
                          <CreditCard size={13} /> Gérer
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