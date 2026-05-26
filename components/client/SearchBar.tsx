'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { Package, Tag } from 'lucide-react'

type SearchResult = {
  categories: { id: string; nom: string; image: string | null }[]
  produits: { id: string; nom: string; images: string[]; prix: number; category: { nom: string } }[]
}

export default function SearchBar({ onClose }: { onClose?: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus auto
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Fermer en cliquant dehors
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setResults(null)
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
      onClose?.()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitSearch()
  }

  const hasResults = results && (results.categories.length > 0 || results.produits.length > 0)

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Barre de recherche */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un produit ou catégorie..."
            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-full px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500 transition"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          type="submit"
          className="bg-black dark:bg-white text-white dark:text-black rounded-full px-4 py-2.5 text-sm font-medium shrink-0 hover:bg-gray-800 dark:hover:bg-gray-100 transition"
        >
          Rechercher
        </button>
      </form>

      {/* Dropdown résultats */}
      {hasResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">

          {/* Catégories */}
          {results.categories.length > 0 && (
            <div>
              <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Catégories
              </p>
              {results.categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categories/${cat.id}`}
                  onClick={() => { setResults(null); setQuery(''); onClose?.() }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <div className="relative w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                    {cat.image ? (
                      <Image src={cat.image} alt={cat.nom} fill sizes="32px" className="object-cover" />
                    ) : (
                      <span className="text-sm"><Tag className="w-4 h-4" /></span>
                    )}
                  </div>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{cat.nom}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Produits */}
          {results.produits.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800">
              <p className="px-4 pt-3 pb-1 text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Produits
              </p>
              {results.produits.map((prod) => (
                <Link
                  key={prod.id}
                  href={`/produits/${prod.id}`}
                  onClick={() => { setResults(null); setQuery(''); onClose?.() }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <div className="relative w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                    {prod.images[0] ? (
                      <Image src={prod.images[0]} alt={prod.nom} fill sizes="40px" className="object-cover" />
                    ) : (
                      <span className="text-lg flex items-center justify-center h-full"><Package className="w-5 h-5" /></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{prod.nom}</p>
                    <p className="text-xs text-gray-400">{prod.category.nom}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white shrink-0">
                    {prod.prix.toFixed(2)} DA
                  </span>
                </Link>
              ))}
            </div>
          )}

          {/* Voir tous les résultats */}
          <div className="border-t border-gray-100 dark:border-gray-800 p-3">
            <button
              onClick={submitSearch}
              className="w-full text-center text-xs text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white uppercase tracking-widest py-1 transition"
            >
              Voir tous les résultats pour &quot;{query}&quot;
            </button>
          </div>
        </div>
      )}

      {/* Aucun résultat */}
      {results && !hasResults && query.length >= 2 && !loading && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl z-50 p-6 text-center">
          <p className="text-sm text-gray-500">Aucun résultat pour &quot;<strong>{query}</strong>&quot;</p>
        </div>
      )}
    </div>
  )
}