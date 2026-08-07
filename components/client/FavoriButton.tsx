'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useEtatProduit } from '@/components/client/EtatProduitsProvider'

export default function FavoriButton({ produitId }: { produitId: string }) {
  const { data: session } = useSession()
  const router    = useRouter()
  const { etat, setEtat } = useEtatProduit(produitId)
  const [loading, setLoading] = useState(false)

  const isFavori = !!etat?.isFavori

  const handleToggle = async () => {
    if (!session) { router.push('/connexion'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/favoris', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ produitId }),
      })
      const data = await res.json()
      if (data?.isFavori !== undefined) {
        setEtat({ isFavori: data.isFavori, inCart: etat?.inCart ?? false, cartItemId: etat?.cartItemId ?? null })
      }
    } catch {
      console.error('Erreur favoris')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`w-full border-2 font-semibold py-3 rounded-xl transition disabled:opacity-50 ${
        isFavori
          ? 'border-red-500 text-red-500 hover:bg-red-50'
          : 'border-orange-700 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-500 dark:hover:bg-orange-950/30'
      }`}
    >
      <span className="flex items-center justify-center gap-2">
        {isFavori
          ? <><Heart className="w-4 h-4 fill-red-500 text-red-500" />Retiré des favoris</>
          : <><Heart className="w-4 h-4" />Ajouter aux favoris</>}
      </span>
    </button>
  )
}
