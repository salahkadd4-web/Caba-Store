'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Heart, Package, XCircle } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type FavoriItem = {
  id:        string
  productId: string
  product: {
    id:       string
    nom:      string
    images:   string[]
    prix:     number
    category: { nom: string }
  }
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function FavorisPage() {
  const { status } = useSession()
  const router = useRouter()

  const [favoris,  setFavoris]  = useState<FavoriItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/connexion')
      return
    }
    if (status !== 'authenticated') return

    fetch('/api/favoris')
      .then((res) => {
        if (!res.ok) throw new Error('Erreur lors du chargement des favoris')
        return res.json() as Promise<FavoriItem[]>
      })
      .then((data) => setFavoris(data))
      .catch(() => setError('Impossible de charger vos favoris. Veuillez réessayer.'))
      .finally(() => setLoading(false))
  }, [status, router])

  const handleRetirer = async (produitId: string) => {
    // Mise à jour optimiste
    setFavoris((prev) => prev.filter((f) => f.productId !== produitId))
    await fetch('/api/favoris', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ produitId }),
    })
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="w-8 h-8 border-2 border-stone-200 dark:border-stone-700 border-t-orange-700 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-stone-500 dark:text-stone-400 text-sm">Chargement...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true) }}
          className="text-sm text-orange-700 dark:text-orange-400 hover:underline"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-4">
      <h1 className="text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-100 mb-2">
        Mes Favoris
      </h1>
      <p className="text-stone-500 dark:text-stone-400 mb-8">
        {favoris.length} produit{favoris.length > 1 ? 's' : ''} en favori
      </p>

      {favoris.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-10 h-10 text-stone-300 dark:text-stone-600" />
          </div>
          <p className="text-lg text-stone-500 dark:text-stone-400 mb-4">
            Vous n&apos;avez pas encore de favoris.
          </p>
          <Link
            href="/produits"
            className="inline-block bg-orange-700 hover:bg-orange-800 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            Parcourir les produits
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favoris.map((favori) => (
            <div
              key={favori.id}
              className="product-card bg-white dark:bg-stone-900 rounded-2xl overflow-hidden border border-stone-200 dark:border-stone-800 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
            >
              <Link href={`/produits/${favori.product.id}`}>
                <div className="relative h-48 bg-stone-100 dark:bg-stone-800 flex items-center justify-center overflow-hidden">
                  {favori.product.images[0] ? (
                    <Image
                      src={favori.product.images[0]}
                      alt={favori.product.nom}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <Package className="w-14 h-14 text-stone-300 dark:text-stone-600" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-orange-700 dark:text-orange-500 mb-1">
                    {favori.product.category.nom}
                  </p>
                  <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100 mb-2 line-clamp-2">
                    {favori.product.nom}
                  </h3>
                  <p className="text-lg font-bold text-orange-700 dark:text-orange-500">
                    {favori.product.prix.toFixed(2)} DA
                  </p>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <button
                  onClick={() => handleRetirer(favori.product.id)}
                  className="w-full border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-sm py-2 rounded-xl transition-colors"
                >
                  <XCircle className="w-4 h-4 inline mr-1" />
                  Retirer des favoris
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
