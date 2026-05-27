'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Package, Tag, Search, X, ArrowRight } from 'lucide-react'

type SearchResult = {
  categories: { id: string; nom: string; image: string | null }[]
  produits: { id: string; nom: string; images: string[]; prix: number; category: { nom: string } }[]
}

export default function SearchBar({
  onClose,
  autoFocus = false,
}: {
  onClose?: () => void
  autoFocus?: boolean
}) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus auto si demandé explicitement (modal de recherche par ex.)
  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  // Fermer en cliquant dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Recherche AJAX avec debounce
  useEffect(() => {
    if (query.length < 2) { setResults(null); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/recherche?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
      } catch {
        setResults(null)
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const submitSearch = () => {
    if (query.trim()) {
      router.push(`/produits?recherche=${encodeURIComponent(query.trim())}`)
      setQuery('')
      setResults(null)
      setOpen(false)
      onClose?.()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitSearch()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  const clear = () => {
    setQuery('')
    setResults(null)
    inputRef.current?.focus()
  }

  const hasResults = results && (results.categories.length > 0 || results.produits.length > 0)
  const showDropdown = open && query.length >= 2

  return (
    <div ref={containerRef} className="relative w-full">

      {/* Barre de recherche */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 dark:text-stone-500 pointer-events-none" />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher un produit, une catégorie..."
          className="w-full bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 border border-stone-200 dark:border-stone-700 rounded-full pl-11 pr-10 py-2.5 text-sm focus:outline-none focus:border-orange-700 dark:focus:border-orange-400 focus:ring-2 focus:ring-orange-700/10 dark:focus:ring-orange-400/20 transition-colors"
        />

        {/* Indicateur droit : spinner OU bouton clear */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
          {loading ? (
            <div className="w-4 h-4 border-2 border-orange-700 border-t-transparent rounded-full animate-spin" />
          ) : query.length > 0 ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Effacer"
              className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-300 dark:hover:bg-stone-600 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}
        </div>
      </form>

      {/* Dropdown résultats */}
      {showDropdown && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl z-50 overflow-hidden max-h-112 overflow-y-auto">

          {/* Catégories */}
          {results.categories.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Catégories
              </p>
              {results.categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.id}`}
                  onClick={() => { setOpen(false); setQuery(''); setResults(null); onClose?.() }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 dark:hover:bg-stone-800 transition-colors"
                >
                  <div className="relative w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden flex items-center justify-center shrink-0">
                    {cat.image ? (
                      <Image src={cat.image} alt={cat.nom} fill sizes="32px" className="object-cover" />
                    ) : (
                      <Tag className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <span className="text-sm text-stone-700 dark:text-stone-300">{cat.nom}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Produits */}
          {results.produits.length > 0 && (
            <div className="border-t border-stone-100 dark:border-stone-800">
              <p className="px-4 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                Produits
              </p>
              {results.produits.map((prod) => (
                <Link
                  key={prod.id}
                  href={`/produits/${prod.id}`}
                  onClick={() => { setOpen(false); setQuery(''); setResults(null); onClose?.() }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-50 dark:hover:bg-stone-800 transition-colors"
                >
                  <div className="relative w-10 h-10 rounded-lg bg-stone-100 dark:bg-stone-800 overflow-hidden shrink-0">
                    {prod.images[0] ? (
                      <Image src={prod.images[0]} alt={prod.nom} fill sizes="40px" className="object-cover" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="w-5 h-5 text-stone-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-800 dark:text-stone-100 truncate">{prod.nom}</p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">{prod.category.nom}</p>
                  </div>
                  <span className="text-sm font-semibold text-orange-700 dark:text-orange-400 shrink-0">
                    {prod.prix.toFixed(2)} DA
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Voir tous les résultats */}
          <div className="border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={submitSearch}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-stone-800 transition-colors"
            >
              Voir tous les résultats
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Aucun résultat */}
      {showDropdown && results && !hasResults && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl shadow-xl z-50 p-6 text-center">
          <Search className="w-6 h-6 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Aucun résultat pour <span className="font-semibold text-stone-700 dark:text-stone-300">&quot;{query}&quot;</span>
          </p>
        </div>
      )}
    </div>
  )
}
