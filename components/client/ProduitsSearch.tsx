'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import FavoriIconButton from '@/components/client/FavoriIconButton'
import CartIconButton from '@/components/client/CartIconButton'
import { Banknote, Package, Search, SlidersHorizontal, X } from 'lucide-react'

type PrixTier = { minQte: number; maxQte: number | null; prix: number }
type Variant  = { id: string; nom: string; couleur: string | null }

type Produit = {
  id: string
  nom: string
  images: string[]
  prix: number
  stock: number
  prixVariables?: PrixTier[] | null
  variants?: Variant[]
  category: { nom: string }
}

type Category = {
  id: string
  nom: string
}

/** Retourne le prix minimal possible */
function getPrixMin(p: Produit): number {
  const tiers = p.prixVariables
  if (!tiers || tiers.length === 0) return p.prix
  return Math.min(...tiers.map(t => t.prix), p.prix)
}

export default function ProduitsSearch({
  categories,
  initialProduits,
  initialRecherche,
  initialCategorie,
}: {
  categories: Category[]
  initialProduits: Produit[]
  initialRecherche?: string
  initialCategorie?: string
}) {
  const router = useRouter()
  const [query, setQuery] = useState(initialRecherche || '')
  const [produits, setProduits] = useState<Produit[]>(initialProduits)
  const [loading, setLoading] = useState(false)
  const [categorieActive, setCategorieActive] = useState(initialCategorie || '')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Recherche AJAX avec debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (query.trim()) params.set('recherche', query.trim())
        if (categorieActive) params.set('categorie', categorieActive)

        const res = await fetch(`/api/produits/search?${params.toString()}`)
        const data = await res.json()
        setProduits(data)
      } catch {
        setProduits([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, categorieActive])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('recherche', query.trim())
    if (categorieActive) params.set('categorie', categorieActive)
    router.push(`/produits?${params.toString()}`)
  }

  const handleCategorie = (id: string) => {
    setCategorieActive(id)
    setSidebarOpen(false)
    const params = new URLSearchParams()
    if (query.trim()) params.set('recherche', query.trim())
    if (id) params.set('categorie', id)
    router.push(`/produits?${params.toString()}`, { scroll: false })
  }

  const resetFilters = () => {
    setQuery('')
    setCategorieActive('')
  }

  const hasFilters = query.trim() !== '' || categorieActive !== ''

  /* ─── Sidebar content (shared between desktop + mobile drawer) ─── */
  const SidebarContent = () => (
    <>
      {/* Recherche */}
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
          Recherche
        </p>
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full pl-9 pr-9 py-2 text-sm border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-700/20 focus:border-orange-700 dark:focus:border-orange-400 transition-colors"
            />
            {loading ? (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-orange-700 border-t-transparent rounded-full animate-spin" />
            ) : query.length > 0 ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </form>
      </div>

      {/* Séparateur */}
      <div className="h-px bg-stone-100 dark:bg-stone-800 mb-6" />

      {/* Catégories */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-3">
          Catégories
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => handleCategorie('')}
            className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
              !categorieActive
                ? 'bg-orange-700 text-white font-medium'
                : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            Toutes les catégories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategorie(cat.id)}
              className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
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

      {/* Réinitialiser */}
      {hasFilters && (
        <>
          <div className="h-px bg-stone-100 dark:bg-stone-800 mt-6 mb-4" />
          <button
            onClick={resetFilters}
            className="w-full text-sm text-stone-500 dark:text-stone-400 hover:text-orange-700 dark:hover:text-orange-400 transition-colors text-center"
          >
            Réinitialiser les filtres
          </button>
        </>
      )}
    </>
  )

  return (
    <div className="flex flex-col md:flex-row gap-8">

      {/* ── Bouton filtres mobile ── */}
      <div className="md:hidden flex items-center justify-between mb-2">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-orange-700 border-t-transparent rounded-full animate-spin inline-block" />
              Recherche…
            </span>
          ) : (
            <span>
              <span className="font-semibold text-stone-800 dark:text-stone-100">{produits.length}</span>
              {' '}produit{produits.length > 1 ? 's' : ''}
            </span>
          )}
        </p>
        <button
          onClick={() => setSidebarOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2 hover:border-orange-700 dark:hover:border-orange-400 transition-colors"
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {hasFilters && (
            <span className="w-2 h-2 rounded-full bg-orange-700" />
          )}
        </button>
      </div>

      {/* ── Drawer mobile ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Panel */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-stone-900 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-semibold text-stone-900 dark:text-stone-50">Filtres</h2>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-stone-500" />
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* ── Sidebar desktop ── */}
      <aside className="hidden md:block w-64 shrink-0">
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-5 sticky top-24">
          <SidebarContent />
        </div>
      </aside>

      {/* ── Grille produits ── */}
      <div className="flex-1">

        {/* Compteur desktop */}
        <p className="hidden md:block text-sm text-stone-500 dark:text-stone-400 mb-5">
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-orange-700 border-t-transparent rounded-full animate-spin inline-block" />
              Recherche en cours…
            </span>
          ) : (
            <>
              <span className="font-semibold text-stone-800 dark:text-stone-100">{produits.length}</span>
              {' '}produit{produits.length > 1 ? 's' : ''} trouvé{produits.length > 1 ? 's' : ''}
              {hasFilters && (
                <button
                  onClick={resetFilters}
                  className="ml-3 text-orange-700 dark:text-orange-400 hover:underline text-xs"
                >
                  Effacer les filtres
                </button>
              )}
            </>
          )}
        </p>

        {/* État vide */}
        {produits.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center text-center py-24 text-stone-400 dark:text-stone-500">
            <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-stone-300 dark:text-stone-600" />
            </div>
            <p className="text-lg font-medium text-stone-700 dark:text-stone-300 mb-1">Aucun produit trouvé</p>
            <p className="text-sm text-stone-400 dark:text-stone-500 mb-6">
              Essayez de modifier vos critères de recherche.
            </p>
            <button
              onClick={resetFilters}
              className="text-sm font-medium text-orange-700 dark:text-orange-400 hover:underline"
            >
              Voir tous les produits
            </button>
          </div>
        ) : (
          <div className={`grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 transition-opacity duration-200 ${loading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {produits.map((produit) => {
              const hasTiers  = !!produit.prixVariables && produit.prixVariables.length > 0
              const prixMin   = getPrixMin(produit)
              const estReduit = hasTiers && prixMin < produit.prix

              return (
                <Link
                  key={produit.id}
                  href={`/produits/${produit.id}`}
                  className="group bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700/50 hover:shadow-md transition-all"
                >
                  {/* Image */}
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

                    {/* Badge dégressif */}
                    {hasTiers && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 text-[10px] bg-orange-700 text-white font-semibold px-2 py-0.5 rounded-full shadow">
                          <Banknote className="w-3 h-3" /> Dégressif
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex flex-col gap-2">
                      <FavoriIconButton produitId={produit.id} />
                      <CartIconButton produitId={produit.id} stock={produit.stock} />
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="p-3.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-400 mb-1">
                      {produit.category.nom}
                    </p>
                    <h3 className="text-sm font-medium text-stone-800 dark:text-stone-100 line-clamp-2 mb-2">
                      {produit.nom}
                    </h3>

                    {/* Bloc prix */}
                    <div className="flex items-baseline gap-1.5 flex-wrap mb-1.5">
                      {hasTiers && (
                        <span className="text-[10px] text-stone-400 dark:text-stone-500">à partir de</span>
                      )}
                      <span className={`text-base font-semibold ${estReduit ? 'text-green-700 dark:text-green-400' : 'text-stone-900 dark:text-stone-50'}`}>
                        {prixMin.toFixed(2)} DA
                      </span>
                      {estReduit && (
                        <>
                          <span className="text-xs text-stone-400 line-through font-normal">
                            {produit.prix.toFixed(2)}
                          </span>
                          <span className="text-[9px] bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 font-semibold px-1.5 py-0.5 rounded-full">
                            −{Math.round((1 - prixMin / produit.prix) * 100)}%
                          </span>
                        </>
                      )}
                    </div>

                    {/* Swatches variantes */}
                    {produit.variants && produit.variants.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mb-1.5">
                        {produit.variants.slice(0, 5).map(v =>
                          v.couleur ? (
                            <span
                              key={v.id}
                              title={v.nom}
                              className="w-3.5 h-3.5 rounded-full border border-stone-300 dark:border-stone-600 inline-block shrink-0"
                              style={{ backgroundColor: v.couleur }}
                            />
                          ) : (
                            <span
                              key={v.id}
                              className="text-[9px] text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded-full"
                            >
                              {v.nom}
                            </span>
                          )
                        )}
                        {produit.variants.length > 5 && (
                          <span className="text-[9px] text-stone-400">+{produit.variants.length - 5}</span>
                        )}
                      </div>
                    )}

                    {/* Stock */}
                    <p className={`text-[10px] font-medium mt-0.5 ${produit.stock > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      {produit.stock > 0 ? `En stock` : 'Rupture de stock'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
