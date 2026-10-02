'use client'

import { useState, useEffect } from 'react'
import { useScrollLock } from '@/lib/hooks/useScrollLock'
import { CheckCircle2, Loader2, Tag, X, XCircle } from 'lucide-react'
import {
  heading, inputCls, btnPrimaryEmerald, btnSecondary,
  modalOverlay, modalBox, loadingPage, card,
} from '@/lib/dashboard-ui'
import { useI18n } from '@/components/I18nProvider'
import { tr } from '@/lib/i18n'

interface Category { id: string; nom: string; statut: string; createdAt: string }
interface ApprouveeCategory { id: string; nom: string; image: string | null }

// Libellés : t.cm.status
const STATUT_INFO: Record<string, { color: string; icon: React.ElementType }> = {
  EN_ATTENTE: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',   icon: Loader2 },
  APPROUVEE:  { color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300', icon: CheckCircle2 },
  REFUSEE:    { color: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',           icon: XCircle },
}

export default function VendeurCategoriesPage() {
  const { t, fmt } = useI18n()
  const c_ = t.cm
  const [mesCats,      setMesCats]      = useState<Category[]>([])
  const [approuvees,   setApprouvees]   = useState<ApprouveeCategory[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [nom,          setNom]          = useState('')
  const [description,  setDescription]  = useState('')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [success,      setSuccess]      = useState<string | null>(null)

  useScrollLock(showForm)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vendeur/categories')
      if (res.ok) {
        const d = await res.json()
        setMesCats(d.mesCats || [])
        setApprouvees(d.approuvees || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleSubmit = async () => {
    setSaving(true); setError(null); setSuccess(null)
    try {
      const res  = await fetch('/api/vendeur/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom, description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || c_.error)
      setSuccess(data.message)
      setNom(''); setDescription('')
      setShowForm(false)
      fetchData()
    } catch (e) {
      setError(e instanceof Error ? e.message : c_.error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className={loadingPage}>{t.common.loading}</div>

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={heading}>{c_.title}</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {c_.available(approuvees.length)}
            {mesCats.filter(c => c.statut === 'EN_ATTENTE').length > 0 && (
              <span className="ms-2 bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs">
                {c_.pendingCount(mesCats.filter(c => c.statut === 'EN_ATTENTE').length)}
              </span>
            )}
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setError(null); setSuccess(null) }}
          className={btnPrimaryEmerald}>
          {c_.propose}
        </button>
      </div>

      {/* Succès toast inline */}
      {success && (
        <div className="bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {/* Catégories disponibles */}
      <div className={`${card} p-5`}>
        <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-orange-500" />
          {c_.availableForProducts}
          <span className="ms-1 text-xs text-stone-400">({approuvees.length})</span>
        </h2>
        {approuvees.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-4">{c_.noApprovedAvailable}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {approuvees.map(c => (
              <span key={c.id}
                className="text-xs bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 px-3 py-1.5 rounded-full border border-orange-200 dark:border-orange-800 font-medium">
                {c.nom}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mes propositions */}
      <div className={`${card} overflow-hidden`}>
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
            {c_.myProposals}
          </h2>
          <span className="text-xs text-stone-400">{mesCats.length}</span>
        </div>

        {mesCats.length === 0 ? (
          <div className="py-12 text-center text-stone-400">
            <Tag className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{c_.noProposals}</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {mesCats.map(c => {
              const info = STATUT_INFO[c.statut] ?? { color: '', icon: Tag }
              const Icon = info.icon
              return (
                <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition">
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">{c.nom}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {c_.proposedOn(new Date(c.createdAt).toLocaleDateString(fmt.intl))}
                    </p>
                    {c.statut === 'REFUSEE' && (
                      <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                        {c_.refusedByAdmin}
                      </p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${info.color}`}>
                    <Icon className="w-3 h-3" /> {tr(c_.status, c.statut)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal proposition */}
      {showForm && (
        <div className={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className={`${modalBox} max-w-md`}>
            <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">{c_.proposeTitle}</h2>
              <button onClick={() => setShowForm(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>
              )}
              <div className="p-3 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl text-xs flex gap-2">
                <span className="shrink-0">ℹ️</span>
                {c_.proposeInfo}
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{c_.categoryName}</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className={inputCls}
                  placeholder={c_.categoryNamePlaceholder}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{c_.description}</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none"
                  placeholder={c_.descriptionOptional}
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-stone-200 dark:border-stone-800">
              <button onClick={() => setShowForm(false)} className={`flex-1 ${btnSecondary}`}>{t.common.cancel}</button>
              <button onClick={handleSubmit} disabled={saving || !nom.trim()} className={`flex-1 ${btnPrimaryEmerald}`}>
                {saving ? c_.sending : c_.proposeShort}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
