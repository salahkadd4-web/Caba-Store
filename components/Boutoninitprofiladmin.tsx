'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Info, Shield, Trash2 } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'

interface ProfilInfo {
  existe: boolean
  vendeurId?: string
  nomBoutique?: string
  nbProduits?: number
}

/**
 * Carte d'info dans /admin/stats.
 * Les produits admin (vendeurId: null) ont automatiquement la priorité 0
 * sans avoir besoin d'un profil vendeur. Ce composant explique cela et
 * propose de supprimer l'éventuel profil "CabaStore Officiel" créé par erreur.
 */
export default function BoutonInitProfilAdmin() {
  const { t } = useI18n()
  const a = t.admin.stats.adminProfile
  const [info,    setInfo]    = useState<ProfilInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function verifier() {
    setLoading(true)
    fetch('/api/admin/init-profil-vendeur')
      .then(r => r.json())
      .then(d => setInfo(d))
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }

  // Vérifie automatiquement au montage
  useEffect(() => { verifier() }, [])

  async function supprimer() {
    if (!info?.vendeurId) return
    if (info.nbProduits && info.nbProduits > 0) {
      showToast(a.cannotDelete(info.nbProduits), 'err')
      return
    }
    if (!confirm(a.confirmDelete)) return
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/init-profil-vendeur', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(data.message, 'ok')
      setInfo({ existe: false })
    } catch (e) {
      showToast(e instanceof Error ? e.message : a.error, 'err')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-stone-200 dark:border-stone-800 rounded-2xl p-4 bg-white dark:bg-stone-900 space-y-3 max-w-lg">
      <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 flex items-center gap-2">
        <Shield className="w-4 h-4" /> {a.title}
      </h3>

      {/* Bouton vérification manuelle */}
      <button
        onClick={verifier}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-200 text-sm hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50 transition w-fit"
      >
        <CheckCircle2 className="w-4 h-4" />
        {loading ? a.checking : a.refresh}
      </button>

      {/* Explication */}
      <div className="flex items-start gap-2 text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-stone-800 rounded-xl p-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          {a.explainBefore} <strong>{a.explainStrong}</strong>{a.explainAfter}
        </p>
      </div>

      {/* État du profil existant */}
      {!loading && info && (
        info.existe ? (
          <div className="text-xs rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 p-3 space-y-2">
            <p className="text-amber-800 dark:text-amber-300 font-medium">
              {a.stillExists}
            </p>
            <p className="text-stone-500 dark:text-stone-400">
              {a.shop} <span className="font-medium text-stone-700 dark:text-stone-200">{info.nomBoutique}</span>
              {' · '}{a.linkedProducts(info.nbProduits ?? 0)}
            </p>
            <p className="text-stone-400 dark:text-stone-500">
              {a.uselessNote}
            </p>
            <button
              onClick={supprimer}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              {a.deleteProfile}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {a.allGood}
          </div>
        )
      )}

      {loading && (
        <p className="text-xs text-stone-400 animate-pulse">{a.checking}</p>
      )}

      {/* Toast */}
      {toast && (
        <p className={`text-sm font-medium ${toast.type === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
          {toast.type === 'ok' ? '✅' : '❌'} {toast.msg}
        </p>
      )}
    </div>
  )
}