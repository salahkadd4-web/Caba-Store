'use client'

/**
 * components/client/EtatProduitsProvider.tsx
 * -------------------------------------------
 * Fournit l'état favoris + panier de tous les produits d'une page en
 * UNE seule requête groupée (endpoint /api/etat-produits), au lieu d'une
 * requête par produit (N+1) qui ralentissait fortement l'application.
 *
 * Chaque bouton (FavoriIconButton, CartIconButton, FavoriButton) déclare
 * son productId via useEtatProduit(). Le provider regroupe les ids
 * pendant 80ms puis envoie une seule requête.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

export type EtatProduit = { isFavori: boolean; inCart: boolean; cartItemId: string | null }

type EtatProduitsContextValue = {
  etats: Record<string, EtatProduit>
  request: (productId: string) => void
  setEtat: (productId: string, etat: EtatProduit) => void
}

const EtatProduitsContext = createContext<EtatProduitsContextValue | null>(null)

export function EtatProduitsProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()
  const [etats, setEtats] = useState<Record<string, EtatProduit>>({})

  const etatsRef     = useRef<Record<string, EtatProduit>>({})
  const pendingRef   = useRef<Set<string>>(new Set())
  const inFlightRef  = useRef<Set<string>>(new Set())
  const timerRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Envoie une seule requête groupée pour tous les ids en attente
  const flush = useCallback(() => {
    timerRef.current = null

    const ids = [...pendingRef.current]
    if (ids.length === 0) return
    pendingRef.current.clear()

    const toFetch = ids.filter(id => !etatsRef.current[id] && !inFlightRef.current.has(id))
    if (toFetch.length === 0) return

    toFetch.forEach(id => inFlightRef.current.add(id))

    fetch(`/api/etat-produits?productIds=${toFetch.join(',')}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return
        const next: Record<string, EtatProduit> = {}
        for (const id of toFetch) {
          if (data[id]) {
            etatsRef.current[id] = data[id]
            next[id] = data[id]
          }
        }
        if (Object.keys(next).length > 0) setEtats(prev => ({ ...prev, ...next }))
      })
      .catch(() => { /* erreur réseau ignorée */ })
      .finally(() => {
        toFetch.forEach(id => inFlightRef.current.delete(id))
      })
  }, [])

  const request = useCallback((productId: string) => {
    if (etatsRef.current[productId]) return

    pendingRef.current.add(productId)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(flush, 80)
  }, [flush])

  const setEtat = useCallback((productId: string, etat: EtatProduit) => {
    etatsRef.current[productId] = etat
    setEtats(prev => ({ ...prev, [productId]: etat }))
  }, [])

  // Si l'utilisateur se déconnecte ou change de compte, on vide le cache
  // pour ne pas afficher d'anciens états.
  const userId = session?.user?.id
  useEffect(() => {
    const t = setTimeout(() => {
      etatsRef.current = {}
      setEtats({})
    }, 0)
    return () => clearTimeout(t)
  }, [userId])

  const value = useMemo(
    () => ({ etats, request, setEtat }),
    [etats, request, setEtat],
  )

  return (
    <EtatProduitsContext.Provider value={value}>
      {children}
    </EtatProduitsContext.Provider>
  )
}

/**
 * Hook : déclare un produit et renvoie son état (favoris + panier).
 * `setEtat` permet de mettre à jour l'état partagé après un toggle,
 * pour que toutes les instances du même produit se synchronisent.
 */
export function useEtatProduit(productId: string) {
  const { data: session } = useSession()
  const ctx = useContext(EtatProduitsContext)
  const request = ctx?.request

  useEffect(() => {
    if (!request || !session) return
    request(productId)
  }, [request, session, productId])

  return useMemo(
    () => ({
      etat:    session ? ctx?.etats[productId] : undefined,
      setEtat: (e: EtatProduit) => ctx?.setEtat(productId, e),
    }),
    [session, ctx, productId],
  )
}
