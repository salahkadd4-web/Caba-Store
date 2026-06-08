'use client'

import { useState, useCallback } from 'react'
import { useScrollLock } from '@/lib/hooks/useScrollLock'
import Image from 'next/image'
import ImageUpload from '@/components/admin/ImageUpload'
import { CheckCircle2, Pencil, Store, Tag, Trash2, XCircle } from 'lucide-react'
import {
  cardSm, heading, inputCls, btnPrimaryPurple, btnSecondary, btnDangerSolid,
  modalOverlay, modalBox, toastCls,
} from '@/lib/dashboard-ui'

export type Category = {
  id: string; nom: string; description: string | null; image: string | null
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE'; vendeurId: string | null
  vendeur?: { id: string; nomBoutique: string | null; user: { nom: string; prenom: string } } | null
  _count?: { products: number }
}

const emptyForm = { nom: '', description: '', image: '' }
const inputBase = `${inputCls} mb-0`
const textarea  = `w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none`

export default function CategoriesClient({ initialData }: { initialData: Category[] }) {
  const [categories,  setCategories]  = useState<Category[]>(initialData.filter(c => c.statut === 'APPROUVEE'))
  const [enAttente,   setEnAttente]   = useState<Category[]>(initialData.filter(c => c.statut === 'EN_ATTENTE'))
  const [showModal,   setShowModal]   = useState(false)
  const [editCat,     setEditCat]     = useState<Category | null>(null)
  const [form,        setForm]        = useState(emptyForm)
  const [error,       setError]       = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [deleteId,    setDeleteId]    = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [toast,       setToast]       = useState<string | null>(null)

  useScrollLock(showModal || deleteId !== null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const refresh = useCallback(async () => {
    const res  = await fetch('/api/admin/categories?count=true')
    const data = await res.json() as Category[]
    setEnAttente(data.filter(c => c.statut === 'EN_ATTENTE'))
    setCategories(data.filter(c => c.statut === 'APPROUVEE'))
  }, [])

  const handleCatAction = async (id: string, action: 'approuver' | 'refuser') => {
    setApprovingId(id)
    try {
      const res  = await fetch(`/api/admin/categories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const data = await res.json()
      showToast(res.ok ? (action === 'approuver' ? '✅ Catégorie approuvée' : '❌ Catégorie refusée') : (data.error || 'Erreur'))
      if (res.ok) refresh()
    } finally { setApprovingId(null) }
  }

  const openCreate = () => { setEditCat(null); setForm(emptyForm); setError(''); setShowModal(true) }
  const openEdit   = (cat: Category) => { setEditCat(cat); setForm({ nom: cat.nom, description: cat.description || '', image: cat.image || '' }); setError(''); setShowModal(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    try {
      const res  = await fetch(editCat ? `/api/admin/categories/${editCat.id}` : '/api/admin/categories', { method: editCat ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowModal(false); refresh()
    } catch { setError('Erreur serveur') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async (id: string) => {
    setDeleteError('')
    const res  = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setDeleteError(data.error); return }
    setDeleteId(null); refresh()
  }

  return (
    <div className="space-y-6">
      {toast && <div className={toastCls}>{toast}</div>}

      <div className="flex items-center justify-between">
        <div>
          <h1 className={heading}>Catégories</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {categories.length} approuvée{categories.length > 1 ? 's' : ''}
            {enAttente.length > 0 && <span className="ml-2 bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full text-xs">{enAttente.length} en attente</span>}
          </p>
        </div>
        <button onClick={openCreate} className={btnPrimaryPurple}>+ Ajouter</button>
      </div>

      {enAttente.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <h2 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              Proposées par les vendeurs — En attente
            </h2>
          </div>
          <div className="space-y-2.5">
            {enAttente.map((cat) => (
              <div key={cat.id} className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex items-center gap-4">
                <div className="relative w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {cat.image ? <Image src={cat.image} alt={cat.nom} fill sizes="48px" className="object-cover" /> : <Tag className="w-5 h-5 text-orange-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 dark:text-stone-100">{cat.nom}</p>
                  {cat.description && <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{cat.description}</p>}
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5 font-medium">
                    <Store className="w-3 h-3 inline mr-1" />
                    {cat.vendeur?.nomBoutique ?? `${cat.vendeur?.user.prenom} ${cat.vendeur?.user.nom}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleCatAction(cat.id, 'approuver')} disabled={approvingId === cat.id}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95">
                    {approvingId === cat.id ? '…' : <><CheckCircle2 className="w-4 h-4" /> Approuver</>}
                  </button>
                  <button onClick={() => handleCatAction(cat.id, 'refuser')} disabled={approvingId === cat.id}
                    className="bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 disabled:opacity-50 text-red-600 dark:text-red-400 text-xs font-semibold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 active:scale-95">
                    {approvingId === cat.id ? '…' : <><XCircle className="w-4 h-4" /> Refuser</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-stone-200 dark:border-stone-800" />
        </div>
      )}

      {categories.length === 0 ? (
        <div className="text-center py-20 text-stone-400 dark:text-stone-500">
          <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Aucune catégorie approuvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className={`${cardSm} p-4 flex gap-4 items-center hover:border-stone-300 dark:hover:border-stone-600 transition`}>
              <div className="relative w-14 h-14 bg-orange-50 dark:bg-orange-950/40 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-orange-100 dark:border-orange-900">
                {cat.image ? <Image src={cat.image} alt={cat.nom} fill sizes="56px" className="object-cover" /> : <Tag className="w-6 h-6 text-orange-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-stone-800 dark:text-stone-100">{cat.nom}</h3>
                {cat.description && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">{cat.description}</p>}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">{cat._count?.products ?? 0} produit{(cat._count?.products ?? 0) > 1 ? 's' : ''}</span>
                  {cat.vendeurId
                    ? <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">Vendeur</span>
                    : <span className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded-full">Admin</span>
                  }
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => openEdit(cat)} className="bg-stone-100 dark:bg-stone-800 hover:bg-orange-50 dark:hover:bg-orange-950/40 text-stone-600 dark:text-stone-300 hover:text-orange-700 dark:hover:text-orange-400 p-2 rounded-lg transition">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setDeleteId(cat.id); setDeleteError('') }} className="bg-stone-100 dark:bg-stone-800 hover:bg-red-50 dark:hover:bg-red-950 text-stone-500 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className={modalOverlay}>
          <div className={`${modalBox} max-w-md p-6`}>
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-5">
              {editCat ? '✏️ Modifier la catégorie' : '+ Ajouter une catégorie'}
            </h2>
            {error && <div className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">Nom *</label>
                <input type="text" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required placeholder="Nom de la catégorie" className={inputBase} />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Description…" className={textarea} />
              </div>
              <ImageUpload value={form.image} onChange={(url) => setForm({ ...form, image: url })} label="Image de la catégorie" />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className={`flex-1 ${btnSecondary}`}>Annuler</button>
                <button type="submit" disabled={submitting} className={`flex-1 ${btnPrimaryPurple}`}>
                  {submitting ? 'En cours…' : editCat ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteId && (
        <div className={modalOverlay}>
          <div className={`${modalBox} max-w-sm p-6 text-center`}>
            <div className="w-14 h-14 bg-red-50 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-stone-800 dark:text-stone-100 mb-2">Supprimer cette catégorie ?</h2>
            <p className="text-stone-500 dark:text-stone-400 text-sm mb-4">Cette action est irréversible.</p>
            {deleteError && <div className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-xl mb-4">{deleteError}</div>}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteId(null); setDeleteError('') }} className={`flex-1 ${btnSecondary}`}>Annuler</button>
              <button onClick={() => handleDelete(deleteId)} className={`flex-1 ${btnDangerSolid}`}>Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
