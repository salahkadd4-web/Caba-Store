'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import {
  Plus, Pencil, Trash2, TrendingDown, Palette, Package,
  Eye, EyeOff, X, Ruler, AlertCircle, ClipboardList, Heart,
} from 'lucide-react'

interface Category { id: string; nom: string }
interface VariantOption { valeur: string; stock: string }
interface Variant {
  id?: string; nom: string; couleur: string
  stock: string; images: string[]; options: VariantOption[]
}
interface PrixTier { minQte: string; maxQte: string; prix: string }
interface PrixTierData { minQte: number; maxQte: number | null; prix: number }
interface Product {
  id: string; nom: string; description: string | null; prix: number
  stock: number; images: string[]; actif: boolean; prixVariables: PrixTierData[] | null
  typeOption?: string | null
  variants: { id: string; nom: string; couleur: string | null; stock: number; images: string[]; options?: { valeur: string; stock: number }[] }[]
  category: { id: string; nom: string }
  _count: { orderItems: number; favorites: number }
}

const emptyForm = {
  nom: '', description: '', prix: '', stock: '',
  categoryId: '', images: [] as string[], actif: true, typeOption: '',
}
const emptyVariant = (): Variant => ({ nom: '', couleur: '', stock: '', images: [], options: [] })
const emptyOption  = (): VariantOption => ({ valeur: '', stock: '' })
const emptyTier    = (): PrixTier => ({ minQte: '', maxQte: '', prix: '' })

export default function VendeurProduitsPage() {
  const [produits,       setProduits]       = useState<Product[]>([])
  const [categories,     setCategories]     = useState<Category[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showForm,       setShowForm]       = useState(false)
  const [editing,        setEditing]        = useState<Product | null>(null)
  const [form,           setForm]           = useState(emptyForm)
  const [prixTiers,      setPrixTiers]      = useState<PrixTier[]>([])
  const [variants,       setVariants]       = useState<Variant[]>([])
  const [activeTab,      setActiveTab]      = useState<'infos' | 'prix' | 'variantes'>('infos')
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [uploadingImg,   setUploadingImg]   = useState(false)
  const [varUploadIdx,   setVarUploadIdx]   = useState<number | null>(null)
  const [filterActif,    setFilterActif]    = useState<'all' | 'true' | 'false'>('all')
  const [filterCategory, setFilterCategory] = useState('')
  const fileRef    = useRef<HTMLInputElement>(null)
  const varFileRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [pRes, cRes] = await Promise.all([
      fetch(`/api/vendeur/produits${filterActif !== 'all' ? `?actif=${filterActif}` : ''}`),
      fetch('/api/vendeur/categories'),
    ])
    if (pRes.ok) setProduits(await pRes.json())
    if (cRes.ok) { const d = await cRes.json(); setCategories(d.approuvees || []) }
    setLoading(false)
  }, [filterActif])

  useEffect(() => {
    void (async () => { await fetchData() })()
  }, [fetchData])

  const openAdd = () => {
    setEditing(null); setForm(emptyForm)
    setPrixTiers([]); setVariants([])
    setActiveTab('infos'); setError(null); setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      nom: p.nom, description: p.description || '', prix: String(p.prix),
      stock: String(p.stock), categoryId: p.category.id,
      images: p.images, actif: p.actif, typeOption: p.typeOption || '',
    })
    setPrixTiers(
      Array.isArray(p.prixVariables)
        ? p.prixVariables.map((t) => ({ minQte: String(t.minQte), maxQte: String(t.maxQte ?? ''), prix: String(t.prix) }))
        : []
    )
    setVariants(
      p.variants.map(v => ({
        id: v.id, nom: v.nom, couleur: v.couleur || '', stock: String(v.stock), images: v.images,
        options: v.options?.map(o => ({ valeur: o.valeur, stock: String(o.stock) })) ?? [],
      }))
    )
    setActiveTab('infos'); setError(null); setShowForm(true)
  }

  const handleImageUpload = async (file: File) => {
    setUploadingImg(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) { const { url } = await res.json(); setForm(f => ({ ...f, images: [...f.images, url] })) }
    setUploadingImg(false)
  }

  const handleVariantImageUpload = async (file: File, idx: number) => {
    setVarUploadIdx(idx)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    if (res.ok) {
      const { url } = await res.json()
      setVariants(vs => vs.map((v, i) => i === idx ? { ...v, images: [...v.images, url] } : v))
    }
    setVarUploadIdx(null)
  }

  // ── ERREUR 3 CORRIGÉE : options + typeOption inclus ──
  const handleSubmit = async () => {
    setSaving(true); setError(null)
    try {
      const prixVariables = prixTiers
        .filter(t => t.minQte && t.prix)
        .map(t => ({ minQte: parseInt(t.minQte), maxQte: t.maxQte ? parseInt(t.maxQte) : null, prix: parseFloat(t.prix) }))

      const variantsData = variants
        .filter(v => v.nom.trim())
        .map(v => ({
          nom: v.nom, couleur: v.couleur || null,
          stock: parseInt(v.stock) || 0, images: v.images,
          options: v.options
            .filter(o => o.valeur.trim())
            .map(o => ({ valeur: o.valeur, stock: parseInt(o.stock) || 0 })),
        }))

      const url    = editing ? `/api/vendeur/produits/${editing.id}` : '/api/vendeur/produits'
      const method = editing ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          prix: parseFloat(form.prix),
          stock: parseInt(form.stock),
          prixVariables,
          variants: variantsData,
          typeOption: form.typeOption || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setShowForm(false); fetchData()
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur') }
    finally { setSaving(false) }
  }

  const toggleActif = async (p: Product) => {
    await fetch(`/api/vendeur/produits/${p.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !p.actif }),
    })
    fetchData()
  }

  const handleDelete = async (p: Product) => {
    if (!confirm(`Supprimer "${p.nom}" ?`)) return
    await fetch(`/api/vendeur/produits/${p.id}`, { method: 'DELETE' })
    fetchData()
  }

  const filtered = produits.filter(p => !filterCategory || p.category.id === filterCategory)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mes Produits</h1>
        <button onClick={openAdd}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-xl font-medium transition-all flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'true', 'false'] as const).map(v => (
            <button key={v} onClick={() => setFilterActif(v)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${
                filterActif === v
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}>
              {v === 'all' ? 'Tous' : v === 'true' ? 'Actifs' : 'Désactivés'}
            </button>
          ))}
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className="border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400">
          <option value="">Toutes les catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Aucun produit correspondant aux filtres</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white dark:bg-gray-900 rounded-xl border overflow-hidden transition-all ${
              p.actif ? 'border-gray-100 dark:border-gray-800' : 'border-gray-200 dark:border-gray-700 opacity-60'
            }`}>
              {/* ── ERREUR 1 CORRIGÉE : JSX valide ── */}
              {p.images[0]
                ? <div className="relative w-full h-36"><Image src={p.images[0]} alt={p.nom} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" /></div>
                : (
                  <div className="w-full h-36 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Package className="w-8 h-8 text-gray-400" />
                  </div>
                )
              }

              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{p.nom}</p>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                    p.actif
                      ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                  }`}>
                    {p.actif ? 'Actif' : 'Désactivé'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-1">{p.category.nom}</p>

                {/* Prix + badge dégressif */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {p.prix.toLocaleString('fr-DZ')} DA
                  </p>
                  {Array.isArray(p.prixVariables) && p.prixVariables.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-semibold px-1.5 py-0.5 rounded-full">
                      <TrendingDown className="w-2.5 h-2.5" />
                      {p.prixVariables.length} palier{p.prixVariables.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                {/* Variantes swatches */}
                {p.variants.length > 0 && (
                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    {p.variants.slice(0, 6).map(v => (
                      <span key={v.id} title={v.nom}
                        className="flex items-center gap-0.5 text-[10px] bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
                        {v.couleur && (
                          <span className="w-2.5 h-2.5 rounded-full inline-block border border-gray-300"
                            style={{ backgroundColor: v.couleur }} />
                        )}
                        {v.nom}
                      </span>
                    ))}
                    {p.variants.length > 6 && (
                      <span className="text-[10px] text-gray-400">+{p.variants.length - 6}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span>Stock : {p.stock}</span>
                  <span>{p._count.orderItems} ventes</span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="w-3 h-3" />{p._count.favorites}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)}
                    className="flex-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                    <Pencil className="w-3 h-3" /> Modifier
                  </button>

                  {/* ── ERREUR 2 CORRIGÉE : JSX réel, pas une string ── */}
                  <button onClick={() => toggleActif(p)}
                    className="flex-1 text-xs bg-yellow-50 dark:bg-yellow-950 hover:bg-yellow-100 dark:hover:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1">
                    {p.actif
                      ? <><EyeOff className="w-3 h-3" /> Désactiver</>
                      : <><Eye className="w-3 h-3" /> Activer</>
                    }
                  </button>

                  <button onClick={() => handleDelete(p)}
                    className="text-xs bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 px-2 py-1.5 rounded-lg transition-all flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════════════════════════════════════════
          MODAL FORMULAIRE
      ════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-base font-bold text-gray-800 dark:text-gray-100">
                {editing ? 'Modifier le produit' : 'Nouveau produit'}
              </h2>
              <button onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets */}
            <div className="px-5 pt-4">
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                {(['infos', 'prix', 'variantes'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
                      activeTab === tab
                        ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}>
                    {tab === 'infos'
                      ? <><ClipboardList className="w-3 h-3" />Infos</>
                      : tab === 'prix'
                        ? <><TrendingDown className="w-3 h-3" />Prix</>
                        : <><Palette className="w-3 h-3" />Variantes</>
                    }
                    {tab === 'prix' && prixTiers.length > 0 && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-[9px] px-1 rounded-full">
                        {prixTiers.length}
                      </span>
                    )}
                    {tab === 'variantes' && variants.length > 0 && (
                      <span className="bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 text-[9px] px-1 rounded-full">
                        {variants.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-xl text-sm">{error}</div>
              )}

              {/* ─── Onglet Infos ─── */}
              {activeTab === 'infos' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Nom du produit *</label>
                    <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="Ex: Chaussures de sport..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Stock</label>
                      <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} min="0"
                        className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Catégorie *</label>
                      {categories.length === 0 ? (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950 p-2 rounded-xl">
                          Aucune catégorie approuvée.
                        </p>
                      ) : (
                        <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                          className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400">
                          <option value="">Choisir</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Images produit */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-2">Images du produit</label>
                    <div className="flex flex-wrap gap-2">
                      {form.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <Image src={img} alt="" width={64} height={64} className="w-16 h-16 object-cover rounded-xl" />
                          <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                        className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-400 transition-all">
                        {uploadingImg
                          ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          : <Plus className="w-5 h-5" />
                        }
                      </button>
                      <input ref={fileRef} type="file" className="hidden" accept="image/*"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button onClick={() => setForm(f => ({ ...f, actif: !f.actif }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.actif ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.actif ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <label className="text-sm text-gray-700 dark:text-gray-200">
                      Produit {form.actif ? 'actif (visible)' : 'désactivé (masqué)'}
                    </label>
                  </div>
                </>
              )}

              {/* ─── Onglet Prix ─── */}
              {activeTab === 'prix' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Prix de base (DA) *</label>
                    <input type="number" step="0.01" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))} min="0"
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="Prix pour 1 unité" />
                    <p className="text-xs text-gray-400 mt-1">Affiché par défaut — barré quand un palier s&apos;applique</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">Prix dégressifs par quantité</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Le prix de base sera barré quand un palier s&apos;applique</p>
                      </div>
                      <button type="button" onClick={() => setPrixTiers(t => [...t, emptyTier()])}
                        className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-200 transition flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Palier
                      </button>
                    </div>

                    {prixTiers.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-6 text-center">
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">Aucun palier de prix</p>
                        <p className="text-xs text-gray-300 dark:text-gray-600">Exemple : 1–4 unités → 1500 DA, 5+ unités → 1200 DA</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[10px] text-gray-500 dark:text-gray-400 px-1 font-semibold uppercase tracking-wide">
                          <span>Qté min</span><span>Qté max</span><span>Prix/u (DA)</span><span />
                        </div>
                        {prixTiers.map((tier, i) => (
                          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                            <input type="number" value={tier.minQte}
                              onChange={e => setPrixTiers(t => t.map((x, j) => j === i ? { ...x, minQte: e.target.value } : x))}
                              placeholder="1" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <input type="number" value={tier.maxQte}
                              onChange={e => setPrixTiers(t => t.map((x, j) => j === i ? { ...x, maxQte: e.target.value } : x))}
                              placeholder="vide=∞" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <input type="number" step="0.01" value={tier.prix}
                              onChange={e => setPrixTiers(t => t.map((x, j) => j === i ? { ...x, prix: e.target.value } : x))}
                              placeholder="1200" className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <button type="button" onClick={() => setPrixTiers(t => t.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 p-1">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {form.prix && prixTiers.some(t => t.minQte && t.prix) && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                            <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Aperçu</p>
                            <div className="space-y-1">
                              {prixTiers.filter(t => t.minQte && t.prix).map((t, i) => {
                                const r = Math.round((1 - parseFloat(t.prix) / parseFloat(form.prix)) * 100)
                                return (
                                  <div key={i} className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                    <span>{t.maxQte ? `${t.minQte}–${t.maxQte} unités` : `${t.minQte}+ unités`}</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                      {parseFloat(t.prix).toFixed(2)} DA
                                      {r > 0 && <span className="ml-1 text-green-600 dark:text-green-400">−{r}%</span>}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400">Laissez &quot;Qté max&quot; vide pour &quot;et plus&quot; (ex : 10+)</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── Onglet Variantes ─── */}
              {activeTab === 'variantes' && (
                <>
                  {/* Type d'option */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1 items-center gap-1">
                      <Ruler className="w-3.5 h-3.5" /> Type d&apos;option
                    </label>
                    <input type="text" value={form.typeOption}
                      onChange={e => setForm(f => ({ ...f, typeOption: e.target.value }))}
                      placeholder="ex : Taille, Pointure, Volume, Contenance..."
                      className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Laissez vide si vos variantes n&apos;ont pas de sous-options
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-300 flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5" /> Couleurs ou parfums
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Chaque variante a son propre stock et ses images</p>
                    </div>
                    <button type="button" onClick={() => setVariants(vs => [...vs, emptyVariant()])}
                      className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-200 transition flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Variante
                    </button>
                  </div>

                  {variants.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl py-6 text-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">Aucune variante</p>
                      <p className="text-xs text-gray-300 dark:text-gray-600">Exemple : Rouge, Bleu, Lavande, Vanille…</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* ── ERREUR 4 CORRIGÉE : options DANS chaque carte variante ── */}
                      {variants.map((v, i) => (
                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2.5">

                          {/* Swatch + Nom + Supprimer */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg border border-gray-200 dark:border-gray-600 shrink-0"
                              style={{ backgroundColor: v.couleur || '#e5e7eb' }} />
                            <input type="text" value={v.nom}
                              onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
                              placeholder="Nom (ex : Rouge, Lavande)"
                              className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            <button type="button" onClick={() => setVariants(vs => vs.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 p-1 shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Couleur + Stock */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Couleur (optionnel)</label>
                              <div className="flex items-center gap-1.5">
                                <input type="color" value={v.couleur || '#000000'}
                                  onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, couleur: e.target.value } : x))}
                                  className="w-8 h-8 rounded cursor-pointer border border-gray-200 dark:border-gray-600 p-0.5" />
                                <input type="text" value={v.couleur}
                                  onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, couleur: e.target.value } : x))}
                                  placeholder="#000000"
                                  className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1 block">Stock *</label>
                              <input type="number" value={v.stock} min="0"
                                onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))}
                                placeholder="0"
                                className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400" />
                            </div>
                          </div>

                          {/* Images de la variante */}
                          <div>
                            <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 block">
                              Images — {v.nom || 'variante'}{' '}
                              <span className="text-gray-300 dark:text-gray-600">(remplacent les images du produit)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {v.images.map((img, imgIdx) => (
                                <div key={imgIdx} className="relative group">
                                  <Image src={img} alt="" width={48} height={48} className="w-12 h-12 object-cover rounded-lg" />
                                  <button
                                    onClick={() => setVariants(vs => vs.map((x, j) => j === i
                                      ? { ...x, images: x.images.filter((_, k) => k !== imgIdx) } : x))}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                              <button type="button"
                                onClick={() => { setVarUploadIdx(i); varFileRef.current?.click() }}
                                disabled={varUploadIdx === i}
                                className="w-12 h-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 hover:border-emerald-400 hover:text-emerald-400 transition">
                                {varUploadIdx === i
                                  ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                                  : <Plus className="w-4 h-4" />
                                }
                              </button>
                            </div>
                          </div>

                          {/* Options (taille / pointure / volume…) — DANS la carte variante */}
                          {form.typeOption && (
                            <div className="border-t border-gray-100 dark:border-gray-700 pt-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 font-medium">
                                  <Ruler className="w-3 h-3" />
                                  {form.typeOption}s disponibles
                                  {v.nom ? ` — ${v.nom}` : ''}
                                </label>
                                <button type="button"
                                  onClick={() => setVariants(vs => vs.map((x, j) => j === i
                                    ? { ...x, options: [...x.options, emptyOption()] } : x))}
                                  className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:bg-emerald-200 transition">
                                  <Plus className="w-2.5 h-2.5" /> Ajouter
                                </button>
                              </div>
                              {v.options.length === 0 ? (
                                <p className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Aucune option — cliquez Ajouter
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {v.options.map((opt, oi) => (
                                    <div key={oi}
                                      className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-700">
                                      <input type="text" value={opt.valeur}
                                        onChange={e => setVariants(vs => vs.map((x, j) => j === i
                                          ? { ...x, options: x.options.map((o, k) => k === oi ? { ...o, valeur: e.target.value } : o) }
                                          : x))}
                                        placeholder="ex : 40"
                                        className="w-12 text-xs bg-transparent focus:outline-none text-gray-800 dark:text-gray-100 font-semibold" />
                                      <span className="text-gray-200 dark:text-gray-700 text-xs">|</span>
                                      <input type="number" value={opt.stock}
                                        onChange={e => setVariants(vs => vs.map((x, j) => j === i
                                          ? { ...x, options: x.options.map((o, k) => k === oi ? { ...o, stock: e.target.value } : o) }
                                          : x))}
                                        placeholder="stk"
                                        className="w-10 text-xs bg-transparent focus:outline-none text-gray-400 dark:text-gray-500" />
                                      <button type="button"
                                        onClick={() => setVariants(vs => vs.map((x, j) => j === i
                                          ? { ...x, options: x.options.filter((_, k) => k !== oi) } : x))}
                                        className="text-red-400 hover:text-red-600">
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Input fichier partagé pour les variantes */}
                      <input ref={varFileRef} type="file" className="hidden" accept="image/*"
                        onChange={e => {
                          const f = e.target.files?.[0]
                          if (f && varUploadIdx !== null) handleVariantImageUpload(f, varUploadIdx)
                          e.target.value = ''
                        }} />
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-gray-900 flex gap-3 p-5 border-t border-gray-100 dark:border-gray-800">
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={saving || !form.nom || !form.prix || !form.categoryId}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm py-2.5 rounded-xl font-medium transition-all">
                {saving ? 'Enregistrement...' : editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}