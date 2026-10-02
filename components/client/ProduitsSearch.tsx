'use client'

import { useState, useEffect } from 'react'
import { useScrollLock } from '@/lib/hooks/useScrollLock'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import FavoriIconButton from '@/components/client/FavoriIconButton'
import CartIconButton from '@/components/client/CartIconButton'
import { getPrixMin, hasPrixDegressif, getPourcentageReduction } from '@/lib/prix'
import { Banknote, MapPin, Package, Search, SlidersHorizontal, X } from 'lucide-react'
import { useI18n } from '@/components/I18nProvider'
import { WILAYAS, wilayaLabel } from '@/lib/algeria'

// ─── Types ────────────────────────────────────────────────────────────────────

type PrixTier = { minQte: number; maxQte: number | null; prix: number }
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {f.sellerWilaya}
          </p>
          {viewerWilaya && wilayaActive !== viewerWilaya && (
            <button
              type="button"
              onClick={() => onWilaya(viewerWilaya)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-700 dark:text-orange-400 hover:underline"
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
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
          {f.categories}
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => onCategorie('')}
            className={`w-full text-start text-sm px-3 py-2 rounded-lg transition-colors ${
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
              className={`w-full text-start text-sm px-3 py-2 rounded-lg transition-colors ${
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

  // Recherche AJAX avec debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
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
          <div className="absolute bottom-0 start-0 end-0 bg-white dark:bg-stone-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
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
              <ProduitCard key={produit.id} produit={produit} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sous-composants internes stables ─────────────────────────────────────────

function ProduitCard({ produit }: { produit: ProduitSearch }) {
  const { t, fmt } = useI18n()
  const hasTiers  = hasPrixDegressif(produit.prixVariables)
  const prixMin   = getPrixMin(produit.prixVariables, produit.prix)
  const reduction = getPourcentageReduction(produit.prixVariables, produit.prix)
  const estReduit = reduction !== null

  return (
    <Link
      href={`/produits/${produit.id}`}
      className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700/50 hover:shadow-md transition-all"
    >
      <div className="relative h-44 bg-stone-100 dark:bg-stone-800 overflow-hidden">
        {produit.images[0] ? (
          <Image
            src={produit.images[0]}
            alt={produit.nom}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 50vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-10 h-10 text-stone-300 dark:text-stone-600" />
          </div>
        )}

        {hasTiers && (
          <div className="absolute top-2 start-2">
            <span className="inline-flex items-center gap-1 text-[10px] bg-orange-700 text-white font-semibold px-2 py-0.5 rounded-full shadow">
              <Banknote className="w-3 h-3" /> {t.common.degressive}
            </span>
          </div>
        )}

        <div className="absolute top-2 end-2 flex flex-col gap-2">
          <FavoriIconButton produitId={produit.id} />
          <CartIconButton produitId={produit.id} stock={produit.stock} />
        </div>
      </div>

      <div className="p-3.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">
          {produit.category.nom}
        </p>
        <h3 className="text-sm font-medium text-stone-800 dark:text-stone-100 line-clamp-2 mb-2">
          {produit.nom}
        </h3>

        <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
          {hasTiers && (
            <span className="text-[10px] text-stone-400 dark:text-stone-500">{t.common.fromPrice}</span>
          )}
          <span
            className={`text-base font-semibold ${
              estReduit ? 'text-green-700 dark:text-green-400' : 'text-stone-900 dark:text-stone-50'
            }`}
          >
            {prixMin.toFixed(2)} {fmt.currency}
          </span>
          {estReduit && (
            <>
              <span className="text-xs text-stone-400 line-through font-normal">
                {produit.prix.toFixed(2)}
              </span>
              <span className="text-[9px] bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 font-semibold px-1.5 py-0.5 rounded-full">
                −{reduction}%
              </span>
            </>
          )}
        </div>

        {produit.variants && produit.variants.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-1.5">
            {produit.variants.slice(0, 5).map((v) =>
              v.couleur ? (
                <span
                  key={v.id}
                  title={v.nom}
                  className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 shrink-0"
                  style={{ backgroundColor: v.couleur }}
                />
              ) : (
                <span
                  key={v.id}
                  className="text-[9px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-full"
                >
                  {v.nom}
                </span>
              ),
            )}
            {produit.variants.length > 5 && (
              <span className="text-[9px] text-stone-400">+{produit.variants.length - 5}</span>
            )}
          </div>
        )}

        <p
          className={`text-[10px] font-medium mt-0.5 ${
            produit.stock > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-500 dark:text-red-400'
          }`}
        >
          {produit.stock > 0 ? t.common.inStock : t.common.outOfStock}
        </p>
      </div>
    </Link>
  )
}

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
