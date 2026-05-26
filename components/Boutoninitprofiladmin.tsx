'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Info, Shield, Trash2 } from 'lucide-react'

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
      showToast(`Impossible : ${info.nbProduits} produit(s) lié(s). Supprimez-les d'abord.`, 'err')
      return
    }
    if (!confirm('Supprimer le profil vendeur admin « CabaStore Officiel » ?')) return
    setLoading(true)
    try {
      const res  = await fetch('/api/admin/init-profil-vendeur', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      showToast(data.message, 'ok')
      setInfo({ existe: false })
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erreur', 'err')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-purple-200 dark:border-purple-800 rounded-xl p-4 bg-purple-50 dark:bg-purple-950/30 space-y-3 max-w-lg">
      <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-2">
        <Shield className="w-4 h-4" /> Priorité 0 — Produits Admin
      </h3>

      {/* Bouton vérification manuelle */}
      <button
        onClick={verifier}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-400 text-purple-700 dark:text-purple-300 text-sm hover:bg-purple-100 dark:hover:bg-purple-900 disabled:opacity-50 transition w-fit"
      >
        <CheckCircle2 className="w-4 h-4" />
        {loading ? 'Vérification...' : 'Actualiser'}
      </button>

      {/* Explication */}
      <div className="flex items-start gap-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 rounded-lg p-3">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Les produits ajoutés par l&apos;admin ont <strong>automatiquement la priorité 0</strong> (premier dans
          l&apos;affichage), car ils n&apos;ont pas de profil vendeur associé. Aucune action n&apos;est nécessaire.
        </p>
      </div>

      {/* État du profil existant */}
      {!loading && info && (
        info.existe ? (
          <div className="text-xs rounded-lg bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-800 p-3 space-y-2">
            <p className="text-orange-600 dark:text-orange-400 font-medium">
              ⚠️ Un profil vendeur admin existe encore en base de données.
            </p>
            <p className="text-gray-500 dark:text-gray-400">
              Boutique : <span className="font-medium text-gray-700 dark:text-gray-200">{info.nomBoutique}</span>
              {' · '}{info.nbProduits} produit(s) lié(s)
            </p>
            <p className="text-gray-400 dark:text-gray-500">
              Ce profil apparaît inutilement dans la liste des vendeurs. Supprimez-le —
              vos produits admin restent affichés en priorité 0 sans lui.
            </p>
            <button
              onClick={supprimer}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50 transition"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer le profil vendeur admin
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Aucun profil vendeur admin. Tout est correct.
          </div>
        )
      )}

      {loading && (
        <p className="text-xs text-gray-400 animate-pulse">Vérification...</p>
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