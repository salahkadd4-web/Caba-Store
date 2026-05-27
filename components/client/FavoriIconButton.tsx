'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function FavoriIconButton({ produitId }: { produitId: string }) {
  const { data: session } = useSession()
  const router   = useRouter()
  const [isFavori, setIsFavori] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  // ── Vérification initiale ciblée (évite de charger toute la liste) ──
  useEffect(() => {
    if (!session) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    fetch(`/api/favoris?productId=${produitId}`, { signal: abortRef.current.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data !== null) setIsFavori(!!data.isFavori) })
      .catch(() => { /* AbortError ignorée */ })

    return () => { abortRef.current?.abort() }
  }, [session, produitId])

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!session) { router.push('/connexion'); return }

    setLoading(true)
    try {
      const res  = await fetch('/api/favoris', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ produitId }),
      })
      const data = await res.json()
      setIsFavori(data.isFavori)
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
      title={isFavori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md disabled:opacity-50 ${
        isFavori
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : 'bg-white hover:bg-red-50 text-stone-400 hover:text-red-500'
      }`}
    >
      {isFavori ? (
        // Coeur plein — déjà en favori
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
        </svg>
      ) : (
        // Coeur vide — pas encore en favori
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )}
    </button>
  )
}
