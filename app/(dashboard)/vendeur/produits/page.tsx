'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useScrollLock } from '@/lib/hooks/useScrollLock'
import Image from 'next/image'
import {
  Plus, Pencil, Trash2, TrendingDown, Palette, Package,
  Eye, EyeOff, X, Ruler, AlertCircle, ClipboardList, Heart,
} from 'lucide-react'
import {
  heading, inputCls, selectCls, btnPrimaryEmerald, btnSecondary,
  modalOverlay, modalBox, loadingPage, kpiCard,
} from '@/lib/dashboard-ui'
import { useI18n } from '@/components/I18nProvider'
import { usePhotoPicker } from '@/components/PhotoPicker'

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

const inputSm =
  'border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 ' +
  'text-stone-800 dark:text-stone-100 rounded-lg px-2 py-1.5 text-sm ' +
  'focus:outline-none focus:ring-1 focus:ring-orange-400 transition'

const Spinner = () => (
  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export default function VendeurProduitsPage() {
  const { t, fmt } = useI18n()
  const p_ = t.pm
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
  const varTargetRef = useRef<number | null>(null)

  useScrollLock(showForm)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(`/api/vendeur/produits${filterActif !== 'all' ? `?actif=${filterActif}` : ''}`),
        fetch('/api/vendeur/categories'),
      ])
      if (pRes.ok) setProduits(await pRes.json())
      if (cRes.ok) { const d = await cRes.json(); setCategories(d.approuvees || []) }
    } finally {
      setLoading(false)
    }
  }, [filterActif])

  useEffect(() => { void fetchData() }, [fetchData])

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
        ? p.prixVariables.map(t => ({ minQte: String(t.minQte), maxQte: String(t.maxQte ?? ''), prix: String(t.prix) }))
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

  const mainPhoto = usePhotoPicker({ onFiles: files => { if (files[0]) handleImageUpload(files[0]) } })
  const varPhoto  = usePhotoPicker({
    onFiles: files => {
      const idx = varTargetRef.current
      if (files[0] && idx !== null) handleVariantImageUpload(files[0], idx)
    },
  })

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
      if (!res.ok) throw new Error(data.error || p_.error)
      setShowForm(false); fetchData()
    } catch (e) { setError(e instanceof Error ? e.message : p_.error) }
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
    if (!confirm(p_.confirmDelete(p.nom))) return
    await fetch(`/api/vendeur/produits/${p.id}`, { method: 'DELETE' })
    fetchData()
  }

  const filtered = produits.filter(p => !filterCategory || p.category.id === filterCategory)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={heading}>{p_.sellerTitle}</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{p_.count(produits.length)}</p>
        </div>
        <button onClick={openAdd} className={btnPrimaryEmerald}>
          <Plus className="w-4 h-4 inline me-1.5" />{p_.add}
        </button>
      </div>

      {/* KPI résumé */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: p_.total,    value: produits.length,                             color: 'text-stone-700 dark:text-stone-200' },
            { label: p_.active,   value: produits.filter(p => p.actif).length,        color: 'text-emerald-600 dark:text-emerald-400' },
            { label: p_.inactive, value: produits.filter(p => !p.actif).length,       color: 'text-stone-400' },
          ].map(k => (
            <div key={k.label} className={kpiCard}>
              <p className="text-xs text-stone-500 dark:text-stone-400">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'true', 'false'] as const).map(v => (
            <button key={v} onClick={() => setFilterActif(v)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-medium border transition ${
                filterActif === v
                  ? 'bg-stone-900 text-white border-stone-900 dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                  : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-stone-400'
              }`}>
              {v === 'all' ? p_.all : v === 'true' ? p_.active : p_.inactive}
            </button>
          ))}
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
          className={`${selectCls} text-sm py-1.5`}>
          <option value="">{p_.allCategories}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </div>

      {/* Grille */}
      {loading ? (
        <div className={loadingPage}>{t.common.loading}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{p_.noMatch}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <div key={p.id} className={`bg-white dark:bg-stone-900 rounded-xl border overflow-hidden transition-all ${
              p.actif ? 'border-stone-200 dark:border-stone-800' : 'border-stone-200 dark:border-stone-700 opacity-60'
            }`}>
              {p.images[0]
                ? <div className="relative w-full h-36">
                    <Image src={p.images[0]} alt={p.nom} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" />
                  </div>
                : <div className="w-full h-36 bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                    <Package className="w-8 h-8 text-stone-400" />
                  </div>
              }

              <div className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">{p.nom}</p>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                    p.actif
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                  }`}>
                    {p.actif ? p_.statusActive : p_.statusInactive}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mb-1">{p.category.nom}</p>

                {/* Prix */}
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                    {fmt.price(p.prix)}
                  </p>
                  {Array.isArray(p.prixVariables) && p.prixVariables.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 font-semibold px-1.5 py-0.5 rounded-full">
                      <TrendingDown className="w-2.5 h-2.5" />
                      {p_.tiers(p.prixVariables.length)}
                    </span>
                  )}
                </div>

                {/* Variantes swatches */}
                {p.variants.length > 0 && (
                  <div className="flex items-center gap-1 mb-2 flex-wrap">
                    {p.variants.slice(0, 6).map(v => (
                      <span key={v.id} title={v.nom}
                        className="flex items-center gap-0.5 text-[10px] bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-full text-stone-600 dark:text-stone-400">
                        {v.couleur && (
                          <span className="w-2.5 h-2.5 rounded-full inline-block border border-stone-300"
                            style={{ backgroundColor: v.couleur }} />
                        )}
                        {v.nom}
                      </span>
                    ))}
                    {p.variants.length > 6 && (
                      <span className="text-[10px] text-stone-400">+{p.variants.length - 6}</span>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-stone-400 mb-3">
                  <span>{p_.stockLabel(p.stock)}</span>
                  <span>{p_.sales(p._count.orderItems)}</span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="w-3 h-3" />{p._count.favorites}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => openEdit(p)}
                    className="flex-1 text-xs bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 px-2 py-1.5 rounded-lg transition flex items-center justify-center gap-1">
                    <Pencil className="w-3 h-3" /> {p_.edit}
                  </button>
                  <button onClick={() => toggleActif(p)}
                    className="flex-1 text-xs bg-amber-50 dark:bg-amber-950 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-1.5 rounded-lg transition flex items-center justify-center gap-1">
                    {p.actif
                      ? <><EyeOff className="w-3 h-3" /> {p_.deactivate}</>
                      : <><Eye className="w-3 h-3" /> {p_.activate}</>
                    }
                  </button>
                  <button onClick={() => handleDelete(p)}
                    className="text-xs bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 px-2 py-1.5 rounded-lg transition flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ════════ MODAL FORMULAIRE ════════ */}
      {showForm && (
        <div className={modalOverlay} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className={`${modalBox} max-w-xl max-h-[92vh] overflow-y-auto`}>

            {/* Header */}
            <div className="sticky top-0 bg-[#FAF7F2] dark:bg-stone-900 z-10 flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-100">
                {editing ? p_.editProduct : p_.newProduct}
              </h2>
              <button onClick={() => setShowForm(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets */}
            <div className="px-5 pt-4">
              <div className="flex gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl">
                {(['infos', 'prix', 'variantes'] as const).map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1 ${
                      activeTab === tab
                        ? 'bg-white dark:bg-stone-700 text-stone-800 dark:text-stone-100 shadow-sm'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                    }`}>
                    {tab === 'infos'
                      ? <><ClipboardList className="w-3 h-3" />{p_.tabInfo}</>
                      : tab === 'prix'
                        ? <><TrendingDown className="w-3 h-3" />{p_.tabPrice}</>
                        : <><Palette className="w-3 h-3" />{p_.tabVariants}</>
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
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{p_.productName}</label>
                    <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                      className={inputCls} placeholder={p_.namePlaceholder} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{p_.description}</label>
                    <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                      className="w-full border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{p_.stock}</label>
                      <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} min="0"
                        className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{p_.category}</label>
                      {categories.length === 0 ? (
                        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 p-2 rounded-xl">
                          {p_.noApprovedCategory}
                        </p>
                      ) : (
                        <select value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                          className={`${selectCls} w-full`}>
                          <option value="">{p_.choose}</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Images produit */}
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-2">{p_.productImages}</label>
                    <div className="flex flex-wrap gap-2">
                      {form.images.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <Image src={img} alt="" width={64} height={64} className="w-16 h-16 object-cover rounded-xl border border-stone-200 dark:border-stone-700" />
                          <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))}
                            className="absolute -top-1 -end-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={mainPhoto.open} disabled={uploadingImg}
                        className="w-16 h-16 border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl flex items-center justify-center text-stone-400 hover:border-orange-400 hover:text-orange-400 transition">
                        {uploadingImg ? <Spinner /> : <Plus className="w-5 h-5" />}
                      </button>
                      {mainPhoto.picker}
                    </div>
                  </div>

                  {/* Toggle actif */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => setForm(f => ({ ...f, actif: !f.actif }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.actif ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.actif ? 'translate-x-6 rtl:-translate-x-6' : 'translate-x-1 rtl:-translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-stone-700 dark:text-stone-200">
                      {form.actif ? p_.productActive : p_.productInactive}
                    </span>
                  </div>
                </>
              )}

              {/* ─── Onglet Prix ─── */}
              {activeTab === 'prix' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">{p_.basePrice}</label>
                    <input type="number" step="0.01" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))} min="0"
                      className={inputCls} placeholder={p_.basePricePlaceholder} />
                    <p className="text-xs text-stone-400 mt-1">{p_.basePriceHint}</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-medium text-stone-600 dark:text-stone-300">{p_.degressiveTitle}</p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{p_.degressiveHint}</p>
                      </div>
                      <button type="button" onClick={() => setPrixTiers(t => [...t, emptyTier()])}
                        className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-200 transition flex items-center gap-1">
                        <Plus className="w-3 h-3" /> {p_.addTier}
                      </button>
                    </div>

                    {prixTiers.length === 0 ? (
                      <div className="border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-xl py-6 text-center">
                        <p className="text-sm text-stone-400 dark:text-stone-500 mb-1">{p_.noTier}</p>
                        <p className="text-xs text-stone-300 dark:text-stone-600">{p_.tierExample}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-[10px] text-stone-500 dark:text-stone-400 px-1 font-semibold uppercase tracking-wide">
                          <span>{p_.minQty}</span><span>{p_.maxQty}</span><span>{p_.unitPrice}</span><span />
                        </div>
                        {prixTiers.map((tier, i) => (
                          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                            <input type="number" value={tier.minQte}
                              onChange={e => setPrixTiers(t => t.map((x, j) => j === i ? { ...x, minQte: e.target.value } : x))}
                              placeholder="1" className={inputSm} />
                            <input type="number" value={tier.maxQte}
                              onChange={e => setPrixTiers(t => t.map((x, j) => j === i ? { ...x, maxQte: e.target.value } : x))}
                              placeholder={p_.emptyInfinite} className={inputSm} />
                            <input type="number" step="0.01" value={tier.prix}
                              onChange={e => setPrixTiers(t => t.map((x, j) => j === i ? { ...x, prix: e.target.value } : x))}
                              placeholder="1200" className={inputSm} />
                            <button type="button" onClick={() => setPrixTiers(t => t.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 p-1">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {form.prix && prixTiers.some(t => t.minQte && t.prix) && (
                          <div className="mt-3 p-3 bg-stone-50 dark:bg-stone-800 rounded-xl">
                            <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">{p_.preview}</p>
                            <div className="space-y-1">
                              {prixTiers.filter(t => t.minQte && t.prix).map((t, i) => {
                                const r = Math.round((1 - parseFloat(t.prix) / parseFloat(form.prix)) * 100)
                                return (
                                  <div key={i} className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                                    <span>{t.maxQte ? p_.unitsRange(t.minQte, t.maxQte) : p_.unitsPlus(t.minQte)}</span>
                                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                                      {fmt.money(parseFloat(t.prix))} {fmt.currency}
                                      {r > 0 && <span className="ms-1 text-emerald-600 dark:text-emerald-400">−{r}%</span>}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-stone-400">{p_.maxEmptyHint}</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ─── Onglet Variantes ─── */}
              {activeTab === 'variantes' && (
                <>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-stone-600 dark:text-stone-300 mb-1.5">
                      <Ruler className="w-3.5 h-3.5" /> {p_.optionType}
                    </label>
                    <input type="text" value={form.typeOption}
                      onChange={e => setForm(f => ({ ...f, typeOption: e.target.value }))}
                      placeholder={p_.optionTypePlaceholder}
                      className={inputCls} />
                    <p className="text-[10px] text-stone-400 mt-1">
                      {p_.optionTypeHint}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-stone-600 dark:text-stone-300 flex items-center gap-1">
                        <Palette className="w-3.5 h-3.5" /> {p_.colorsOrScents}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{p_.variantsHint}</p>
                    </div>
                    <button type="button" onClick={() => setVariants(vs => [...vs, emptyVariant()])}
                      className="text-xs bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded-lg hover:bg-emerald-200 transition flex items-center gap-1">
                      <Plus className="w-3 h-3" /> {p_.addVariant}
                    </button>
                  </div>

                  {variants.length === 0 ? (
                    <div className="border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-xl py-6 text-center">
                      <p className="text-sm text-stone-400 dark:text-stone-500 mb-1">{p_.noVariant}</p>
                      <p className="text-xs text-stone-300 dark:text-stone-600">{p_.variantExample}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {variants.map((v, i) => (
                        <div key={i} className="border border-stone-200 dark:border-stone-700 rounded-xl p-3 space-y-2.5 bg-stone-50/50 dark:bg-stone-800/30">
                          {/* Swatch + Nom + Supprimer */}
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg border border-stone-200 dark:border-stone-600 shrink-0"
                              style={{ backgroundColor: v.couleur || '#e5e7eb' }} />
                            <input type="text" value={v.nom}
                              onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, nom: e.target.value } : x))}
                              placeholder={p_.variantNamePlaceholder}
                              className={`flex-1 ${inputSm}`} />
                            <button type="button" onClick={() => setVariants(vs => vs.filter((_, j) => j !== i))}
                              className="text-red-400 hover:text-red-600 p-1 shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Couleur + Stock */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] text-stone-500 dark:text-stone-400 mb-1 block">{p_.colorOptional}</label>
                              <div className="flex items-center gap-1.5">
                                <input type="color" value={v.couleur || '#000000'}
                                  onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, couleur: e.target.value } : x))}
                                  className="w-8 h-8 rounded cursor-pointer border border-stone-200 dark:border-stone-600 p-0.5" />
                                <input type="text" value={v.couleur}
                                  onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, couleur: e.target.value } : x))}
                                  placeholder="#000000"
                                  className={`flex-1 ${inputSm} text-xs`} />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-stone-500 dark:text-stone-400 mb-1 block">{p_.stockRequired}</label>
                              <input type="number" value={v.stock} min="0"
                                onChange={e => setVariants(vs => vs.map((x, j) => j === i ? { ...x, stock: e.target.value } : x))}
                                placeholder="0" className={`w-full ${inputSm}`} />
                            </div>
                          </div>

                          {/* Images de la variante */}
                          <div>
                            <label className="text-[10px] text-stone-500 dark:text-stone-400 mb-1.5 block">
                              {p_.variantImages(v.nom || p_.variantFallback)}{' '}
                              <span className="text-stone-300 dark:text-stone-600">{p_.replacesProductImages}</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {v.images.map((img, imgIdx) => (
                                <div key={imgIdx} className="relative group">
                                  <Image src={img} alt="" width={48} height={48} className="w-12 h-12 object-cover rounded-lg border border-stone-200 dark:border-stone-700" />
                                  <button
                                    onClick={() => setVariants(vs => vs.map((x, j) => j === i
                                      ? { ...x, images: x.images.filter((_, k) => k !== imgIdx) } : x))}
                                    className="absolute -top-1 -end-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              ))}
                              <button type="button"
                                onClick={() => { varTargetRef.current = i; varPhoto.open() }}
                                disabled={varUploadIdx === i}
                                className="w-12 h-12 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-lg flex items-center justify-center text-stone-400 hover:border-orange-400 hover:text-orange-400 transition">
                                {varUploadIdx === i ? <Spinner /> : <Plus className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Options (taille / pointure / volume…) */}
                          {form.typeOption && (
                            <div className="border-t border-stone-200 dark:border-stone-700 pt-2.5">
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[10px] text-stone-500 dark:text-stone-400 flex items-center gap-1 font-medium">
                                  <Ruler className="w-3 h-3" />
                                  {p_.optionsAvailable(form.typeOption, v.nom)}
                                </label>
                                <button type="button"
                                  onClick={() => setVariants(vs => vs.map((x, j) => j === i
                                    ? { ...x, options: [...x.options, emptyOption()] } : x))}
                                  className="text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:bg-emerald-200 transition">
                                  <Plus className="w-2.5 h-2.5" /> {p_.add}
                                </button>
                              </div>
                              {v.options.length === 0 ? (
                                <p className="text-[10px] text-stone-400 italic flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> {p_.noOptionClickAdd}
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {v.options.map((opt, oi) => (
                                    <div key={oi}
                                      className="flex items-center gap-1 bg-white dark:bg-stone-800 rounded-lg px-2 py-1 border border-stone-200 dark:border-stone-700">
                                      <input type="text" value={opt.valeur}
                                        onChange={e => setVariants(vs => vs.map((x, j) => j === i
                                          ? { ...x, options: x.options.map((o, k) => k === oi ? { ...o, valeur: e.target.value } : o) }
                                          : x))}
                                        placeholder={p_.optionPlaceholder}
                                        className="w-12 text-xs bg-transparent focus:outline-none text-stone-800 dark:text-stone-100 font-semibold" />
                                      <span className="text-stone-200 dark:text-stone-700 text-xs">|</span>
                                      <input type="number" value={opt.stock}
                                        onChange={e => setVariants(vs => vs.map((x, j) => j === i
                                          ? { ...x, options: x.options.map((o, k) => k === oi ? { ...o, stock: e.target.value } : o) }
                                          : x))}
                                        placeholder={p_.stockShort}
                                        className="w-10 text-xs bg-transparent focus:outline-none text-stone-400 dark:text-stone-500" />
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

                      {varPhoto.picker}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-[#FAF7F2] dark:bg-stone-900 flex gap-3 p-5 border-t border-stone-200 dark:border-stone-800">
              <button onClick={() => setShowForm(false)} className={`flex-1 ${btnSecondary}`}>{t.common.cancel}</button>
              <button onClick={handleSubmit} disabled={saving || !form.nom || !form.prix || !form.categoryId}
                className={`flex-1 ${btnPrimaryEmerald}`}>
                {saving ? p_.saving : editing ? p_.save : p_.add}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
