'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ShoppingCart, XCircle } from 'lucide-react'

export default function AddToCartButton({
  produitId,
  stock,
}: {
  produitId: string
  stock: number
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleAddToCart = async () => {
    if (!session) {
      router.push('/connexion')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/panier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produitId, quantite: 1 }),
      })

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
        window.dispatchEvent(new CustomEvent('cart-updated'))
        new BroadcastChannel('cart').postMessage('updated')
      }
    } catch {
      console.error('Erreur panier')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleAddToCart}
      disabled={loading || stock === 0}
      className={`w-full font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed ${
        success
          ? 'bg-green-500 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
    >
      {stock === 0
        ? <><XCircle className="w-5 h-5" />{' '}Indisponible</>
        : loading
        ? 'Ajout en cours...'
        : success
        ? <><CheckCircle2 className="w-5 h-5" />{' '}Ajouté au panier !</>
        : <><ShoppingCart className="w-5 h-5" />{' '}Ajouter au panier</>}
    </button>
  )
}