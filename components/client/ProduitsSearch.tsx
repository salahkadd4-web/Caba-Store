'use client'

import { useState, useEffect, useRef } from 'react'
import { useScrollLock } from '@/lib/hooks/useScrollLock'
import { useRouter } from 'next/navigation'
import ProductCard from '@/components/client/ProductCard'
import { MapPin, Package, Search, SlidersHorizontal, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { WILAYAS, wilayaLabel } from '@/lib/algeria'

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant  = { id: string; nom: string; couleur: string | null }

export type ProduitSearch = {
  id:             string
  nom:            string
  images:         string[]
  prix:           number
  stock:          number
  prixVariables?: unknown
  variants?:      Variant[]
  category:       { nom: string }
}

type Category = { id: string; nom: string }

/** Identifie une combinaison de filtres (évite de relancer une recherche identique). */
function cleRecherche(q: string, categorie: string, wilaya: string, proche: string | null) {
  return [q.trim(), categorie, wilaya, proche ?? ''].join('|')
}

// ─── Sous-composants stables ──────────────────────────────────────────────────
// Définis HORS du composant parent pour éviter le remontage à chaque rendu.

type SidebarContentProps = {
  query:           string
  setQuery:        (q: string) => void
  loading:         boolean
  categories:      Category[]
  categorieActive: string
  wilayaActive:    string
  viewerWilaya:    string | null
  hasFilters:      boolean
  onCategorie:     (id: string) => void
  onWilaya:        (code: string) => void
  onReset:         () => void
  onSubmit:        (e: React.FormEvent) => void
}

function SidebarContent({
  query,
  setQuery,
  loading,
  categories,
  categorieActive,
  wilayaActive,
  viewerWilaya,
  hasFilters,
  onCategorie,
  onWilaya,
  onReset,
  onSubmit,
}: SidebarContentProps) {
  const { t, locale } = useI18n()
  const f = t.catalog.filters
  return (
    <>
      {/* Recherche */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 mb-3">
          {f.search}
        </p>
        <form onSubmit={onSubmit}>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={f.searchPlaceholder}
              className="w-full ps-9 pe-9 py-2 text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 dark:focus:border-orange-400 transition-colors"
            />
            {loading ? (
              <div className="absolute end-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-orange-700 border-t-transparent rounded-full animate-spin" />
            ) : query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="h-px bg-stone-100 dark:bg-stone-800 mb-6" />

      {/* Wilaya du vendeur */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 gap-2">
          <p className="text-xs font-semibold text-stone-400 dark:text-stone-500">
            {f.sellerWilaya}
          </p>
          {viewerWilaya && wilayaActive !== viewerWilaya && (
            <button
              type="button"
              onClick={() => onWilaya(viewerWilaya)}
              className="inline-flex items-center gap-1 text-xs font-medium text-orange-700 dark:text-orange-400 hover:underline"
            >
              <MapPin className="w-3 h-3" />
              {f.nearMe}
            </button>
          )}
        </div>
        <select
          value={wilayaActive}
          onChange={(e) => onWilaya(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 dark:focus:border-orange-400 transition-colors"
        >
          <option value="">{f.allWilayas}</option>
          {WILAYAS.map((w) => (
            <option key={w.code} value={w.code}>{wilayaLabel(w, locale)}</option>
          ))}
        </select>
      </div>

      <div className="h-px bg-stone-100 dark:bg-stone-800 mb-6" />

      {/* Catégories */}
      <div>
        <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 mb-3">
          {f.categories}
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => onCategorie('')}
            className={`w-full text-start text-sm px-3 py-2 rounded-xl transition-colors ${
 !categorieActive
 ? 'bg-orange-700 text-white font-medium'
 : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
 }`}
          >
            {f.allCategories}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onCategorie(cat.id)}
              className={`w-full text-start text-sm px-3 py-2 rounded-xl transition-colors ${
 categorieActive === cat.id
 ? 'bg-orange-700 text-white font-medium'
 : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
 }`}
            >
              {cat.nom}
            </button>
          ))}
        </div>
      </div>

      {hasFilters && (
        <>
          <div className="h-px bg-stone-100 dark:bg-stone-800 mt-6 mb-4" />
          <button
            onClick={onReset}
            className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-400 transition-colors text-center"
          >
            {f.reset}
          </button>
        </>
      )}
    </>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ProduitsSearch({
  categories,
  initialProduits,
  initialRecherche,
  initialCategorie,
  initialWilaya,
  viewerWilaya = null,
}: {
  categories:        Category[]
  initialProduits:   ProduitSearch[]
  initialRecherche?: string
  initialCategorie?: string
  /** Filtre : code de wilaya du vendeur */
  initialWilaya?:    string
  /** Wilaya du visiteur connecté (classement « proche de moi ») */
  viewerWilaya?:     string | null
}) {
  const router = useRouter()
  const { t } = useI18n()

  const [query,           setQuery]           = useState(initialRecherche ?? '')
  const [produits,        setProduits]        = useState<ProduitSearch[]>(initialProduits)
  const [loading,         setLoading]         = useState(false)
  const [categorieActive, setCategorieActive] = useState(initialCategorie ?? '')
  const [wilayaActive,    setWilayaActive]    = useState(initialWilaya ?? '')
  const [sidebarOpen,     setSidebarOpen]     = useState(false)

  useScrollLock(sidebarOpen)

  const hasFilters = query.trim() !== '' || categorieActive !== '' || wilayaActive !== ''

  // Recherche AJAX avec debounce.
  // Les résultats des filtres initiaux viennent déjà du serveur : on ne relance la
  // recherche (et le grisé de chargement) que lorsque les filtres changent.
  const derniereRecherche = useRef(cleRecherche(initialRecherche ?? '', initialCategorie ?? '', initialWilaya ?? '', viewerWilaya))
  useEffect(() => {
    const cle = cleRecherche(query, categorieActive, wilayaActive, viewerWilaya)
    if (cle === derniereRecherche.current) return
    const timer = setTimeout(async () => {
      derniereRecherche.current = cle
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set('recherche', query.trim())
        if (categorieActive) params.set('categorie', categorieActive)
        if (wilayaActive) params.set('wilaya', wilayaActive)
        if (viewerWilaya) params.set('proche', viewerWilaya)

        const res  = await fetch(`/api/produits/search?${params.toString()}`)
        const data = await res.json() as ProduitSearch[]
        setProduits(data)
      } catch {
        setProduits([])
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, categorieActive, wilayaActive, viewerWilaya])

  const buildParams = (over: { categorie?: string; wilaya?: string } = {}) => {
    const params = new URLSearchParams()
    const categorie = over.categorie ?? categorieActive
    const wilaya    = over.wilaya    ?? wilayaActive
    if (query.trim()) params.set('recherche', query.trim())
    if (categorie) params.set('categorie', categorie)
    if (wilaya) params.set('wilaya', wilaya)
    return params.toString()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/produits?${buildParams()}`)
  }

  const handleCategorie = (id: string) => {
    setCategorieActive(id)
    setSidebarOpen(false)
    router.push(`/produits?${buildParams({ categorie: id })}`, { scroll: false })
  }

  const handleWilaya = (code: string) => {
    setWilayaActive(code)
    setSidebarOpen(false)
    router.push(`/produits?${buildParams({ wilaya: code })}`, { scroll: false })
  }

  const resetFilters = () => {
    setQuery('')
    setCategorieActive('')
    setWilayaActive('')
  }

  const sidebarProps: SidebarContentProps = {
    query,
    setQuery,
    loading,
    categories,
    categorieActive,
    wilayaActive,
    viewerWilaya,
    hasFilters,
    onCategorie: handleCategorie,
    onWilaya:    handleWilaya,
    onReset:     resetFilters,
    onSubmit:    handleSubmit,
  }

  return (
    <div className="flex flex-col md:flex-row gap-8">

      {/* ── Bouton filtres mobile ── */}
      <div className="md:hidden flex items-center justify-between mb-2">
        <ResultCount loading={loading} count={produits.length} />
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2 hover:border-orange-700 dark:hover:border-orange-400 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t.catalog.filters.filters}
          {hasFilters && <span className="w-2 h-2 rounded-full bg-orange-700" />}
        </button>
      </div>

      {/* ── Drawer mobile ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="absolute bottom-0 start-0 end-0 bg-white dark:bg-stone-900 rounded-t-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-stone-900 dark:text-stone-50">{t.catalog.filters.filters}</h2>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      )}

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sticky top-24">
          <SidebarContent {...sidebarProps} />
        </div>
      </aside>

      {/* ── Grille produits ── */}
      <div className="flex-1">
        {/* Compteur desktop */}
        <div className="hidden md:flex items-center justify-between mb-5">
          <ResultCount loading={loading} count={produits.length} full />
          {hasFilters && !loading && (
            <button
              onClick={resetFilters}
              className="text-orange-700 dark:text-orange-400 hover:underline text-xs"
            >
              {t.catalog.filters.clear}
            </button>
          )}
        </div>

        {produits.length === 0 && !loading ? (
          <EmptyProducts onReset={resetFilters} />
        ) : (
          <div
            className={`grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 transition-opacity duration-200 ${
 loading ? 'opacity-50 pointer-events-none' : 'opacity-100'
 }`}
          >
            {produits.map((produit) => (
              <ProductCard key={produit.id} produit={produit} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sous-composants internes stables ─────────────────────────────────────────

function ResultCount({
  loading,
  count,
  full = false,
}: {
  loading: boolean
  count:   number
  full?:   boolean
}) {
  const { t } = useI18n()
  const f = t.catalog.filters
  if (loading) {
    return (
      <span className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <span className="w-3 h-3 border-2 border-orange-700 border-t-transparent rounded-full animate-spin inline-block" />
        {full ? f.searchingFull : f.searching}
      </span>
    )
  }
  return (
    <span className="text-sm text-stone-500 dark:text-stone-400">
      <span className="font-semibold text-stone-800 dark:text-stone-100">{count}</span>
      {' '}{f.count(count)}{full ? f.found(count) : ''}
    </span>
  )
}

function EmptyProducts({ onReset }: { onReset: () => void }) {
  const { t } = useI18n()
  const f = t.catalog.filters
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 text-stone-400 dark:text-stone-500">
      <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
        <Package className="w-8 h-8 text-stone-300 dark:text-stone-600" />
      </div>
      <p className="text-lg font-medium text-stone-700 dark:text-stone-300 mb-1">
        {f.emptyTitle}
      </p>
      <p className="text-sm text-stone-400 dark:text-stone-500 mb-6">
        {f.emptyDesc}
      </p>
      <button
        onClick={onReset}
        className="text-sm font-medium text-orange-700 dark:text-orange-400 hover:underline"
      >
        {f.seeAll}
      </button>
    </div>
  )
}
