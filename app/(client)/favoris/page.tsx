'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Heart, Package, XCircle } from 'lucide-react'

export default function FavorisPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [favoris, setFavoris] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/connexion'); return }
    if (status === 'authenticated') {
      fetch('/api/favoris')
        .then((res) => res.json())
        .then((data) => { setFavoris(data); setLoading(false) })
    }
  }, [status])

  const handleRetirer = async (produitId: string) => {
    await fetch('/api/favoris', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produitId }),
    })
    setFavoris(favoris.filter((f) => f.productId !== produitId))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center text-gray-400 dark:text-gray-500">
        Chargement...
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pt-4">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Mes Favoris</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        {favoris.length} produit{favoris.length > 1 ? 's' : ''} en favori
      </p>

      {favoris.length === 0 ? (
        <div className="text-center py-20 text-gray-400 dark:text-gray-500">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p className="text-lg">Vous n'avez pas encore de favoris.</p>
          <Link href="/produits" className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block">
            Parcourir les produits
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favoris.map((favori) => (
            <div key={favori.id}
              className="product-card bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800">
              <Link href={`/produits/${favori.product.id}`}>
                <div className="relative h-48 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                  {favori.product.images[0] ? (
                    <Image src={favori.product.images[0]} alt={favori.product.nom} fill sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <Package className="w-14 h-14" />
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">{favori.product.category.nom}</p>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                    {favori.product.nom}
                  </h3>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {favori.product.prix.toFixed(2)} DA
                  </p>
                </div>
              </Link>
              <div className="px-4 pb-4">
                <button onClick={() => handleRetirer(favori.product.id)}
                  className="w-full border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 text-sm py-2 rounded-lg transition"><XCircle className="w-4 h-4 inline mr-1" />{' '}Retirer des favoris
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}