'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

function broadcastCartUpdate() {
  window.dispatchEvent(new CustomEvent('cart-updated'))
  const ch = new BroadcastChannel('cart')
  ch.postMessage('updated')
  ch.close()
}

export default function CartIconButton({ produitId, stock }: { produitId: string; stock: number }) {
  const { data: session } = useSession()
  const router   = useRouter()
  const [inCart,     setInCart]     = useState(false)
  const [cartItemId, setCartItemId] = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // ── Vérification initiale ciblée (évite de charger tout le panier) ──
  useEffect(() => {
    if (!session) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    fetch(`/api/panier/check?productId=${produitId}`, { signal: abortRef.current.signal })
      .then(r => r.ok ? r.json() : null)
      .then((data: { inCart: boolean; cartItemId: string | null } | null) => {
        if (data !== null) {
          setInCart(data.inCart)
          setCartItemId(data.cartItemId)
        }
      })
      .catch(() => { /* AbortError ignorée */ })

    return () => { abortRef.current?.abort() }
  }, [session, produitId])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!session) { router.push('/connexion'); return }
    if (stock === 0) return

    setLoading(true)
    try {
      if (inCart && cartItemId) {
        const res = await fetch(`/api/panier/${cartItemId}`, { method: 'DELETE' })
        if (res.ok) {
          setInCart(false)
          setCartItemId(null)
          broadcastCartUpdate()
        }
      } else {
        // Ajouter au panier
        const res = await fetch('/api/panier', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ produitId, quantite: 1 }),
        })
        const data = await res.json()
        // Le POST retourne maintenant l'id du cartItem créé
        if (data.cartItemId) {
          setInCart(true)
          setCartItemId(data.cartItemId)
        }
        broadcastCartUpdate()
      }
    } catch {
      console.error('Erreur panier')
    } finally {
      setLoading(false)
    }
  }

  if (stock === 0) return (
    <div className="w-9 h-9 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center" title="Indisponible">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-stone-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    </div>
  )

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={inCart ? 'Retirer du panier' : 'Ajouter au panier'}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md disabled:opacity-50 ${
        inCart
          ? 'bg-green-500 hover:bg-red-500 text-white'
          : 'bg-white hover:bg-orange-50 text-stone-400 hover:text-orange-700'
      }`}
    >
      {inCart ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
        </svg>
      )}
    </button>
  )
}
