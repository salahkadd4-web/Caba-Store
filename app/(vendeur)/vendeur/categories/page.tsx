'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, X, XCircle } from 'lucide-react'

interface Category {
  id: string; nom: string; statut: string; createdAt: string
}
interface ApprouveeCategory {
  id: string; nom: string; image: string | null
}

export default function VendeurCategoriesPage() {
  const [mesCats, setMesCats]           = useState<Category[]>([])
  const [approuvees, setApprouvees]     = useState<ApprouveeCategory[]>([])
  const [loading, setLoading]           = useState(true)
  const [showForm, setShowForm]         = useState(false)
  const [nom, setNom]                   = useState('')
  const [description, setDescription]   = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [success, setSuccess]           = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    const res = await fetch('/api/vendeur/categories')
    if (res.ok) {
      const d = await res.json()
      setMesCats(d.mesCats || [])
      setApprouvees(d.approuvees || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      const res = await fetch('/api/vendeur/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setSuccess(data.message)
      setNom(''); setDescription('')
      setShowForm(false)
      fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  const statutInfo: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    EN_ATTENTE: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300', icon: Loader2 },
    APPROUVEE:  { label: 'Approuvée',  color: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',   icon: CheckCircle2 },
    REFUSEE:    { label: 'Refusée',    color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',           icon: XCircle },
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Catégories</h1>
        <button
          onClick={() => { setShowForm(true); setError(null); setSuccess(null) }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-xl font-medium transition-all"
        >
          + Proposer une catégorie
        </button>
      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 rounded-xl text-sm">
          {success}
        </div>
      )}

      {/* Catégories disponibles pour mes produits */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Catégories disponibles pour vos produits ({approuvees.length})
        </h2>
        {approuvees.length === 0 ? (
          <p className="text-xs text-gray-400">Aucune catégorie approuvée disponible.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {approuvees.map((c) => (
              <span key={c.id} className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                {c.nom}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mes propositions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            Mes propositions de catégories ({mesCats.length})
          </h2>
        </div>

        {loading ? (
          <p className="p-4 text-xs text-gray-400 text-center">Chargement...</p>
        ) : mesCats.length === 0 ? (
          <p className="p-8 text-xs text-gray-400 text-center">
            Vous n&apos;avez pas encore proposé de catégorie.
          </p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800">
            {mesCats.map((c) => {
              const info = statutInfo[c.statut] || { label: c.statut, color: '', icon: null as unknown as React.ElementType }
              return (
                <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{c.nom}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Proposée le {new Date(c.createdAt).toLocaleDateString('fr-DZ')}
                    </p>
                    {c.statut === 'REFUSEE' && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        Cette catégorie a été refusée par l&apos;admin.
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${info.color}`}>
                    {(() => { const Icon = info.icon; return Icon ? <Icon className="w-3 h-3 inline mr-1" /> : null })()} {info.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal proposition */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">Proposer une catégorie</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>
              )}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl text-xs">
                ℹ️ La catégorie sera ajoutée seulement après approbation par l&apos;administrateur.
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nom de la catégorie *</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Ex: Chaussures de sport"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                  placeholder="Description optionnelle..."
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !nom.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl font-medium transition-all"
              >
                {saving ? 'Envoi...' : 'Proposer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}