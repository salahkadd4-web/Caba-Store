'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import MultiImageUpload from '@/components/admin/MultiImageUpload'
import {
  Plus, Pencil, Eye, EyeOff, TrendingDown, Palette,
  Package, X, AlertTriangle,
  ClipboardList, Ruler,
} from 'lucide-react'

type Category = { id: string; nom: string }
type VendeurOption = { id: string; nomBoutique: string | null; user: { nom: string; prenom: string } }
type VariantOption = { valeur: string; stock: string }
type Variant = { id?: string; nom: string; couleur: string; stock: string; images: string[]; options: VariantOption[] }
type PrixTier = { minQte: string; maxQte: string; prix: string }
type PrixTierData = { minQte: number; maxQte: number | null; prix: number }
type VariantOptionData = { valeur: string; stock: number }
type Product = {
  id: string; nom: string; description: string | null
  prix: number; stock: number; actif: boolean
  images: string[]; categoryId: string
  typeOption?: string | null
  prixVariables: PrixTierData[] | null
  variants: { id: string; nom: string; couleur: string | null; stock: number; images: string[]; options?: VariantOptionData[] }[]
  category: Category
  vendeur?: { id: string; nomBoutique: string | null } | null
}

const emptyForm = {
  nom: '', description: '', prix: '', stock: '', images: '', categoryId: '', typeOption: '',
}
const emptyVariant = (): Variant => ({ nom: '', couleur: '', stock: '', images: [], options: [] })
const emptyOption  = (): VariantOption => ({ valeur: '', stock: '' })
const emptyTier = (): PrixTier => ({ minQte: '', maxQte: '', prix: '' })

export default function AdminProduitsPage() {
  const [produits,     setProduits]     = useState<Product[]>([])
  const [categories,   setCategories]   = useState<Category[]>([])
  const [vendeurs,     setVendeurs]     = useState<VendeurOption[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showModal,    setShowModal]    = useState(false)
  const [editProduit,  setEditProduit]  = useState<Product | null>(null)
  const [form,         setForm]         = useState(emptyForm)
  const [prixTiers,    setPrixTiers]    = useState<PrixTier[]>([])
  const [variants,     setVariants]     = useState<Variant[]>([])
  const [activeTab,    setActiveTab]    = useState<'infos' | 'prix' | 'variantes'>('infos')
  const [error,        setError]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [showInactifs, setShowInactifs] = useState(false)
  const [toggleId,     setToggleId]     = useState<string | null>(null)
  const [toggling,     setToggling]     = useState(false)
  const [filterVendeur,  setFilterVendeur]  = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [adminOnly,      setAdminOnly]       = useState(false)
  const [search,         setSearch]          = useState('')

  const fetchVendeurs = useCallback(async () => {
    const res = await fetch('/api/admin/vendeurs?statut=APPROUVE')
    if (res.ok) setVendeurs(await res.json())
  }, [])

  const fetchData = useCallback(async (vendeurId = filterVendeur, isAdminOnly = adminOnly) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (vendeurId)   params.set('vendeurId', vendeurId)
    if (isAdminOnly) params.set('adminOnly', 'true')
    const [produitsRes, catsRes] = await Promise.all([
      fetch(`/api/admin/produits?${params}`),
      fetch('/api/admin/categories'),
    ])
    setProduits(await produitsRes.json())
    setCategories(await catsRes.json())
    setLoading(false)
  }, [filterVendeur, adminOnly])

  useEffect(() => { fetchVendeurs() }, [fetchVendeurs])
  useEffect(() => { fetchData(filterVendeur, adminOnly) }, [fetchData, filterVendeur, adminOnly])

  const filtered = produits.filter(p => {
    const matchActif    = showInactifs ? !p.actif : p.actif
    const matchSearch   = !search || `${p.nom} ${p.description || ''}`.toLowerCase().includes(search.toLowerCase())
    const matchCategory = !filterCategory || p.categoryId === filterCategory
    return matchActif && matchSearch && matchCategory
  })

  const produitsActifs   = produits.filter(p => p.actif)
  const produitsInactifs = produits.filter(p => !p.actif)

  const openCreate = () => {
    setEditProduit(null); setForm(emptyForm)
    setPrixTiers([]); setVariants([])
    setActiveTab('infos'); setError(''); setShowModal(true)
  }

  const openEdit = (p: Product) => {
    setEditProduit(p)
    setForm({ nom: p.nom, description: p.description || '', prix: p.prix.toString(),
      stock: p.stock.toString(), images: p.images.join(', '), categoryId: p.categoryId, typeOption: p.typeOption || '' })
    setPrixTiers(
      Array.isArray(p.prixVariables)
        ? p.prixVariables.map((t) => ({ minQte: String(t.minQte), maxQte: String(t.maxQte ?? ''), prix: String(t.prix) }))
        : []
    )
    setVariants(
      p.variants.map(v => ({
        id: v.id, nom: v.nom, couleur: v.couleur || '', stock: String(v.stock), images: v.images,
        options: v.options?.map((o) => ({ valeur: o.valeur, stock: String(o.stock) })) ?? [],
      }))
    )
    setActiveTab('infos'); setError(''); setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSubmitting(true)
    const images = form.images.split(',').map(i => i.trim()).filter(Boolean)
    const prixVariables = prixTiers
      .filter(t => t.minQte && t.prix)
      .map(t => ({ minQte: parseInt(t.minQte), maxQte: t.maxQte ? parseInt(t.maxQte) : null, prix: parseFloat(t.prix) }))
    const variantesData = variants
      .filter(v => v.nom.trim())
      .map(v => ({
        nom: v.nom, couleur: v.couleur || null,
        stock: parseInt(v.stock) || 0, images: v.images,
        options: v.options.filter(o => o.valeur.trim()).map(o => ({ valeur: o.valeur, stock: parseInt(o.stock) || 0 })),
      }))
    try {
      const res = await fetch(
        editProduit ? `/api/admin/produits/${editProduit.id}` : '/api/admin/produits',
        {
          method: editProduit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, images, prixVariables, variants: variantesData, typeOption: form.typeOption || null }),
        }
      )
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setShowModal(false); fetchData()
    } catch { setError('Erreur serveur') }
    finally { setSubmitting(false) }
  }

  const handleToggle = async (produit: Product) => {
    if (!produit.actif && produit.stock === 0) return
    setToggling(true)
    await fetch(`/api/admin/produits/${produit.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !produit.actif }),
    })
    setToggleId(null); setToggling(false); fetchData()
  }

  if (loading) return <div className="text-center text-gray-500 dark:text-gray-400 py-12">Chargement...</div>

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Produits</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span className="text-green-600 font-medium">{produitsActifs.length} actifs</span>
            {' · '}
            <span className="text-red-500 font-medium">{produitsInactifs.length} désactivés</span>
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowInactifs(!showInactifs)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition border-2 ${
              showInactifs
                ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
            }`}>
            {showInactifs ? <span className='flex items-center gap-1'><Eye className='w-3.5 h-3.5' />Voir actifs</span> : <span className='flex items-center gap-1'><EyeOff className='w-3.5 h-3.5' />Désactivés ({produitsInactifs.length})</span>}
          </button>
          {!showInactifs && (
            <button onClick={openCreate} className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-lg transition">
              + Ajouter un produit
            </button>
          )}
        </div>
      </div>

      {showInactifs && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded-xl mb-4">
          Vous visualisez les produits désactivés — ils ne sont pas visibles par les clients.
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom..."
            className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
          <select value={filterVendeur} onChange={e => { setFilterVendeur(e.target.value); setAdminOnly(false) }} disabled={adminOnly}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-50 disabled:opacity-40">
            <option value="">Tous les vendeurs</option>
            {vendeurs.map(v => <option key={v.id} value={v.id}>{v.nomBoutique || `${v.user.prenom} ${v.user.nom}`}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-45">
            <option value="">Toutes les catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button onClick={() => { setAdminOnly(v => !v); setFilterVendeur('') }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap border ${
              adminOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700'
            }`}>
            Admin seulement
          </button>
        </div>
      </div>

      {/* Tableau produits */}
      <div className="hidden lg:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
            <tr>
              <th className="text-left px-6 py-4">Produit</th>
              <th className="text-left px-6 py-4">Vendeur</th>
              <th className="text-left px-6 py-4">Prix</th>
              <th className="text-left px-6 py-4">Stock</th>
              <th className="text-left px-6 py-4">Variantes</th>
              <th className="text-left px-6 py-4">Statut</th>
              <th className="text-left px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">{showInactifs ? 'Aucun produit désactivé' : 'Aucun produit trouvé'}</td></tr>
            ) : filtered.map(produit => (
              <tr key={produit.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition ${!produit.actif ? 'opacity-60' : ''}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0">
                      {produit.images[0] ? <Image src={produit.images[0]} alt={produit.nom} fill sizes="40px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{produit.nom}</p>
                      <p className="text-xs text-gray-400 line-clamp-1">{produit.category.nom}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {produit.vendeur
                    ? <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">{produit.vendeur.nomBoutique || '—'}</span>
                    : <span className="text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">Admin</span>}
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-blue-600 dark:text-blue-400">{produit.prix.toFixed(2)} DA</p>
                  {Array.isArray(produit.prixVariables) && produit.prixVariables.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1"><TrendingDown className="w-3 h-3" />{produit.prixVariables.length} palier{produit.prixVariables.length > 1 ? 's' : ''}</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${produit.stock > 0 ? 'bg-green-100 dark:bg-green-950 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400'}`}>
                    {produit.stock > 0 ? `${produit.stock} en stock` : 'Rupture'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {produit.variants.length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {produit.variants.slice(0, 4).map(v => (
                        <span key={v.id} className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                          {v.couleur && <span className="w-3 h-3 rounded-full inline-block border" style={{ backgroundColor: v.couleur }} />}
                          {v.nom}
                        </span>
                      ))}
                      {produit.variants.length > 4 && <span className="text-xs text-gray-400">+{produit.variants.length - 4}</span>}
                    </div>
                  ) : <span className="text-xs text-gray-400">—</span>}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${produit.actif ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
                    {produit.actif ? 'Actif' : 'Désactivé'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(produit)} className="bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 px-3 py-1 rounded-lg text-xs font-medium transition"><span className='flex items-center gap-1'><Pencil className='w-3 h-3' />Modifier</span></button>
                    <button onClick={() => setToggleId(produit.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition ${produit.actif ? 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400' : 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400'}`}>
                      {produit.actif ? '🚫 Désactiver' : '✅ Activer'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="lg:hidden space-y-3">
        {filtered.map(produit => (
          <div key={produit.id} className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 ${!produit.actif ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3 mb-3">
              <div className="relative w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden shrink-0">
                {produit.images[0] ? <Image src={produit.images[0]} alt={produit.nom} fill sizes="48px" className="object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm truncate">{produit.nom}</p>
                <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{produit.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400">{produit.prix.toFixed(2)} DA</span>
              {produit.variants.length > 0 && <span className="bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">{produit.variants.length} variante{produit.variants.length > 1 ? 's' : ''}</span>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(produit)} className="flex-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg text-xs font-medium transition"><span className='flex items-center gap-1'><Pencil className='w-3 h-3' />Modifier</span></button>
              <button onClick={() => setToggleId(produit.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${produit.actif ? 'bg-orange-50 dark:bg-orange-950 text-orange-600' : 'bg-green-50 dark:bg-green-950 text-green-600'}`}>
                {produit.actif ? '🚫 Désactiver' : '✅ Activer'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL CRÉER / MODIFIER
      ══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[92vh] overflow-y-auto border border-gray-100 dark:border-gray-800">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              {editProduit ? <span className='flex items-center gap-2'><Pencil className='w-4 h-4'/>Modifier le produit</span> : <span className='flex items-center gap-2'><Plus className='w-4 h-4'/>Ajouter un produit</span>}
            </h2>

            {/* Onglets */}
            <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              {(['infos', 'prix', 'variantes'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${activeTab === tab ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                  {tab === 'infos' ? <span className="flex items-center gap-1.5"><ClipboardList className="w-3.5 h-3.5" />Informations</span> : tab === 'prix' ? <span className="flex items-center gap-1.5"><TrendingDown className="w-3.5 h-3.5" />Prix</span> : <span className="flex items-center gap-1.5"><Palette className="w-3.5 h-3.5" />Variantes</span>}
                </button>
              ))}
            </div>

            {error && <div className="bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* ─── Onglet Informations ─── */}
              {activeTab === 'infos' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom *</label>
                    <input type="text" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Nom du produit" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                    <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Description du produit" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock *</label>
                      <input type="number" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Catégorie *</label>
                      <select value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} required
                        className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="">Sélectionner</option>
                        {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <MultiImageUpload
                      values={form.images ? form.images.split(',').map(i => i.trim()).filter(Boolean) : []}
                      onChange={urls => setForm({...form, images: urls.join(',')})}
                      label="Images du produit"
                    />
                  </div>
                </>
              )}

              {/* ─── Onglet Prix ─── */}
              {activeTab === 'prix' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prix de base (DA) *</label>
                    <input type="number" step="0.01" value={form.prix} onChange={e => setForm({...form, prix: e.target.value})} required
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="0.00" />
                    <p className="text-xs text-gray-400 mt-1">Prix affiché par défaut pour 1 unité (sans palier)</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Prix dégressifs par quantité</label>
                      <button type="button" onClick={() => setPrixTiers(t => [...t, emptyTier()])}
                        className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg hover:bg-purple-200 transition">
                        + Ajouter un palier
                      </button>
                    </div>
                    {prixTiers.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                        Aucun palier — cliquez &quot;Ajouter un palier&quot; pour activer les prix dégressifs
                      </p>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400 px-1 font-medium">
                          <span>Qté min</span><span>Qté max</span><span>Prix (DA)</span><span></span>
                        </div>
                        {prixTiers.map((tier, i) => (
                          <div key={i} className="grid grid-cols-4 gap-2 items-center">
                            <input type="number" value={tier.minQte} onChange={e => setPrixTiers(t => t.map((x,j) => j===i ? {...x, minQte: e.target.value} : x))}
                              placeholder="ex: 1" className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                            <input type="number" value={tier.maxQte} onChange={e => setPrixTiers(t => t.map((x,j) => j===i ? {...x, maxQte: e.target.value} : x))}
                              placeholder="vide = ∞" className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                            <input type="number" step="0.01" value={tier.prix} onChange={e => setPrixTiers(t => t.map((x,j) => j===i ? {...x, prix: e.target.value} : x))}
                              placeholder="ex: 1200" className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                            <button type="button" onClick={() => setPrixTiers(t => t.filter((_,j) => j !== i))}
                              className="text-red-400 hover:text-red-600 flex items-center justify-center">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        ))}
                        <p className="text-xs text-gray-400 mt-1">Laissez &quot;Qté max&quot; vide pour &quot;et plus&quot; (ex: 10+ unités)</p>
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 items-center gap-1.5">
                      <Ruler className="w-4 h-4" />Type d&apos;option des variantes
                    </label>
                    <input type="text" value={form.typeOption} onChange={e => setForm({...form, typeOption: e.target.value})}
                      placeholder="ex: Taille, Pointure, Volume, Contenance..."
                      className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <p className="text-xs text-gray-400 mt-1">Laissez vide si les variantes n&apos;ont pas d&apos;options (ex: couleurs simples sans taille)</p>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5"><Palette className="w-4 h-4" />Couleurs ou parfums</p>
                      <p className="text-xs text-gray-400 mt-0.5">Chaque variante a son propre stock et ses propres images</p>
                    </div>
                    <button type="button" onClick={() => setVariants(v => [...v, emptyVariant()])}
                      className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-lg hover:bg-purple-200 transition flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Ajouter
                    </button>
                  </div>

                  {variants.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                      Aucune variante — ce produit n&apos;a pas de couleurs ou parfums
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {variants.map((v, i) => (
                        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              {/* Swatch aperçu couleur */}
                              <div
                                className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 shrink-0 overflow-hidden"
                                style={{ backgroundColor: v.couleur || '#e5e7eb' }}
                              />
                              <input type="text" value={v.nom} onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, nom: e.target.value} : x))}
                                placeholder="Nom (ex: Rouge, Lavande)" className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                            </div>
                            <button type="button" onClick={() => setVariants(vs => vs.filter((_,j) => j !== i))}
                              className="text-red-400 hover:text-red-600 p-1">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Couleur (hex)</label>
                              <div className="flex items-center gap-1.5">
                                <input type="color" value={v.couleur || '#000000'}
                                  onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, couleur: e.target.value} : x))}
                                  className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600" />
                                <input type="text" value={v.couleur}
                                  onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, couleur: e.target.value} : x))}
                                  placeholder="Optionnel" className="flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" />
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Stock *</label>
                              <input type="number" value={v.stock} onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, stock: e.target.value} : x))}
                                placeholder="0" className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                            </div>
                          </div>
                          <div>
                            <MultiImageUpload
                              values={v.images}
                              onChange={urls => setVariants(vs => vs.map((x,j) => j===i ? {...x, images: urls} : x))}
                              label={`Images — ${v.nom || 'variante'}`}
                            />
                          </div>
                          {/* Options (tailles, pointures…) */}
                          {form.typeOption && (
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Ruler className="w-3 h-3" />{form.typeOption}s disponibles
                                </label>
                                <button type="button"
                                  onClick={() => setVariants(vs => vs.map((x,j) => j===i ? {...x, options: [...x.options, emptyOption()]} : x))}
                                  className="text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded flex items-center gap-0.5 hover:bg-purple-200 transition">
                                  <Plus className="w-2.5 h-2.5" /> Ajouter
                                </button>
                              </div>
                              {v.options.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Aucune option — cliquez &quot;Ajouter&quot;</p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {v.options.map((opt, oi) => (
                                    <div key={oi} className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-700">
                                      <input type="text" value={opt.valeur}
                                        onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, options: x.options.map((o,k) => k===oi ? {...o, valeur: e.target.value} : o)} : x))}
                                        placeholder="ex: 40"
                                        className="w-14 text-xs bg-transparent focus:outline-none text-gray-800 dark:text-gray-100 font-medium" />
                                      <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>
                                      <input type="number" value={opt.stock}
                                        onChange={e => setVariants(vs => vs.map((x,j) => j===i ? {...x, options: x.options.map((o,k) => k===oi ? {...o, stock: e.target.value} : o)} : x))}
                                        placeholder="stock"
                                        className="w-12 text-xs bg-transparent focus:outline-none text-gray-500 dark:text-gray-400" />
                                      <button type="button"
                                        onClick={() => setVariants(vs => vs.map((x,j) => j===i ? {...x, options: x.options.filter((_,k) => k!==oi)} : x))}
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
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  Annuler
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-50">
                  {submitting ? 'En cours...' : editProduit ? 'Enregistrer' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Toggle */}
      {toggleId && (() => {
        const produit = produits.find(p => p.id === toggleId)!
        const cantActivate = !produit.actif && produit.stock === 0
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm p-6 text-center border border-gray-100 dark:border-gray-800">
              <div className="flex justify-center mb-4">{produit.actif ? <EyeOff className="w-14 h-14 text-orange-500" /> : cantActivate ? <AlertTriangle className="w-14 h-14 text-yellow-500" /> : <Eye className="w-14 h-14 text-green-500" />}</div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                {produit.actif ? 'Désactiver ce produit ?' : cantActivate ? 'Stock épuisé' : 'Activer ce produit ?'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                {produit.actif ? 'Le produit ne sera plus visible par les clients.'
                  : cantActivate ? "Impossible d'activer un produit sans stock."
                  : 'Le produit redeviendra visible pour les clients.'}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setToggleId(null)}
                  className="flex-1 border-2 border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-semibold py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  {cantActivate ? 'Fermer' : 'Annuler'}
                </button>
                {!cantActivate && (
                  <button onClick={() => handleToggle(produit)} disabled={toggling}
                    className={`flex-1 font-semibold py-2.5 rounded-xl transition disabled:opacity-50 text-white ${produit.actif ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-500 hover:bg-green-600'}`}>
                    {toggling ? 'En cours...' : produit.actif ? 'Désactiver' : 'Activer'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
