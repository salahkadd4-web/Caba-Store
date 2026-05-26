'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import ImageUpload from '@/components/admin/ImageUpload'
import { CheckCircle2, Pencil, Store, Tag, Trash2, XCircle } from 'lucide-react'

type Category = {
  id: string
  nom: string
  description: string | null
  image: string | null
  statut: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE'
  vendeurId: string | null
  vendeur?: {
    id: string
    nomBoutique: string | null
    user: { nom: string; prenom: string }
  } | null
  _count?: { products: number }
}

const emptyForm = { nom: '', description: '', image: '' }

export default function AdminCategoriesPage() {
  const [categories,     setCategories]     = useState<Category[]>([])
  const [enAttente,      setEnAttente]      = useState<Category[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showModal,      setShowModal]      = useState(false)
  const [editCategory,   setEditCategory]   = useState<Category | null>(null)
  const [form,           setForm]           = useState(emptyForm)
  const [error,          setError]          = useState('')
  const [submitting,     setSubmitting]     = useState(false)
  const [deleteId,       setDeleteId]       = useState<string | null>(null)
  const [deleteError,    setDeleteError]    = useState('')
  const [approvingId,    setApprovingId]    = useState<string | null>(null)
  const [toast,          setToast]          = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchCategories = useCallback(async () => {
    const res  = await fetch('/api/admin/categories?count=true')
    const data = await res.json()

    // Séparer les catégories en attente (proposées par vendeurs) des catégories actives
    const pending  = (data as Category[]).filter(c => c.statut === 'EN_ATTENTE')
    const approved = (data as Category[]).filter(c => c.statut === 'APPROUVEE')

    setEnAttente(pending)
    setCategories(approved)
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // ── Action admin sur catégorie vendeur ──────────────────
  const handleCatAction = async (id: string, action: 'approuver' | 'refuser') => {
    setApprovingId(id)
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const data = await res.json()
      if (res.ok) {
        showToast(action === 'approuver' ? '✅ Catégorie approuvée' : '❌ Catégorie refusée')
        fetchCategories()
      } else {
        showToast(data.error || 'Erreur')
      }
    } finally {
      setApprovingId(null)
    }
  }

  // ── Formulaire créer/modifier (catégories admin) ─────────
  const openCreate = () => {
    setEditCategory(null)
    setForm(emptyForm)
    setError('')
    setShowModal(true)
  }

  const openEdit = (cat: Category) => {
    setEditCategory(cat)
    setForm({ nom: cat.nom, description: cat.description || '', image: cat.image || '' })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch(
        editCategory ? `/api/admin/categories/${editCategory.id}` : '/api/admin/categories',
        {
          method:  editCategory ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(form),
        }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowModal(false)
      fetchCategories()
    } catch {
      setError('Erreur serveur')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleteError('')
    const res  = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setDeleteError(data.error); return }
    setDeleteId(null)
    fetchCategories()
  }

  if (loading) return <div className="text-center text-gray-500 py-12">Chargement...</div>

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-100 bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Catégories ({categories.length})
          {enAttente.length > 0 && (
            <span className="ml-2 text-sm bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full">
              {enAttente.length} en attente
            </span>
          )}
        </h1>
        <button
          onClick={openCreate}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition"
        >
          + Ajouter une catégorie
        </button>
      </div>

      {/* ── Section catégories vendeur EN ATTENTE ──────────── */}
      {enAttente.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
            <h2 className="text-sm font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">
              Catégories proposées par les vendeurs — En attente de validation
            </h2>
          </div>

          <div className="space-y-3">
            {enAttente.map((cat) => (
              <div
                key={cat.id}
                className="bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl p-4 flex items-center gap-4"
              >
                {/* Image / icône */}
                <div className="relative w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                  {cat.image
                    ? <Image src={cat.image} alt={cat.nom} fill sizes="48px" className="object-cover" />
                    : <span className="text-xl"><Tag className="w-4 h-4" /></span>
                  }
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">{cat.nom}</p>
                  {cat.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{cat.description}</p>
                  )}
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                    Proposée par :{' '}
                    <span className="font-semibold">
                      {cat.vendeur?.nomBoutique
                        ? <><Store className="w-4 h-4 inline mr-1" />{' '}{`${cat.vendeur.nomBoutique}`}</>
                        : `${cat.vendeur?.user.prenom} ${cat.vendeur?.user.nom}`
                      }
                    </span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCatAction(cat.id, 'approuver')}
                    disabled={approvingId === cat.id}
                    className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                  >
                    {approvingId === cat.id ? '...' : <><CheckCircle2 className="w-5 h-5" />{' '}Approuver</>}
                  </button>
                  <button
                    onClick={() => handleCatAction(cat.id, 'refuser')}
                    disabled={approvingId === cat.id}
                    className="bg-red-100 dark:bg-red-950 hover:bg-red-200 dark:hover:bg-red-900 disabled:opacity-50 text-red-600 dark:text-red-400 text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5"
                  >
                    {approvingId === cat.id ? '...' : <><XCircle className="w-5 h-5" />{' '}Refuser</>}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-200 dark:border-gray-800" />
        </div>
      )}

      {/* ── Grille catégories approuvées ───────────────────── */}
      {categories.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <Tag className="w-4 h-4" />
          <p className="text-lg">Aucune catégorie approuvée</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 flex gap-4 items-center border border-gray-100 dark:border-gray-800">

              {/* Image */}
              <div className="relative w-14 h-14 bg-purple-100 dark:bg-purple-950 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                {cat.image
                  ? <Image src={cat.image} alt={cat.nom} fill sizes="56px" className="object-cover" />
                  : <span className="text-2xl"><Tag className="w-4 h-4" /></span>
                }
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">{cat.nom}</h3>
                {cat.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{cat.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    {cat._count?.products ?? 0} produit{(cat._count?.products ?? 0) > 1 ? 's' : ''}
                  </p>
                  {/* Badge origine */}
                  {cat.vendeurId
                    ? <span className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">Vendeur</span>
                    : <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">Admin</span>
                  }
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => openEdit(cat)}
                  className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 px-3 py-1 rounded-lg text-xs font-medium transition"
                ><Pencil className="w-4 h-4 inline mr-1" />{' '}Modifier
                </button>
                <button
                  onClick={() => { setDeleteId(cat.id); setDeleteError('') }}
                  className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 px-3 py-1 rounded-lg text-xs font-medium transition"
                ><Trash2 className="w-4 h-4 inline mr-1" />{' '}Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal Créer/Modifier ───────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
              {editCategory ? <><Pencil className="w-4 h-4" />{' '}Modifier la catégorie</> : '+ Ajouter une catégorie'}
            </h2>

            {error && (
              <div className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Nom *</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  required
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Nom de la catégorie"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder="Description de la catégorie"
                />
              </div>

              <div>
                <ImageUpload
                  value={form.image}
                  onChange={(url) => setForm({ ...form, image: url })}
                  label="Image de la catégorie"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50"
                >
                  {submitting ? 'En cours...' : editCategory ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Confirmation Suppression ─────────────────── */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-gray-100 dark:border-gray-800">
            <Trash2 className="w-4 h-4" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Supprimer cette catégorie ?</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Cette action est irréversible.</p>

            {deleteError && (
              <div className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteId(null); setDeleteError('') }}
                className="flex-1 border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}